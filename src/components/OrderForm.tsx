/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Order, MealType, RmbRates, RestaurantId } from '../types';
import { 
  RESTAURANTS, 
  getActiveRestaurants,
  Restaurant, 
  MenuItem, 
  SideDish, 
  getLocalizedMenuItemName, 
  getLocalizedSideItemName, 
  getLocalizedRestaurantName, 
  formatLocalizedSideItem, 
  formatLocalizedMealName 
} from '../data/menu';
import { translations, Language, getLocalizedExchangeRateNote } from '../i18n';
import { 
  DEFAULT_RESTAURANT_A_QR_URL, 
  DEFAULT_RESTAURANT_B_QR_URL, 
  DEFAULT_RESTAURANT_C_QR_URL 
} from '../assets/restaurantQr';
import { 
  Utensils, 
  CheckCircle, 
  XCircle, 
  User, 
  Calendar, 
  Search, 
  RefreshCw, 
  CreditCard,
  Users,
  Clock,
  Upload,
  Image as ImageIcon,
  Eye,
  X,
  Building,
  QrCode,
  Sparkles,
  AlertTriangle,
  Plus,
  Check,
  Filter
} from 'lucide-react';

interface OrderFormProps {
  lang?: Language;
  orders: Order[];
  rmbRates?: RmbRates;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onOrderSubmitted: () => void;
  onDeleteOrder: (id: string) => void;
}

export default function OrderForm({
  lang = 'zh',
  orders,
  rmbRates,
  selectedDate,
  onDateChange,
  onOrderSubmitted,
  onDeleteOrder
}: OrderFormProps) {
  const t = translations[lang];

  // Helper date logic for quick toggle
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayStr();
  const tomorrowStr = getTomorrowStr();
  const isAfter14 = new Date().getHours() >= 14;

  const formatDateMMDD = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[1]}-${parts[2]}`;
    }
    return dateStr;
  };

  // Main Form Selection States
  const [name, setName] = useState('');
  const [plant, setPlant] = useState<'Plant1' | 'Plant2'>('Plant2');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('A');
  const [selectedMealId, setSelectedMealId] = useState<string>('chicken_rice');
  const [selectedSideItems, setSelectedSideItems] = useState<string[]>([]);

  // Payment Flags
  const [isPaid, setIsPaid] = useState(false);
  const [paymentPlatform, setPaymentPlatform] = useState<'WeChat' | 'TNG' | 'Restaurant' | ''>('Restaurant');

  // Submit & Toast
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // QR Modal State
  const [showQrModal, setShowQrModal] = useState(false);
  const [activeQrTab, setActiveQrTab] = useState<string>('A');

  // Upload Payment Receipt Modal State
  const [receiptModalOrder, setReceiptModalOrder] = useState<Order | null>(null);
  const [receiptFormIsPaid, setReceiptFormIsPaid] = useState(true);
  const [receiptFormPlatform, setReceiptFormPlatform] = useState<'WeChat' | 'TNG' | 'Restaurant' | string>('Restaurant');
  const [receiptFormImage, setReceiptFormImage] = useState<string>('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptMsg, setReceiptMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Lightbox View Receipt Image Modal
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Load and store user's own orders list
  const [myOrdersList, setMyOrdersList] = useState<string[]>(() => {
    const saved = localStorage.getItem('my_lunch_orders');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Search and filter controls for today's orders list
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlant, setFilterPlant] = useState<string>('all');
  const [filterRestaurant, setFilterRestaurant] = useState<string>('all');
  const [filterPaid, setFilterPaid] = useState<string>('all');
  
  // History of names for autocomplete
  const [nameHistory, setNameHistory] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load name history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lunch_names_history');
    if (saved) {
      try {
        setNameHistory(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const activeRestaurants = getActiveRestaurants(rmbRates?.customRestaurants, rmbRates);

  // Ensure selected restaurant exists in activeRestaurants list
  useEffect(() => {
    if (activeRestaurants.length > 0) {
      const exists = activeRestaurants.some(r => r.id === selectedRestaurantId);
      if (!exists) {
        setSelectedRestaurantId(activeRestaurants[0].id);
        if (activeRestaurants[0].mains.length > 0) {
          setSelectedMealId(activeRestaurants[0].mains[0].id);
        }
      }
    }
  }, [activeRestaurants]);

  // Ensure selected meal exists in current selected restaurant
  useEffect(() => {
    const rest = activeRestaurants.find(r => r.id === selectedRestaurantId) || activeRestaurants[0];
    if (rest && rest.mains && rest.mains.length > 0) {
      const mealExists = rest.mains.some(m => m.id === selectedMealId);
      if (!mealExists) {
        setSelectedMealId(rest.mains[0].id);
      }
    }
  }, [selectedRestaurantId, activeRestaurants]);

  // Sync default main meal when restaurant changes
  const handleRestaurantChange = (rId: string) => {
    setSelectedRestaurantId(rId);
    setSelectedSideItems([]);
    const rest = activeRestaurants.find(r => r.id === rId);
    if (rest && rest.mains && rest.mains.length > 0) {
      setSelectedMealId(rest.mains[0].id);
    }
  };

  // Side item toggle helper
  const toggleSideItem = (sideName: string) => {
    if (selectedSideItems.includes(sideName)) {
      setSelectedSideItems(selectedSideItems.filter(s => s !== sideName));
    } else {
      setSelectedSideItems([...selectedSideItems, sideName]);
    }
  };

  // Get active restaurant and main meal data
  const currentRestaurant = activeRestaurants.find(r => r.id === selectedRestaurantId) || activeRestaurants[0];
  const currentMainMeal = currentRestaurant.mains.find(m => m.id === selectedMealId) || currentRestaurant.mains[0];

  // Calculate live price for current selection
  const calculateCurrentPrice = () => {
    let basePrice = currentMainMeal?.price || 15;
    let addons = 0;
    if (currentRestaurant.sides) {
      selectedSideItems.forEach(sideName => {
        const sideObj = currentRestaurant.sides?.find(s => s.name === sideName);
        if (sideObj) addons += sideObj.priceAddon;
      });
    }
    return basePrice + addons;
  };

  const calculatedPrice = calculateCurrentPrice();

  // Filter orders for the selected date
  const todaysOrders = orders.filter((o) => o.date === selectedDate);

  // Calculate stats per restaurant
  const totalAmount = todaysOrders.reduce((sum, o) => sum + o.price, 0);
  const countRestA = todaysOrders.filter(o => (o.restaurantId === 'A' || !o.restaurantId)).length;
  const countRestB = todaysOrders.filter(o => o.restaurantId === 'B').length;
  const countRestC = todaysOrders.filter(o => o.restaurantId === 'C').length;

  const paidCount = todaysOrders.filter((o) => o.isPaid).length;
  const unpaidCount = todaysOrders.length - paidCount;

  // Filter today's list based on search term, plant, restaurant, and payment status
  const filteredTodaysOrders = todaysOrders.filter((o) => {
    // 1. Search keyword (name, mealName, sideItems)
    const term = searchTerm.toLowerCase().trim();
    const matchSearch = !term || 
      o.name.toLowerCase().includes(term) ||
      (o.mealName && o.mealName.toLowerCase().includes(term)) ||
      (o.sideItems && o.sideItems.some(s => s.toLowerCase().includes(term))) ||
      (o.restaurantName && o.restaurantName.toLowerCase().includes(term));

    // 2. Plant filter
    const matchPlant = filterPlant === 'all' ||
      (filterPlant === 'Plant1' && (o.plant === 'Plant1' || !o.plant)) ||
      (filterPlant === 'Plant2' && o.plant === 'Plant2');

    // 3. Restaurant filter
    const matchRestaurant = filterRestaurant === 'all' ||
      (o.restaurantId === filterRestaurant) ||
      (!o.restaurantId && filterRestaurant === 'A');

    // 4. Payment status filter
    const matchPaid = filterPaid === 'all' ||
      (filterPaid === 'paid' && o.isPaid) ||
      (filterPaid === 'unpaid' && !o.isPaid);

    return matchSearch && matchPlant && matchRestaurant && matchPaid;
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setShowSuggestions(true);
  };

  const selectSuggestion = (suggestedName: string) => {
    setName(suggestedName);
    setShowSuggestions(false);
    
    // Auto-fill past preferences if found
    const pastOrder = orders
      .filter(o => o.name.trim().toLowerCase() === suggestedName.trim().toLowerCase())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      
    if (pastOrder) {
      if (pastOrder.restaurantId) {
        setSelectedRestaurantId(pastOrder.restaurantId);
      }
      if (pastOrder.mealType) {
        setSelectedMealId(pastOrder.mealType);
      }
      if (pastOrder.sideItems) {
        setSelectedSideItems(pastOrder.sideItems);
      }
      if (pastOrder.plant) {
        setPlant(pastOrder.plant);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setMessage({ type: 'error', text: t.inputNameError });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const trimmedName = name.trim();
    const existingOrder = todaysOrders.find(
      (o) => o.name.toLowerCase() === trimmedName.toLowerCase()
    );

    const targetOrderId = existingOrder ? existingOrder.id : undefined;

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetOrderId,
          name: trimmedName,
          restaurantId: selectedRestaurantId,
          restaurantName: getLocalizedRestaurantName(currentRestaurant, lang),
          mealType: selectedMealId,
          mealName: currentMainMeal?.name || '主食',
          sideItems: selectedSideItems,
          price: calculatedPrice,
          isPaid,
          paymentPlatform: isPaid ? (paymentPlatform || 'Restaurant') : (paymentPlatform || 'Restaurant'),
          date: selectedDate,
          plant
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Submit failed');
      }

      const savedOrder = await response.json();

      // Add to name history
      const updatedHistory = [trimmedName, ...nameHistory.filter((n) => n !== trimmedName)].slice(0, 10);
      setNameHistory(updatedHistory);
      localStorage.setItem('lunch_names_history', JSON.stringify(updatedHistory));

      // Record this order ID under my ownership
      const updatedMyOrders = [...myOrdersList];
      if (!updatedMyOrders.includes(savedOrder.id)) {
        updatedMyOrders.push(savedOrder.id);
        setMyOrdersList(updatedMyOrders);
        localStorage.setItem('my_lunch_orders', JSON.stringify(updatedMyOrders));
      }

      // Save complete order object locally for data loss recovery
      try {
        const existingSaved = JSON.parse(localStorage.getItem('my_lunch_orders_details_v2') || '[]');
        const filtered = Array.isArray(existingSaved) 
          ? existingSaved.filter((o: any) => o && o.id !== savedOrder.id && !(o.date === savedOrder.date && o.name === savedOrder.name))
          : [];
        const newSaved = [savedOrder, ...filtered].slice(0, 100);
        localStorage.setItem('my_lunch_orders_details_v2', JSON.stringify(newSaved));
      } catch (e) {
        console.error('Error caching order details:', e);
      }

      const successLabel = existingOrder
        ? (lang === 'zh' ? '订餐已成功更新！' : lang === 'en' ? 'Order updated successfully!' : 'Pesanan berjaya dikemas kini!')
        : t.submitSuccess;

      setMessage({ 
        type: 'success', 
        text: `${successLabel} [${getLocalizedRestaurantName(currentRestaurant, lang)}] ${formatLocalizedMealName(currentMainMeal?.name, lang) || currentMainMeal?.name} (RM ${calculatedPrice})` 
      });
      
      setIsPaid(false);
      onOrderSubmitted();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || t.networkError });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Upload Payment Receipt Modal
  const handleOpenReceiptModal = (order: Order) => {
    setReceiptModalOrder(order);
    setReceiptFormIsPaid(true);
    setReceiptFormPlatform(order.paymentPlatform || 'Restaurant');
    setReceiptFormImage(order.receiptUrl || '');
    setReceiptMsg(null);
  };

  // Compress & convert file to Base64
  const handleReceiptImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件 (JPG / PNG / GIF)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setReceiptFormImage(compressedDataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Submit Receipt and update payment status
  const handleSaveReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptModalOrder) return;

    setUploadingReceipt(true);
    setReceiptMsg(null);

    const isPaidToSave = receiptFormImage ? true : receiptFormIsPaid;

    try {
      const response = await fetch(`/api/orders/${receiptModalOrder.id}/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPaid: isPaidToSave,
          paymentPlatform: receiptFormPlatform,
          receiptUrl: receiptFormImage,
          paymentTime: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Save receipt failed');
      }

      setReceiptMsg({ type: 'success', text: t.paymentUpdatedSuccess });
      setTimeout(() => {
        setReceiptModalOrder(null);
        onOrderSubmitted();
      }, 1200);
    } catch (err: any) {
      setReceiptMsg({ type: 'error', text: t.networkError });
    } finally {
      setUploadingReceipt(false);
    }
  };

  const getPlatformLabel = (platform?: string) => {
    if (platform === 'WeChat') return '🟢 微信支付';
    if (platform === 'TNG') return '🔵 Touch \'n Go';
    if (platform === 'Restaurant') return '🍽️ 直接向餐厅支付';
    return platform || '-';
  };

  // Get QR URL for modal
  const getQrUrlForTab = (tab: string) => {
    const rest = activeRestaurants.find(r => r.id === tab || `Restaurant${r.id}` === tab);
    if (rest?.qrUrl) return rest.qrUrl;
    if (tab === 'A' || tab === 'RestaurantA') return rmbRates?.restaurantAQrUrl || rmbRates?.restaurantQrUrl || DEFAULT_RESTAURANT_A_QR_URL;
    if (tab === 'B' || tab === 'RestaurantB') return rmbRates?.restaurantBQrUrl || DEFAULT_RESTAURANT_B_QR_URL;
    if (tab === 'C' || tab === 'RestaurantC') return rmbRates?.restaurantCQrUrl || DEFAULT_RESTAURANT_C_QR_URL;
    return DEFAULT_RESTAURANT_A_QR_URL;
  };

  return (
    <div className="space-y-6">
      {/* Workflow Step Guide Banner */}
      <div className="bg-gradient-to-r from-rose-500 via-rose-600 to-amber-600 rounded-2xl p-4 sm:p-5 text-white shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs shrink-0">
            <Sparkles className="w-5 h-5 text-amber-200" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wide text-amber-100 flex items-center gap-2">
              <span>📍 {t.workflowGuideTitle}</span>
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-white mt-0.5">
              {t.workflowGuideDesc}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setActiveQrTab(selectedRestaurantId);
            setShowQrModal(true);
          }}
          className="shrink-0 bg-white text-rose-600 hover:bg-rose-50 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>{t.viewQrBtn}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Registration */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-rose-50 text-rose-500 rounded-xl">
                <Utensils className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">{t.formTitle}</h2>
                <p className="text-xs text-slate-500">
                  {t.formSubtitle}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Date Selection */}
              <div className="space-y-2.5 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-rose-500" />
                    {t.dateLabel}
                  </label>
                  {isAfter14 && (
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300/80 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                      {t.after17Badge}
                    </span>
                  )}
                </div>

                {/* Quick Date Switcher */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => onDateChange(todayStr)}
                    className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                      selectedDate === todayStr
                        ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>☀️</span>
                      {t.quickDateToday}
                    </span>
                    <span className={`text-[11px] font-medium ${selectedDate === todayStr ? 'text-rose-100' : 'text-slate-400'}`}>
                      {formatDateMMDD(todayStr)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDateChange(tomorrowStr)}
                    className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                      selectedDate === tomorrowStr
                        ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>🌙</span>
                      {t.quickDateTomorrow}
                    </span>
                    <span className={`text-[11px] font-medium ${selectedDate === tomorrowStr ? 'text-rose-100' : 'text-slate-400'}`}>
                      {formatDateMMDD(tomorrowStr)}
                    </span>
                  </button>
                </div>
                <div className="text-[10px] text-amber-600 font-bold mt-1 text-center">
                  14:00之后默认定第二天午餐
                </div>

                {/* Custom Date Input */}
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => onDateChange(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs text-slate-600 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors"
                  />
                </div>
              </div>

              {/* Name Input */}
              <div className="relative">
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  {t.nameLabel}
                </label>
                <input
                  type="text"
                  placeholder={t.namePlaceholder}
                  value={name}
                  onChange={handleNameChange}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors font-medium"
                  maxLength={30}
                />
                {showSuggestions && nameHistory.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 bg-slate-50 uppercase tracking-wider">
                      {t.suggestionTitle}
                    </div>
                    {nameHistory
                      .filter((n) => n.toLowerCase().includes(name.toLowerCase()))
                      .map((hName, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectSuggestion(hName)}
                          className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors border-b border-slate-50 last:border-0 cursor-pointer"
                        >
                          {hName}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Plant Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Building className="w-4 h-4 text-slate-400" />
                  {t.plantLabel}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPlant('Plant2')}
                    className={`py-2.5 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      plant === 'Plant2'
                        ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    🏢 {t.plant2}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlant('Plant1')}
                    className={`py-2.5 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      plant === 'Plant1'
                        ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    🏢 {t.plant1}
                  </button>
                </div>
              </div>

              {/* STEP 1: RESTAURANT SELECTOR */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-rose-500" />
                    {t.selectRestaurantLabel || '选择餐厅'}
                  </span>
                  <span className="text-xs text-slate-400 font-normal">A / B / C 餐厅</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {activeRestaurants.map((rest) => {
                    const isSelected = selectedRestaurantId === rest.id;
                    return (
                      <button
                        key={rest.id}
                        type="button"
                        onClick={() => handleRestaurantChange(rest.id)}
                        className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/10 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-lg">
                            {rest.id === 'A' ? '🏢' : rest.id === 'B' ? '🍱' : rest.id === 'C' ? '🍖' : '🍽️'}
                          </span>
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                            isSelected ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {getLocalizedRestaurantName(rest, lang)}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-800 line-clamp-1">
                          {rest.name}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                          {lang === 'en' ? rest.descEn || rest.desc : lang === 'ms' ? rest.descMs || rest.desc : rest.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* C RESTAURANT ALERT NOTICE */}
              {selectedRestaurantId === 'C' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-900 animate-fade-in">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">{t.minOrderNoticeC || '⚠️ C餐厅烧腊饭：需 3 份以上起订'}</strong>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      {lang === 'en' 
                        ? `Orders proceed when total reaches 3+ portions. Selected today: `
                        : lang === 'ms' 
                          ? `Pesanan diproses apabila jumlah mencapai 3+ porsi. Dipilih hari ini: `
                          : `同伴累计达 3 份以上即可成功起订，今日已选择 C 餐厅: `}
                      <span className="font-bold text-amber-900">{countRestC} {t.portionUnit}</span>.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 2: MAIN MEAL SELECTION */}
              <div className="space-y-2.5">
                <label className="block text-sm font-semibold text-slate-700 flex items-center justify-between">
                  <span>{lang === 'en' ? 'Main Dish Selection' : lang === 'ms' ? 'Pilihan Hidangan Utama' : '主食选择'}</span>
                  <span className="text-xs text-slate-400">
                    {lang === 'en' ? `${currentRestaurant.mains.length} options` : lang === 'ms' ? `${currentRestaurant.mains.length} pilihan` : `共 ${currentRestaurant.mains.length} 款`}
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentRestaurant.mains.map((main) => {
                    const isSelected = selectedMealId === main.id;
                    return (
                      <button
                        key={main.id}
                        type="button"
                        onClick={() => setSelectedMealId(main.id)}
                        className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer relative ${
                          isSelected
                            ? 'border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/10'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-sm">{getLocalizedMenuItemName(main, lang)}</span>
                          <span className="text-xs font-black font-mono text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                            RM {main.price}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 3: SIDE ITEMS SELECTION (IF AVAILABLE FOR RESTAURANT) */}
              {currentRestaurant.sides && currentRestaurant.sides.length > 0 && (
                <div className="space-y-2.5 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
                  <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>{t.sideItemsLabel || '附带小吃 / 配菜 (可选可多选)'}</span>
                    <span className="text-[10px] text-slate-400">
                      {lang === 'en' ? 'Click to select and add to order' : lang === 'ms' ? 'Klik untuk pilih dan tambah ke pesanan' : '点击勾选即可加入订单'}
                    </span>
                  </label>

                  <div className="flex flex-wrap gap-2">
                    {currentRestaurant.sides.map((side) => {
                      const isSelected = selectedSideItems.includes(side.name);
                      return (
                        <button
                          key={side.id}
                          type="button"
                          onClick={() => toggleSideItem(side.name)}
                          className={`py-1.5 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>{getLocalizedSideItemName(side, lang)}</span>
                          {side.priceAddon > 0 && (
                            <span className={`text-[10px] px-1.5 rounded font-mono ${isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900 font-bold'}`}>
                              +RM{side.priceAddon}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LIVE TOTAL PRICE CALCULATION SUMMARY */}
              <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-700">
                    {lang === 'en' ? `Order Budget Total (${currentRestaurant.name})` : lang === 'ms' ? `Jumlah Anggaran Pesanan (${currentRestaurant.name})` : `登记预算总额 (${currentRestaurant.name})`}
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {currentMainMeal?.name} {selectedSideItems.length > 0 ? `+ ${selectedSideItems.join(', ')}` : ''}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl font-black font-mono text-rose-600">
                    RM {calculatedPrice}
                  </div>
                </div>
              </div>


              {/* PAYMENT STATUS & PLATFORM SWITCHER */}
              <div className="bg-slate-50/90 rounded-xl p-3 space-y-2 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 leading-tight">{t.payStatusQuestion}</h4>
                    <p className="text-[10px] text-slate-400 leading-none mt-0.5">{t.payStatusDesc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPaid}
                      onChange={(e) => setIsPaid(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-rose-500"></div>
                  </label>
                </div>

                {isPaid && (
                  <div className="pt-2 border-t border-slate-200/60 animate-fade-in space-y-2">
                    {/* Compact Inline QR Code Box for Selected Restaurant */}
                    <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center gap-2.5 shadow-2xs">
                      <div className="w-14 h-14 bg-slate-50 p-1 rounded-lg border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden">
                        <img 
                          src={
                            currentRestaurant.qrUrl ||
                            (currentRestaurant.id === 'B' 
                              ? (rmbRates?.restaurantBQrUrl || DEFAULT_RESTAURANT_B_QR_URL)
                              : currentRestaurant.id === 'C'
                                ? (rmbRates?.restaurantCQrUrl || DEFAULT_RESTAURANT_C_QR_URL)
                                : (rmbRates?.restaurantAQrUrl || rmbRates?.restaurantQrUrl || DEFAULT_RESTAURANT_A_QR_URL))
                          } 
                          alt="Payment QR" 
                          className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => {
                            setActiveQrTab(currentRestaurant.id);
                            setShowQrModal(true);
                          }}
                        />
                      </div>
                      <div className="space-y-0.5 leading-tight flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 truncate">
                            🍽️ {currentRestaurant.name} {lang === 'en' ? 'DuitNow QR' : lang === 'ms' ? 'Kod QR DuitNow' : 'DuitNow 收款码'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveQrTab(currentRestaurant.id);
                              setShowQrModal(true);
                            }}
                            className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline shrink-0 cursor-pointer"
                          >
                            {lang === 'en' ? 'Enlarge ↗' : lang === 'ms' ? 'Besarkan ↗' : '放大查看 ↗'}
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">
                          {lang === 'en' ? `Direct pay [${currentRestaurant.name}] RM ${calculatedPrice}` : lang === 'ms' ? `Bayar terus [${currentRestaurant.name}] RM ${calculatedPrice}` : `请开启手机银行应用扫码向【${currentRestaurant.name}】支付 RM ${calculatedPrice}`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-md shadow-rose-500/25 flex items-center justify-center gap-2 disabled:bg-rose-300 disabled:cursor-not-allowed cursor-pointer text-sm"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    {t.submitting}
                  </>
                ) : (
                  t.submitBtn
                )}
              </button>
            </form>

            {/* Toast message */}
            {message && (
              <div
                className={`mt-4 p-4 rounded-xl border flex items-start gap-2.5 animate-fade-in ${
                  message.type === 'success'
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                    : 'bg-rose-50 border-rose-100 text-rose-800'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                )}
                <div className="text-sm font-medium">{message.text}</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Today's Register List & Stats */}
        <div className="lg:col-span-7 space-y-6">
          {/* Today's Registration Stats Summary banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            <div className="bg-white rounded-xl p-3 border border-slate-100 text-center shadow-sm">
              <div className="text-[11px] text-slate-400 font-semibold mb-0.5">{t.statTotalOrders}</div>
              <div className="text-xl font-black text-slate-800 flex items-center justify-center gap-1">
                <Users className="w-4 h-4 text-indigo-500" />
                {todaysOrders.length} <span className="text-xs text-slate-400 font-normal">{t.peopleUnit}</span>
              </div>
            </div>

            {activeRestaurants.map(rest => {
              const count = todaysOrders.filter(o => o.restaurantId === rest.id || (!o.restaurantId && rest.id === 'A')).length;
              return (
                <div key={rest.id} className="bg-white rounded-xl p-3 border border-slate-100 text-center shadow-sm">
                  <div className="text-[11px] text-slate-400 font-semibold mb-0.5 truncate" title={rest.name}>
                    {getLocalizedRestaurantName(rest, lang)}
                  </div>
                  <div className="text-xl font-black text-rose-600">
                    {count} <span className="text-xs text-slate-400 font-normal">{t.portionUnit}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* List Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span>📋</span>
                  {t.listTitle} ({selectedDate === todayStr ? `☀️ ${t.quickDateToday} ${formatDateMMDD(todayStr)}` : selectedDate === tomorrowStr ? `🌙 ${t.quickDateTomorrow} ${formatDateMMDD(tomorrowStr)}` : selectedDate})
                </h3>
                <p className="text-xs text-slate-500">
                  {t.paidSummary}: <span className="font-bold text-emerald-600">{paidCount}</span> {t.peopleUnit} | {t.unpaidSummary}: <span className="font-bold text-amber-600">{unpaidCount}</span> {t.peopleUnit} | {lang === 'en' ? 'Total Due' : lang === 'ms' ? 'Jumlah Perlu Dibayar' : '总应付'}: <span className="font-bold text-rose-600">RM {totalAmount}</span>
                </p>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-48 pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            </div>

            {/* Filter toolbar: Plant / Restaurant / Payment Status */}
            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2 text-xs w-full sm:w-auto">
                <span className="font-bold text-slate-600 flex items-center gap-1 shrink-0">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  {lang === 'en' ? 'Filters:' : lang === 'ms' ? 'Penapis:' : '筛选:'}
                </span>

                {/* Plant filter */}
                <select
                  value={filterPlant}
                  onChange={(e) => setFilterPlant(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer shadow-2xs"
                >
                  <option value="all">{lang === 'en' ? 'All Plants' : lang === 'ms' ? 'Semua Kilang' : '🏢 所有厂区'}</option>
                  <option value="Plant1">🏢 {lang === 'en' ? 'Plant 1' : lang === 'ms' ? 'Kilang 1' : '一厂'}</option>
                  <option value="Plant2">🏢 {lang === 'en' ? 'Plant 2' : lang === 'ms' ? 'Kilang 2' : '二厂'}</option>
                </select>

                {/* Restaurant filter */}
                <select
                  value={filterRestaurant}
                  onChange={(e) => setFilterRestaurant(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer shadow-2xs"
                >
                  <option value="all">{lang === 'en' ? 'All Restaurants' : lang === 'ms' ? 'Semua Restoran' : '🍽️ 所有餐厅/菜系'}</option>
                  {activeRestaurants.map((rest) => (
                    <option key={rest.id} value={rest.id}>
                      {getLocalizedRestaurantName(rest, lang)}
                    </option>
                  ))}
                </select>

                {/* Payment status filter */}
                <select
                  value={filterPaid}
                  onChange={(e) => setFilterPaid(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer shadow-2xs"
                >
                  <option value="all">{lang === 'en' ? 'All Payment Status' : lang === 'ms' ? 'Semua Status' : '💰 全部支付状态'}</option>
                  <option value="paid">✅ {lang === 'en' ? 'Paid' : lang === 'ms' ? 'Telah Dibayar' : '已支付'}</option>
                  <option value="unpaid">⏳ {lang === 'en' ? 'Unpaid' : lang === 'ms' ? 'Belum Dibayar' : '未支付'}</option>
                </select>
              </div>

              {/* Filter summary or reset button */}
              <div className="flex items-center gap-2 text-[11px] text-slate-500 shrink-0 ml-auto sm:ml-0">
                <span>
                  {lang === 'en' ? 'Showing' : lang === 'ms' ? 'Menunjukkan' : '显示'} <span className="font-bold text-slate-800">{filteredTodaysOrders.length}</span> / {todaysOrders.length} {lang === 'en' ? 'orders' : lang === 'ms' ? 'pesanan' : '条订餐记录'}
                </span>

                {(filterPlant !== 'all' || filterRestaurant !== 'all' || filterPaid !== 'all' || searchTerm.trim() !== '') && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterPlant('all');
                      setFilterRestaurant('all');
                      setFilterPaid('all');
                      setSearchTerm('');
                    }}
                    className="text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    <X className="w-3 h-3" />
                    {lang === 'en' ? 'Reset' : lang === 'ms' ? 'Set Semula' : '重置'}
                  </button>
                )}
              </div>
            </div>

            {/* Table list */}
            {filteredTodaysOrders.length === 0 ? (
              <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <div className="text-3xl mb-2">🍽️</div>
                <p className="text-sm text-slate-400 font-medium">{t.emptyList}</p>
                <p className="text-xs text-slate-300 mt-1">{t.emptyListSub}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                      <th className="py-3 px-3">{t.tableColName}</th>
                      <th className="py-3 px-3">{t.plantLabel}</th>
                      <th className="py-3 px-3">{t.tableColMeal}</th>
                      <th className="py-3 px-3">{t.tableColPrice}</th>
                      <th className="py-3 px-3">{t.tableColStatus}</th>
                      <th className="py-3 px-3 text-right">📸 {lang === 'zh' ? '支付记录' : lang === 'en' ? 'Payment Record' : 'Rekod Bayaran'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredTodaysOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="py-3 px-3 font-bold text-slate-800">
                          {order.name}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            order.plant === 'Plant2'
                              ? 'bg-purple-50 text-purple-700 border border-purple-100'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                          }`}>
                            🏢 {order.plant || 'Plant1'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                order.restaurantId === 'B' ? 'bg-emerald-100 text-emerald-800' :
                                order.restaurantId === 'C' ? 'bg-amber-100 text-amber-800' :
                                'bg-rose-100 text-rose-800'
                              }`}>
                                {order.restaurantName || (order.restaurantId === 'B' ? 'Fatty Feng' : order.restaurantId === 'C' ? t.restaurantCTitle : 'Delicious Cuckoo')}
                              </span>
                              <span className="font-bold text-slate-700 text-xs">
                                {formatLocalizedMealName(order.mealName, lang) || (order.mealType === 'mixed_rice' ? t.mixedRiceTitle : t.chickenRiceTitle)}
                              </span>
                            </div>

                            {order.sideItems && order.sideItems.length > 0 && (
                              <div className="text-[11px] text-slate-500 font-medium">
                                {lang === 'en' ? 'Sides' : lang === 'ms' ? 'Sampingan' : '配菜'}: {order.sideItems.map(s => formatLocalizedSideItem(s, lang)).join(', ')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-700">
                          RM {order.price}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col items-start gap-1">
                            {order.isPaid ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-emerald-700 bg-emerald-50 border border-emerald-100">
                                ✅ {t.statusPaid}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-amber-700 bg-amber-50 border border-amber-100">
                                ⏳ {t.statusUnpaid}
                              </span>
                            )}
                            {order.paymentPlatform && (
                              <span className="text-[10px] font-medium text-slate-400">
                                {getPlatformLabel(order.paymentPlatform)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {order.receiptUrl ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setLightboxImageUrl(order.receiptUrl!)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-700 transition-all cursor-pointer"
                                  title={lang === 'en' ? 'View uploaded receipt' : lang === 'ms' ? 'Lihat resit dimuat naik' : '查看已上传凭证'}
                                >
                                  <img src={order.receiptUrl} alt="Receipt" className="w-4 h-4 rounded object-cover" />
                                  <span>{t.viewReceiptBtn || (lang === 'en' ? 'View Receipt' : lang === 'ms' ? 'Lihat Resit' : '查看凭证')}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenReceiptModal(order)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                                  title={lang === 'en' ? 'Modify payment receipt' : lang === 'ms' ? 'Ubah suai resit bayaran' : '修改打卡凭证'}
                                >
                                  ✏️ {t.actionEdit}
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenReceiptModal(order)}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <span>📸 {lang === 'zh' ? '上传支付记录' : lang === 'en' ? 'Upload Payment Record' : 'Muat Naik Rekod Bayaran'}</span>
                              </button>
                            )}

                            {myOrdersList.includes(order.id) && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(t.deleteConfirm.replace('{name}', order.name))) {
                                    onDeleteOrder(order.id);
                                    const updated = myOrdersList.filter(id => id !== order.id);
                                    setMyOrdersList(updated);
                                    localStorage.setItem('my_lunch_orders', JSON.stringify(updated));
                                  }
                                }}
                                className="px-2 py-1 text-xs text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title={t.actionDelete}
                              >
                                {t.actionDelete}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Receipt Modal Dialog */}
      {receiptModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 text-rose-500 rounded-xl">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{t.uploadReceiptModalTitle}</h3>
                  <p className="text-xs text-slate-400">{t.uploadReceiptModalSubtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModalOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Brief Summary Card */}
            <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3.5 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-800 text-sm">{receiptModalOrder.name}</span>
                <span className="ml-2 text-[11px] text-slate-500 font-medium">({receiptModalOrder.plant || 'Plant1'})</span>
                <div className="text-slate-500 font-medium mt-0.5">
                  {receiptModalOrder.date} • [{receiptModalOrder.restaurantName || (receiptModalOrder.restaurantId === 'B' ? 'Fatty Feng' : receiptModalOrder.restaurantId === 'C' ? t.restaurantCTitle : 'Delicious Cuckoo')}] {formatLocalizedMealName(receiptModalOrder.mealName, lang) || (lang === 'en' ? 'Meal' : lang === 'ms' ? 'Hidangan' : '主食')}
                  {receiptModalOrder.sideItems && receiptModalOrder.sideItems.length > 0 && ` (+ ${receiptModalOrder.sideItems.map(s => formatLocalizedSideItem(s, lang)).join(', ')})`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-black text-rose-600 font-mono">RM {receiptModalOrder.price}</div>

              </div>
            </div>

            <form onSubmit={handleSaveReceipt} className="space-y-3">
              {/* Show selected restaurant QR Code inline with enlarge capability */}

              {/* Show selected restaurant QR Code inline with enlarge capability */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                <div 
                  className="relative group w-16 h-16 bg-white p-1 rounded-lg border border-slate-200 shrink-0 flex items-center justify-center cursor-pointer overflow-hidden hover:border-rose-400 transition-colors"
                  onClick={() => {
                    setActiveQrTab(receiptModalOrder.restaurantId || 'A');
                    setShowQrModal(true);
                  }}
                  title={lang === 'en' ? 'Click to enlarge QR code' : lang === 'ms' ? 'Klik untuk besarkan kod QR' : '点击放大查看二维码'}
                >
                  <img 
                    src={
                      activeRestaurants.find(r => r.id === (receiptModalOrder.restaurantId || 'A'))?.qrUrl ||
                      (receiptModalOrder.restaurantId === 'B' 
                        ? (rmbRates?.restaurantBQrUrl || DEFAULT_RESTAURANT_B_QR_URL)
                        : receiptModalOrder.restaurantId === 'C'
                          ? (rmbRates?.restaurantCQrUrl || DEFAULT_RESTAURANT_C_QR_URL)
                          : (rmbRates?.restaurantAQrUrl || rmbRates?.restaurantQrUrl || DEFAULT_RESTAURANT_A_QR_URL))
                    } 
                    alt="QR Code" 
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[9px] font-bold">
                    {lang === 'en' ? 'Enlarge 🔍' : lang === 'ms' ? 'Besarkan 🔍' : '放大 🔍'}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-800 truncate">
                      🍽️ {receiptModalOrder.restaurantName || 'Delicious Cuckoo'} {lang === 'en' ? 'DuitNow QR' : lang === 'ms' ? 'Kod QR DuitNow' : '收款二维码 (DuitNow)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveQrTab(receiptModalOrder.restaurantId || 'A');
                        setShowQrModal(true);
                      }}
                      className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-[10px] font-bold shrink-0 transition-colors flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>{lang === 'en' ? 'Enlarge' : lang === 'ms' ? 'Besarkan' : '放大查看'}</span>
                      <span>↗</span>
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                    {lang === 'en' ? `Scan to pay RM ${receiptModalOrder.price} to ${receiptModalOrder.restaurantName || 'Delicious Cuckoo'}` : lang === 'ms' ? `Imbas untuk bayar RM ${receiptModalOrder.price} ke ${receiptModalOrder.restaurantName || 'Delicious Cuckoo'}` : `请扫码向 ${receiptModalOrder.restaurantName || 'Delicious Cuckoo'} 支付 RM ${receiptModalOrder.price}`}
                  </div>
                </div>
              </div>

              {/* Upload Screenshot */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  <span>2. {t.paymentReceiptLabel}-</span>
                  <span className="text-rose-600 font-bold">
                    {lang === 'en' ? '(Image must include date and time)' : lang === 'ms' ? '(Imej mesti sertakan tarikh dan masa)' : '(图片中需要日期和时间)'}
                  </span>
                </label>
                
                {receiptFormImage ? (
                  <div className="relative rounded-xl border border-slate-200 overflow-hidden group bg-slate-900">
                    <img src={receiptFormImage} alt="Payment proof" className="w-full h-48 object-contain" />
                    <button
                      type="button"
                      onClick={() => setReceiptFormImage('')}
                      className="absolute top-2 right-2 bg-slate-900/80 text-white p-1.5 rounded-full hover:bg-rose-600 transition-colors cursor-pointer"
                      title={t.changeReceiptPhoto}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-rose-500 bg-slate-50 hover:bg-rose-50/30 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors text-center">
                    <Upload className="w-6 h-6 text-slate-400 mb-2" />
                    <span className="text-xs font-bold text-slate-700">{t.clickToUploadReceipt}</span>
                    <span className="text-[10px] text-slate-400 mt-1">{lang === 'en' ? 'Supports images (JPG, PNG, GIF), automatically compressed' : lang === 'ms' ? 'Menyokong imej (JPG, PNG, GIF), dimampatkan secara automatik' : '支持图片 (JPG, PNG, GIF)，自动轻量压缩上传'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Paid Checkbox */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">
                  {lang === 'en' ? 'Update status to [Paid]' : lang === 'ms' ? 'Kemas kini status kepada [Telah Dibayar]' : '更新状态为【已完成支付】'}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={receiptFormIsPaid}
                    onChange={(e) => setReceiptFormIsPaid(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {receiptMsg && (
                <div className={`p-3 rounded-xl text-xs font-bold ${
                  receiptMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {receiptMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={uploadingReceipt}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {uploadingReceipt ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {t.confirmUpdatePayment}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Receipt Image Modal */}
      {lightboxImageUrl && (
        <div 
          onClick={() => setLightboxImageUrl(null)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in cursor-pointer"
        >
          <div className="relative max-w-2xl w-full bg-slate-900 rounded-2xl overflow-hidden p-2 shadow-2xl border border-slate-800" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-slate-800 text-white">
              <span className="text-xs font-bold flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-rose-400" />
                {t.receiptPreviewModalTitle}
              </span>
              <button
                onClick={() => setLightboxImageUrl(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black/40 min-h-[300px] max-h-[75vh]">
              <img src={lightboxImageUrl} alt="Receipt proof" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}

      {/* Payment QR Code Modal with 5 Tabs (A/B/C Restaurants, WeChat, TNG) */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-rose-500" />
                {t.qrModalTitle}
              </h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Tabs Switcher */}
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl text-center">
              {activeRestaurants.map(rest => {
                const isSelected = activeQrTab === rest.id || activeQrTab === `Restaurant${rest.id}`;
                return (
                  <button
                    key={rest.id}
                    type="button"
                    onClick={() => setActiveQrTab(rest.id)}
                    className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer truncate ${
                      isSelected
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                    title={rest.name}
                  >
                    🍽️ {getLocalizedRestaurantName(rest, lang)}
                  </button>
                );
              })}
            </div>

            {/* QR Image Display Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center">
              <div className="w-64 h-80 bg-white p-2 rounded-xl shadow-md border border-slate-200 flex items-center justify-center overflow-hidden">
                <img
                  src={getQrUrlForTab(activeQrTab)}
                  alt="Payment QR"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="mt-3 space-y-1">
                <div className="text-xs font-black text-slate-800">
                  {`${activeRestaurants.find(r => r.id === activeQrTab || `Restaurant${r.id}` === activeQrTab)?.name || '餐厅'} DuitNow 二维码`}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {lang === 'en' ? 'Pay directly via DuitNow QR or cash to restaurant' : lang === 'ms' ? 'Bayar terus melalui Kod QR DuitNow atau tunai kepada restoran' : '请使用手机银行或 DuitNow 电子钱包扫码直接支付给餐厅'}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
            >
              {t.hideQrBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
