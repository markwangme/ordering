/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo } from 'react';
import JSZip from 'jszip';
import { Order, AdminTransfer, RmbRates, CustomRestaurant, CustomMenuItem, APP_BASE_URL } from '../types';
import { RESTAURANTS, getActiveRestaurants } from '../data/menu';
import RestaurantManager from './RestaurantManager';
import { 
  DEFAULT_RESTAURANT_A_QR_URL, 
  DEFAULT_RESTAURANT_B_QR_URL, 
  DEFAULT_RESTAURANT_C_QR_URL 
} from '../assets/restaurantQr';
import { translations, Language, getLocalizedExchangeRateNote } from '../i18n';
import { 
  Lock, 
  Unlock, 
  KeyRound,
  Download, 
  Trash2, 
  Upload, 
  DollarSign, 
  Calendar, 
  ShieldAlert, 
  FileSpreadsheet, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Eye,
  Settings,
  X,
  Banknote,
  Clock,
  Share2,
  FileArchive,
  Plus,
  Copy,
  Check,
  Utensils,
  QrCode,
  ExternalLink,
  Package,
  Layers,
  Save,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  BarChart3,
  ArrowLeft
} from 'lucide-react';

interface AdminViewProps {
  lang?: Language;
  orders: Order[];
  transfers: AdminTransfer[];
  rmbRates?: RmbRates;
  selectedDate: string;
  onOrderSubmitted: () => void;
  onDeleteOrder: (id: string) => void;
  onAddTransfer: (transfer: { amount: number; screenshotUrl: string; date: string }) => Promise<void>;
  onDeleteTransfer: (id: string) => void;
  onUpdateRates?: () => void;
  onBackToOrder?: () => void;
}

export default function AdminView({
  lang = 'zh',
  orders,
  transfers,
  rmbRates,
  selectedDate,
  onOrderSubmitted,
  onDeleteOrder,
  onAddTransfer,
  onDeleteTransfer,
  onUpdateRates,
  onBackToOrder
}: AdminViewProps) {
  const t = translations[lang];
  // Passcode protection
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('is_admin_logged') === 'true';
  });
  const [authError, setAuthError] = useState('');

  // Password change states
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');
  const [isChanging, setIsChanging] = useState(false);

  // Visitor Passcode Management (Team Passcode)
  const [currentVisitorPasscode, setCurrentVisitorPasscode] = useState('');
  const [newVisitorPasscodeInput, setNewVisitorPasscodeInput] = useState('');
  const [isUpdatingVisitorPasscode, setIsUpdatingVisitorPasscode] = useState(false);
  const [visitorPasscodeMsg, setVisitorPasscodeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchVisitorPasscode = async () => {
    try {
      const res = await fetch('/api/admin/visitor-passcode');
      if (res.ok) {
        const data = await res.json();
        if (data.passcode) {
          setCurrentVisitorPasscode(data.passcode);
          setNewVisitorPasscodeInput(data.passcode);
        }
      }
    } catch (e) {
      console.error('Failed to fetch visitor passcode:', e);
    }
  };

  const handleUpdateVisitorPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVisitorPasscodeInput || newVisitorPasscodeInput.trim().length < 2) {
      setVisitorPasscodeMsg({ type: 'error', text: lang === 'zh' ? '团队访问口令长度不能少于2位' : 'Passcode must be at least 2 characters' });
      return;
    }
    setIsUpdatingVisitorPasscode(true);
    setVisitorPasscodeMsg(null);
    try {
      const res = await fetch('/api/admin/visitor-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPasscode: newVisitorPasscodeInput.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentVisitorPasscode(data.passcode);
        setVisitorPasscodeMsg({ type: 'success', text: lang === 'zh' ? '🎉 团队全站访问口令已成功更新！' : 'Visitor passcode updated!' });
        setTimeout(() => setVisitorPasscodeMsg(null), 3000);
      } else {
        setVisitorPasscodeMsg({ type: 'error', text: data.error || (lang === 'zh' ? '更新失败' : 'Failed to update') });
      }
    } catch (err: any) {
      setVisitorPasscodeMsg({ type: 'error', text: lang === 'zh' ? '网络错误，请稍后重试' : 'Network error' });
    } finally {
      setIsUpdatingVisitorPasscode(false);
    }
  };



  // Filter & Pagination state for orders admin table
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [adminDateFilter, setAdminDateFilter] = useState('');
  const [adminTimeScope, setAdminTimeScope] = useState<'week' | 'month' | 'today' | 'all'>('week');
  const [adminPlantFilter, setAdminPlantFilter] = useState<string>('all');
  const [adminPage, setAdminPage] = useState(1);
  const [adminPageSize, setAdminPageSize] = useState(20);



  // Feature 1: Batch Export & Share Payment Receipts by Restaurant
  const [batchExportDate, setBatchExportDate] = useState(selectedDate);
  const [batchExportRestId, setBatchExportRestId] = useState('A');
  const [isZipping, setIsZipping] = useState(false);
  const [batchCopiedToast, setBatchCopiedToast] = useState<string | null>(null);
  const [showBatchGalleryModal, setShowBatchGalleryModal] = useState(false);

  // Feature: Database Export & Restore
  const [backupMsg, setBackupMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isRestoringDb, setIsRestoringDb] = useState(false);

  // System Health & Storage Quota state
  const [systemHealth, setSystemHealth] = useState<{
    storageMode: string;
    isCloud: boolean;
    projectId: string;
    totalOrdersCount: number;
    totalTransfersCount: number;
    estimatedMemorySizeKb: number;
    maxOrdersLimit: number;
    autoPruneEnabled: boolean;
    usagePercentage: number;
    isQuotaWarning: boolean;
    recommendation: string;
  } | null>(null);

  const [limitInput, setLimitInput] = useState('5000');
  const [autoPruneInput, setAutoPruneInput] = useState(true);
  const [systemSettingMsg, setSystemSettingMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdatingHealthSettings, setIsUpdatingHealthSettings] = useState(false);

  const fetchSystemHealth = async () => {
    try {
      const res = await fetch('/api/system/health');
      if (res.ok) {
        const data = await res.json();
        setSystemHealth(data);
        setLimitInput(String(data.maxOrdersLimit || 5000));
        setAutoPruneInput(!!data.autoPruneEnabled);
      }
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    if (isAuthenticated) {
      fetchSystemHealth();
      fetchVisitorPasscode();
    }
  }, [isAuthenticated]);

  const handleUpdateSystemSettings = async () => {
    setIsUpdatingHealthSettings(true);
    setSystemSettingMsg(null);
    try {
      const res = await fetch('/api/system/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limit: Number(limitInput),
          autoPrune: autoPruneInput
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSystemSettingMsg({ type: 'success', text: '🎉 系统限制与自动覆盖预警策略更新成功！' });
        fetchSystemHealth();
        onOrderSubmitted();
      } else {
        throw new Error(data.error || '更新失败');
      }
    } catch (err: any) {
      setSystemSettingMsg({ type: 'error', text: `❌ ${err.message || '更新失败'}` });
    } finally {
      setIsUpdatingHealthSettings(false);
    }
  };

  const handleExportDatabase = () => {
    window.open('/api/admin/export-db', '_blank');
  };

  const handleImportDatabase = async (file: File) => {
    setIsRestoringDb(true);
    setBackupMsg(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      
      const res = await fetch('/api/admin/import-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json)
      });
      const data = await res.json();
      if (res.ok) {
        setBackupMsg({ type: 'success', text: `🎉 ${data.message || '数据导入成功！'}` });
        onOrderSubmitted();
      } else {
        throw new Error(data.error || '导入失败');
      }
    } catch (err: any) {
      setBackupMsg({ type: 'error', text: `❌ 导入备份文件失败: ${err.message}` });
    } finally {
      setIsRestoringDb(false);
    }
  };

  // Feature 2: Custom Restaurants & Menu CRUD State
  const [isRestaurantsEdited, setIsRestaurantsEdited] = useState(false);
  const [customRestaurants, setCustomRestaurants] = useState<CustomRestaurant[]>(() => {
    if (rmbRates?.customRestaurants && Array.isArray(rmbRates.customRestaurants) && rmbRates.customRestaurants.length > 0) {
      return rmbRates.customRestaurants.map(r => ({
        ...r,
        qrUrl: r.qrUrl || (
          r.id === 'A' ? (rmbRates?.restaurantAQrUrl || rmbRates?.restaurantQrUrl || DEFAULT_RESTAURANT_A_QR_URL) :
          r.id === 'B' ? (rmbRates?.restaurantBQrUrl || DEFAULT_RESTAURANT_B_QR_URL) :
          r.id === 'C' ? (rmbRates?.restaurantCQrUrl || DEFAULT_RESTAURANT_C_QR_URL) : undefined
        )
      }));
    }
    return RESTAURANTS.map(r => ({
      id: r.id,
      name: r.name,
      nameEn: r.nameEn,
      desc: r.desc,
      descEn: r.descEn,
      note: r.note,
      minQuantity: r.minQuantity,
      qrUrl: r.id === 'A' ? (rmbRates?.restaurantAQrUrl || rmbRates?.restaurantQrUrl || DEFAULT_RESTAURANT_A_QR_URL) :
             r.id === 'B' ? (rmbRates?.restaurantBQrUrl || DEFAULT_RESTAURANT_B_QR_URL) :
             r.id === 'C' ? (rmbRates?.restaurantCQrUrl || DEFAULT_RESTAURANT_C_QR_URL) : r.qrUrl,
      mains: r.mains.map(m => ({ id: m.id, name: m.name, nameEn: m.nameEn, price: m.price, desc: m.desc })),
      sides: r.sides.map(s => ({ id: s.id, name: s.name, nameEn: s.nameEn, price: s.priceAddon }))
    }));
  });

  const getEffectiveQrUrl = (rest: CustomRestaurant) => {
    if (rest.qrUrl && rest.qrUrl.trim() !== '') return rest.qrUrl;
    if (rest.id === 'A') return rmbRates?.restaurantAQrUrl || rmbRates?.restaurantQrUrl || DEFAULT_RESTAURANT_A_QR_URL;
    if (rest.id === 'B') return rmbRates?.restaurantBQrUrl || DEFAULT_RESTAURANT_B_QR_URL;
    if (rest.id === 'C') return rmbRates?.restaurantCQrUrl || DEFAULT_RESTAURANT_C_QR_URL;
    return '';
  };

  React.useEffect(() => {
    if (rmbRates) {
      if (!isRestaurantsEdited && rmbRates.customRestaurants && Array.isArray(rmbRates.customRestaurants) && rmbRates.customRestaurants.length > 0) {
        setCustomRestaurants(rmbRates.customRestaurants);
      }
    }
  }, [rmbRates, isRestaurantsEdited]);

  const activeRestaurantsList = getActiveRestaurants(customRestaurants, rmbRates);

  // All orders for selected date & restaurant
  const selectedRestOrders = orders.filter(o => 
    o.date === batchExportDate && 
    (o.restaurantId === batchExportRestId || (!o.restaurantId && batchExportRestId === 'A'))
  );

  // Orders matching selected date & restaurant that have paid receipt
  const batchOrdersWithReceipts = selectedRestOrders.filter(o => 
    o.isPaid && 
    o.receiptUrl && 
    o.receiptUrl.trim() !== ''
  );

  const batchTotalAmount = batchOrdersWithReceipts.reduce((sum, o) => sum + o.price, 0);
  const selectedRestTotalAmount = selectedRestOrders.reduce((sum, o) => sum + o.price, 0);

  // ZIP Download Handler
  const handleDownloadZip = async () => {
    if (batchOrdersWithReceipts.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const targetRest = activeRestaurantsList.find(r => r.id === batchExportRestId);
      const restName = targetRest ? targetRest.name : batchExportRestId;

      batchOrdersWithReceipts.forEach((order, index) => {
        let base64Data = order.receiptUrl || '';
        if (base64Data.includes(',')) {
          base64Data = base64Data.split(',')[1];
        }
        const ext = order.receiptUrl?.includes('image/png') ? 'png' : 'jpg';
        const cleanMeal = (order.mealName || '套餐').replace(/[/\\?%*:|"<>]/g, '_');
        const filename = `${String(index + 1).padStart(2, '0')}_RM${order.price}_${cleanMeal}.${ext}`;
        zip.file(filename, base64Data, { base64: true });
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${batchExportDate}_${restName.replace(/\s+/g, '_')}_支付截图.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP Error:', err);
      alert(lang === 'zh' ? 'ZIP打包下载失败，请稍后重试' : 'ZIP packaging failed');
    } finally {
      setIsZipping(false);
    }
  };

  const getAuditShareUrl = () => {
    return `${APP_BASE_URL}/?shareRest=${batchExportRestId}&date=${batchExportDate}`;
  };

  // Generate Restaurant Order Summary Text (NO Employee Names, with Package Price and Counts)
  const buildRestaurantOrderSummaryText = () => {
    const targetRest = activeRestaurantsList.find(r => r.id === batchExportRestId);
    const restName = targetRest ? targetRest.name : batchExportRestId;
    const shareUrl = getAuditShareUrl();

    // Group meals and calculate counts & total amount per meal
    const mealStatsMap = new Map<string, { count: number; totalAmount: number }>();
    const sideCountsMap = new Map<string, number>();

    selectedRestOrders.forEach(o => {
      const meal = o.mealName || '套餐';
      const current = mealStatsMap.get(meal) || { count: 0, totalAmount: 0 };
      mealStatsMap.set(meal, {
        count: current.count + 1,
        totalAmount: current.totalAmount + (o.price || 0)
      });

      if (o.sideItems && Array.isArray(o.sideItems)) {
        o.sideItems.forEach(s => {
          sideCountsMap.set(s, (sideCountsMap.get(s) || 0) + 1);
        });
      }
    });

    let text = `【${batchExportDate} ${restName} 订餐总览】\n`;
    text += `订餐总份数: ${selectedRestOrders.length} 份 | 总金额: RM ${selectedRestTotalAmount.toFixed(2)}\n`;
    text += `------------------------------------------\n`;
    text += `【午餐套餐汇总】\n`;
    if (mealStatsMap.size === 0) {
      text += `（暂无订餐记录）\n`;
    } else {
      mealStatsMap.forEach((stats, meal) => {
        text += `• ${meal}: ${stats.count} 份，金额RM ${stats.totalAmount.toFixed(2)}\n`;
      });
    }

    if (sideCountsMap.size > 0) {
      text += `\n【配菜/加料汇总】\n`;
      sideCountsMap.forEach((count, side) => {
        text += `• ${side}: ${count} 份\n`;
      });
    }

    text += `------------------------------------------\n`;
    if (shareUrl) {
      text += `餐厅专属在线账单及核对链接:\n${shareUrl}`;
    }

    return text;
  };

  // Copy Summary Text (NO Employee Names)
  const handleCopySummaryText = () => {
    const text = buildRestaurantOrderSummaryText();
    navigator.clipboard.writeText(text);
    setBatchCopiedToast(t.batchShareCopiedSuccess || '📋 订餐总览明细文本（不含姓名）已成功复制！');
    setTimeout(() => setBatchCopiedToast(null), 2500);
  };

  const handleCopyAuditLink = () => {
    const url = getAuditShareUrl();
    navigator.clipboard.writeText(url);
    setBatchCopiedToast(lang === 'en' ? 'Audit link copied to clipboard!' : lang === 'ms' ? 'Pautan semakan disalin!' : '🔗 专属对账/订餐链接已复制！餐厅老板打开链接即可直接参看');
    setTimeout(() => setBatchCopiedToast(null), 3000);
  };

  const handleWhatsAppShare = () => {
    const text = buildRestaurantOrderSummaryText();
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // Share to Boss via Web Share API or Copy
  const handleShareBoss = async () => {
    handleWhatsAppShare();
  };

  // CRUD Handlers for Restaurant & Menu Management
  const handleAddRestaurant = () => {
    const newId = `R_${Date.now().toString(36).toUpperCase()}`;
    const newRest: CustomRestaurant = {
      id: newId,
      name: lang === 'en' ? `New Restaurant ${customRestaurants.length + 1}` : `新餐厅 ${customRestaurants.length + 1}`,
      nameEn: `New Restaurant ${customRestaurants.length + 1}`,
      desc: lang === 'en' ? 'Delicious custom meals' : '特色精选套餐',
      mains: [
        { id: `m_${Date.now()}_1`, name: lang === 'en' ? 'Special Combo' : '招牌套餐', price: 15, desc: 'RM15' }
      ],
      sides: []
    };
    setIsRestaurantsEdited(true);
    setCustomRestaurants([...customRestaurants, newRest]);
  };

  const handleUpdateRestaurantInfo = (id: string, field: keyof CustomRestaurant, value: any) => {
    setIsRestaurantsEdited(true);
    setCustomRestaurants(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleDeleteRestaurant = (id: string) => {
    const target = customRestaurants.find(r => r.id === id);
    const msg = t.deleteRestaurantConfirm ? t.deleteRestaurantConfirm.replace('{name}', target?.name || '') : `确定要删除餐厅【${target?.name}】及其所有套餐菜单吗？`;
    if (confirm(msg)) {
      setIsRestaurantsEdited(true);
      setCustomRestaurants(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleAddMainItem = (restId: string) => {
    setIsRestaurantsEdited(true);
    setCustomRestaurants(prev => prev.map(r => {
      if (r.id === restId) {
        const newMain: CustomMenuItem = {
          id: `m_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: lang === 'en' ? 'New Package' : '新套餐菜品',
          price: 15,
          desc: 'RM15'
        };
        return { ...r, mains: [...r.mains, newMain] };
      }
      return r;
    }));
  };

  const handleUpdateMainItem = (restId: string, mainId: string, field: keyof CustomMenuItem, value: any) => {
    setIsRestaurantsEdited(true);
    setCustomRestaurants(prev => prev.map(r => {
      if (r.id === restId) {
        return {
          ...r,
          mains: r.mains.map(m => m.id === mainId ? { ...m, [field]: value } : m)
        };
      }
      return r;
    }));
  };

  const handleDeleteMainItem = (restId: string, mainId: string) => {
    setIsRestaurantsEdited(true);
    setCustomRestaurants(prev => prev.map(r => {
      if (r.id === restId) {
        return {
          ...r,
          mains: r.mains.filter(m => m.id !== mainId)
        };
      }
      return r;
    }));
  };

  const handleAddSideItem = (restId: string) => {
    setIsRestaurantsEdited(true);
    setCustomRestaurants(prev => prev.map(r => {
      if (r.id === restId) {
        const newSide: CustomMenuItem = {
          id: `s_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: lang === 'en' ? 'New Side Dish' : '新小吃/配菜',
          price: 0
        };
        return { ...r, sides: [...r.sides, newSide] };
      }
      return r;
    }));
  };

  const handleUpdateSideItem = (restId: string, sideId: string, field: keyof CustomMenuItem, value: any) => {
    setIsRestaurantsEdited(true);
    setCustomRestaurants(prev => prev.map(r => {
      if (r.id === restId) {
        return {
          ...r,
          sides: r.sides.map(s => s.id === sideId ? { ...s, [field]: value } : s)
        };
      }
      return r;
    }));
  };

  const handleDeleteSideItem = (restId: string, sideId: string) => {
    setIsRestaurantsEdited(true);
    setCustomRestaurants(prev => prev.map(r => {
      if (r.id === restId) {
        return {
          ...r,
          sides: r.sides.filter(s => s.id !== sideId)
        };
      }
      return r;
    }));
  };



  // Image zoom state
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Authenticate Admin via Backend API
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode })
      });
      const data = await response.json();
      if (data.success) {
        setIsAuthenticated(true);
        setAuthError('');
        localStorage.setItem('is_admin_logged', 'true');
      } else {
        setAuthError(t.adminAuthError);
      }
    } catch (err) {
      setAuthError(lang === 'zh' ? '验证服务器出错，请稍后重试' : 'Server verification error, please try again');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('is_admin_logged');
  };

  // Password change handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError('');
    setChangePasswordSuccess('');
    setIsChanging(true);

    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPasscode: currentPasswordInput,
          newPasscode: newPasswordInput
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setChangePasswordSuccess(lang === 'zh' ? '管理员口令已成功修改！' : 'Passcode successfully changed!');
        setCurrentPasswordInput('');
        setNewPasswordInput('');
        setTimeout(() => {
          setShowChangePassword(false);
          setChangePasswordSuccess('');
        }, 2000);
      } else {
        setChangePasswordError(data.error || (lang === 'zh' ? '修改失败' : 'Failed to modify'));
      }
    } catch (err) {
      setChangePasswordError(lang === 'zh' ? '网络错误，请稍后重试' : 'Network error');
    } finally {
      setIsChanging(false);
    }
  };



  // Export to CSV with BOM to avoid Excel encoding issues
  const handleExportCSV = () => {
    const BOM = '\uFEFF';
    const headers = [
      t.csvColId, 
      t.csvColDate, 
      lang === 'zh' ? '厂区' : lang === 'en' ? 'Plant' : 'Loji',
      t.csvColName, 
      t.csvColMeal, 
      t.csvColPrice, 
      t.csvColIsPaid, 
      t.csvColPlatform, 
      t.csvColPaymentTime,
      t.csvColIsVerified,
      t.csvColTime
    ];
    
    const rows = orders.map((o) => [
      o.id,
      o.date,
      o.plant || 'Plant1',
      o.name,
      o.mealType === 'chicken_rice' ? t.chickenRiceTitle : t.mixedRiceTitle,
      o.price,
      o.isPaid ? t.statusPaid : t.statusUnpaid,
      o.paymentPlatform || '-',
      o.paymentTime ? new Date(o.paymentTime).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US') : (o.isPaid ? '已付款' : '-'),
      o.isAdminVerified 
        ? (lang === 'zh' ? '已复核' : lang === 'en' ? 'Verified' : 'Disahkan') 
        : (lang === 'zh' ? '待复核' : lang === 'en' ? 'Pending' : 'Belum Disahkan'),
      new Date(o.createdAt).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US')
    ]);

    const csvContent = BOM + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${t.csvFilenamePrefix}${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter orders for administration list
  const filteredAdminOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch = adminSearchTerm.trim() === '' || 
        o.name.toLowerCase().includes(adminSearchTerm.toLowerCase().trim()) ||
        (o.mealName && o.mealName.toLowerCase().includes(adminSearchTerm.toLowerCase().trim())) ||
        (o.restaurantName && o.restaurantName.toLowerCase().includes(adminSearchTerm.toLowerCase().trim()));

      if (!matchesSearch) return false;

      // Exact date filter takes priority if picked
      if (adminDateFilter) {
        return o.date === adminDateFilter;
      }

      // Plant filter
      if (adminPlantFilter !== 'all') {
        const isP2 = o.plant === 'Plant2';
        if (adminPlantFilter === 'Plant2' && !isP2) return false;
        if (adminPlantFilter === 'Plant1' && isP2) return false;
      }

      // Time Scope filter (defaults to 'week')
      if (adminTimeScope === 'week') {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneWeekAgoStr = oneWeekAgo.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
        return o.date >= oneWeekAgoStr;
      } else if (adminTimeScope === 'today') {
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
        return o.date === todayStr;
      } else if (adminTimeScope === 'month') {
        const now = new Date();
        const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        const oneMonthAgoStr = oneMonthAgo.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
        return o.date >= oneMonthAgoStr;
      }

      return true;
    });
  }, [orders, adminSearchTerm, adminDateFilter, adminTimeScope, adminPlantFilter]);

  // Sort orders descending by date, then creation time
  const sortedAdminOrders = useMemo(() => {
    return [...filteredAdminOrders].sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [filteredAdminOrders]);

  // Pagination calculations
  const totalAdminPages = Math.max(1, Math.ceil(sortedAdminOrders.length / adminPageSize));
  const safeAdminPage = Math.min(Math.max(1, adminPage), totalAdminPages);
  const startAdminIndex = (safeAdminPage - 1) * adminPageSize;
  const paginatedAdminOrders = sortedAdminOrders.slice(startAdminIndex, startAdminIndex + adminPageSize);

  // Calculate sum of filtered selection
  const filteredSum = filteredAdminOrders.reduce((sum, o) => sum + o.price, 0);

  // Format ISO timestamp to Penang (Asia/Kuala_Lumpur) date & time (YYYY-MM-DD HH:mm)
  const formatPenangDateTime = (createdAtStr?: string) => {
    if (!createdAtStr) return '--';
    try {
      const d = new Date(createdAtStr);
      if (isNaN(d.getTime())) return '--';
      const datePart = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
      const timePart = d.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Kuala_Lumpur',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      return `${datePart} ${timePart}`;
    } catch (e) {
      return '--';
    }
  };

  // Lockscreen interface if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-2xl p-8 shadow-md border border-slate-100 text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">{t.adminAuthTitle}</h2>
        <p className="text-xs text-slate-400 mb-6">
          {t.adminAuthSubtitle}
        </p>

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              {t.adminAuthInputLabel}
            </label>
            <input
              type="password"
              placeholder={t.adminAuthPlaceholder}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-center tracking-widest font-mono"
            />
          </div>

          {authError && (
            <p className="text-xs text-rose-500 text-center font-medium">{authError}</p>
          )}

          <button
            type="submit"
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <Unlock className="w-4 h-4" />
            {t.adminAuthUnlockBtn}
          </button>

          {onBackToOrder && (
            <button
              type="button"
              onClick={onBackToOrder}
              className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-800 font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{lang === 'zh' ? '返回点餐系统主页' : 'Back to Ordering'}</span>
            </button>
          )}
        </form>
      </div>
    );
  }

  // Admin Dashboard Content
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Admin Panel Header Banner */}
      <div className="bg-slate-800 text-white rounded-2xl p-6 shadow-md border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-700 text-rose-400 rounded-xl">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{t.adminTitle}</h2>
            <p className="text-xs text-slate-300">
              {t.adminSubtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onBackToOrder && (
            <button
              onClick={onBackToOrder}
              className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {lang === 'zh' ? '返回点餐' : 'Back to Ordering'}
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {t.adminExportBtn}
          </button>

          <button
            onClick={() => setShowChangePassword(true)}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Lock className="w-4 h-4" />
            {lang === 'zh' ? '修改密码' : 'Change Password'}
          </button>
          
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-xl transition-colors"
          >
            {t.adminLogoutBtn}
          </button>
        </div>
      </div>



      {/* CARD 0: Database Backup, Export & Restore */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                <FileArchive className="w-4 h-4" />
              </span>
              数据备份与归档还原 (Data Backup & Restore)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              可随时导出全量数据库 JSON 格式备份，或导入以往备份数据一键恢复全部订餐与划款记录
            </p>
          </div>

          {backupMsg && (
            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
              backupMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {backupMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
              <span>{backupMsg.text}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Export Full JSON Backup */}
          <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-blue-600" />
              1. 导出全量 JSON 数据库备份
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              下载包含所有员工订餐明细、打款公示记录及汇率参数的最新全量备份文件。
            </p>
            <button
              onClick={handleExportDatabase}
              className="mt-2 w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              导出并下载 JSON 备份文件
            </button>
          </div>

          {/* Import JSON Backup */}
          <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-emerald-600" />
              2. 从 JSON 备份文件还原数据
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              选择之前导出的 JSON 备份文件，系统将自动对比并无缝还原所有丢失数据。
            </p>
            <label className="mt-2 w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer text-center block">
              {isRestoringDb ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isRestoringDb ? '正在恢复数据...' : '上传 JSON 文件还原数据库'}
              <input
                type="file"
                accept=".json"
                className="hidden"
                disabled={isRestoringDb}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportDatabase(file);
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* CARD 0.5: Full-Site Visitor Passcode Settings */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="p-1.5 bg-rose-100 text-rose-600 rounded-lg">
                <KeyRound className="w-4 h-4" />
              </span>
              {lang === 'zh' ? '全站团队访问口令设置 (Visitor Passcode)' : 'Team Visitor Passcode Settings'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {lang === 'zh' 
                ? '员工访问点餐前必须输入此口令，有效隔离无关人员并保护员工姓名隐私。您可在此随时更改并通知内部同事。' 
                : 'Protects employee data and privacy. Employees must enter this passcode before accessing the ordering system.'}
            </p>
          </div>

          {visitorPasscodeMsg && (
            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-fade-in ${
              visitorPasscodeMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {visitorPasscodeMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
              <span>{visitorPasscodeMsg.text}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleUpdateVisitorPasscode} className="bg-slate-50/80 p-5 rounded-xl border border-slate-200/70 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  {lang === 'zh' ? '当前团队访问口令' : 'Current Passcode'}
                </label>
                <span className="text-[11px] font-mono px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded-md">
                  {currentVisitorPasscode || 'wucan'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {lang === 'zh' 
                  ? '合作餐厅的“对账专属链接”自带签名参数，无需输入此口令即可直接安全核对账单。' 
                  : 'Partner restaurant audit links are not affected and remain directly accessible.'}
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newVisitorPasscodeInput}
                onChange={(e) => setNewVisitorPasscodeInput(e.target.value)}
                placeholder={lang === 'zh' ? '设置新团队访问口令...' : 'Enter new passcode...'}
                className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                required
              />
              <button
                type="submit"
                disabled={isUpdatingVisitorPasscode}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                {isUpdatingVisitorPasscode ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{lang === 'zh' ? '保存新口令' : 'Save Passcode'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* CARD 1: Batch Export & Share Payment Receipts by Restaurant */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="p-1.5 bg-rose-100 text-rose-600 rounded-lg">
                <FileArchive className="w-4 h-4" />
              </span>
              {t.batchShareTitle || '按餐厅一键分享/下载支付截图'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {t.batchShareSubtitle || '按不同餐厅、按日期将员工支付截图一键打包ZIP或直接分享给餐厅老板（媒体分享仅限单一餐厅）'}
            </p>
          </div>

          {batchCopiedToast && (
            <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-1.5 animate-fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{batchCopiedToast}</span>
            </div>
          )}
        </div>

        {/* Filters & Selector Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/60">
          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {t.batchShareSelectDate || '选择查看日期'}
            </label>
            <input
              type="date"
              value={batchExportDate}
              onChange={(e) => setBatchExportDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          <div className="md:col-span-8">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-rose-500" />
              {t.batchShareSelectRestaurant || '选择要汇总的餐厅 (不可跨餐厅合并)'}
            </label>
            <div className="flex flex-wrap gap-2">
              {activeRestaurantsList.map(rest => {
                const isSelected = batchExportRestId === rest.id;
                const restCount = orders.filter(o => 
                  o.date === batchExportDate && 
                  (o.restaurantId === rest.id || (!o.restaurantId && rest.id === 'A')) &&
                  o.isPaid && o.receiptUrl
                ).length;

                return (
                  <button
                    key={rest.id}
                    type="button"
                    onClick={() => setBatchExportRestId(rest.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-500/20'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{rest.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {restCount} {lang === 'zh' ? '张' : 'receipts'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Batch Status Summary Panel */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shrink-0">
              <FileArchive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">
                  {batchExportDate} | {activeRestaurantsList.find(r => r.id === batchExportRestId)?.name || batchExportRestId}
                </span>
                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-md">
                  订餐总数: {selectedRestOrders.length} 份
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">
                  {t.batchSharePaidCount || '已付凭证'}: {batchOrdersWithReceipts.length}
                </span>
              </div>
              <p className="text-sm font-black text-slate-800 mt-0.5">
                订餐总额: <span className="text-rose-600 font-bold mr-3">RM {selectedRestTotalAmount.toFixed(2)}</span>
                <span className="text-slate-500 text-xs">({t.batchShareTotalAmount || '凭证额'}: RM {batchTotalAmount.toFixed(2)})</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              disabled={selectedRestOrders.length === 0}
              onClick={handleCopyAuditLink}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              🔗 复制对账专属链接
            </button>

            <button
              type="button"
              disabled={selectedRestOrders.length === 0}
              onClick={handleWhatsAppShare}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-emerald-100" />
              📲 WhatsApp 分享总览
            </button>

            <button
              type="button"
              disabled={batchOrdersWithReceipts.length === 0 || isZipping}
              onClick={handleDownloadZip}
              className="flex-1 sm:flex-none px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              {isZipping ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FileArchive className="w-4 h-4 text-rose-400" />
              )}
              {isZipping ? (t.batchShareZipZipping || '打包中...') : (t.batchShareZipBtn || '📦 打包 ZIP')}
            </button>

            <button
              type="button"
              disabled={selectedRestOrders.length === 0}
              onClick={handleCopySummaryText}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="复制包含套餐名称、数量和金额的文字明细"
            >
              <Copy className="w-4 h-4 text-slate-500" />
              📋 复制套餐明细与金额汇总
            </button>

            {batchOrdersWithReceipts.length > 0 && (
              <button
                type="button"
                onClick={() => setShowBatchGalleryModal(true)}
                className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                {t.batchShareGalleryBtn?.replace('{count}', String(batchOrdersWithReceipts.length)) || `🖼️ 预览图集 (${batchOrdersWithReceipts.length})`}
              </button>
            )}
          </div>
        </div>

        {batchOrdersWithReceipts.length === 0 && (
          <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            {t.batchShareNoScreenshots || '所选日期及餐厅暂无已上传的员工支付截图'}
          </div>
        )}
      </div>

      {/* CARD 2: Restaurant & Menu Management Module */}
      <RestaurantManager
        lang={lang}
        rmbRates={rmbRates}
        onUpdate={() => {
          if (onUpdateRates) onUpdateRates();
        }}
      />



      {/* Full Database Orders Auditor Table */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
              <span>📋</span>
              {t.adminAuditorTitle}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {t.adminAuditorSubtitle.replace('{count}', filteredAdminOrders.length.toString())} <span className="font-bold text-rose-500">RM {filteredSum.toFixed(2)}</span>
              {totalAdminPages > 1 && (
                <span className="ml-2 text-slate-500 font-medium">
                  ({lang === 'zh' ? `第 ${safeAdminPage} / ${totalAdminPages} 页` : `Page ${safeAdminPage} of ${totalAdminPages}`})
                </span>
              )}
            </p>
          </div>

          {/* Time Scope Quick Filters */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => {
                setAdminTimeScope('week');
                setAdminDateFilter('');
                setAdminPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                adminTimeScope === 'week' && !adminDateFilter
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📅 {lang === 'zh' ? '最近一周 (默认)' : lang === 'en' ? 'Past 7 Days' : '7 Hari Lalu'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdminTimeScope('today');
                setAdminDateFilter('');
                setAdminPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                adminTimeScope === 'today' && !adminDateFilter
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'zh' ? '今日' : lang === 'en' ? 'Today' : 'Hari Ini'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdminTimeScope('month');
                setAdminDateFilter('');
                setAdminPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                adminTimeScope === 'month' && !adminDateFilter
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'zh' ? '近30天' : lang === 'en' ? 'Past 30 Days' : '30 Hari Lalu'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdminTimeScope('all');
                setAdminDateFilter('');
                setAdminPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                adminTimeScope === 'all' && !adminDateFilter
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'zh' ? '全部历史' : lang === 'en' ? 'All History' : 'Semua Sejarah'}
            </button>
          </div>
        </div>

        {/* Filters and Search Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 p-3 bg-slate-50/70 rounded-xl border border-slate-200/60">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t.adminAuditorSearch}
                value={adminSearchTerm}
                onChange={(e) => {
                  setAdminSearchTerm(e.target.value);
                  setAdminPage(1);
                }}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 w-44"
              />
            </div>

            {/* Specific Date Picker */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">{lang === 'zh' ? '指定日期:' : 'Date:'}</span>
              <input
                type="date"
                value={adminDateFilter}
                onChange={(e) => {
                  setAdminDateFilter(e.target.value);
                  setAdminPage(1);
                }}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            {/* Plant Selector */}
            <select
              value={adminPlantFilter}
              onChange={(e) => {
                setAdminPlantFilter(e.target.value);
                setAdminPage(1);
              }}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer"
            >
              <option value="all">🏢 {lang === 'zh' ? '全部厂区' : 'All Plants'}</option>
              <option value="Plant1">🏭 {lang === 'zh' ? '一厂 (Plant 1)' : 'Plant 1'}</option>
              <option value="Plant2">🏢 {lang === 'zh' ? '二厂 (Plant 2)' : 'Plant 2'}</option>
            </select>

            {/* Reset Filters */}
            {(adminSearchTerm || adminDateFilter || adminPlantFilter !== 'all' || adminTimeScope !== 'week') && (
              <button
                type="button"
                onClick={() => {
                  setAdminSearchTerm('');
                  setAdminDateFilter('');
                  setAdminPlantFilter('all');
                  setAdminTimeScope('week');
                  setAdminPage(1);
                }}
                className="text-xs text-rose-500 hover:text-rose-700 font-bold px-2 py-1 hover:bg-rose-50 rounded-lg transition-colors"
              >
                {lang === 'zh' ? '重置全部筛选' : 'Reset Filters'}
              </button>
            )}
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{lang === 'zh' ? '每页显示:' : 'Per page:'}</span>
            <select
              value={adminPageSize}
              onChange={(e) => {
                setAdminPageSize(Number(e.target.value));
                setAdminPage(1);
              }}
              className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer font-medium"
            >
              <option value={15}>15 {lang === 'zh' ? '条' : 'items'}</option>
              <option value={20}>20 {lang === 'zh' ? '条' : 'items'}</option>
              <option value={50}>50 {lang === 'zh' ? '条' : 'items'}</option>
              <option value={100}>100 {lang === 'zh' ? '条' : 'items'}</option>
            </select>
          </div>
        </div>

        {/* Verification & Reconciliation Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 text-center">
            <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-0.5">
              {lang === 'zh' ? '已付款且已复核' : lang === 'en' ? 'Paid & Verified' : 'Dibayar & Sah'}
            </div>
            <div className="text-lg font-black text-emerald-700">
              {filteredAdminOrders.filter(o => o.isPaid && o.isAdminVerified).length} / {filteredAdminOrders.length} {t.peopleUnit}
            </div>
            <div className="text-[11px] text-emerald-600/80 font-medium">
              RM {filteredAdminOrders.filter(o => o.isPaid && o.isAdminVerified).reduce((sum, o) => sum + o.price, 0).toFixed(2)}
            </div>
          </div>

          <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 text-center">
            <div className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mb-0.5">
              {lang === 'zh' ? '已付款待财务复核' : lang === 'en' ? 'Paid but Pending Audit' : 'Dibayar tapi Belum Sah'}
            </div>
            <div className="text-lg font-black text-amber-700">
              {filteredAdminOrders.filter(o => o.isPaid && !o.isAdminVerified).length} {t.peopleUnit}
            </div>
            <div className="text-[11px] text-amber-600/80 font-medium">
              RM {filteredAdminOrders.filter(o => o.isPaid && !o.isAdminVerified).reduce((sum, o) => sum + o.price, 0).toFixed(2)}
            </div>
          </div>

          <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3 text-center">
            <div className="text-[10px] text-rose-600 font-bold uppercase tracking-wider mb-0.5">
              {lang === 'zh' ? '未付款/待催缴' : lang === 'en' ? 'Unpaid / Overdue' : 'Belum Dibayar'}
            </div>
            <div className="text-lg font-black text-rose-700">
              {filteredAdminOrders.filter(o => !o.isPaid).length} {t.peopleUnit}
            </div>
            <div className="text-[11px] text-rose-600/80 font-medium">
              RM {filteredAdminOrders.filter(o => !o.isPaid).reduce((sum, o) => sum + o.price, 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Database orders table */}
        {filteredAdminOrders.length === 0 ? (
          <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-400 font-medium">{t.adminAuditorEmpty}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">{t.adminAuditorColDate}</th>
                    <th className="py-3 px-4">🏢 {lang === 'zh' ? '厂区' : lang === 'en' ? 'Plant' : 'Loji'}</th>
                    <th className="py-3 px-4">{t.adminAuditorColName}</th>
                    <th className="py-3 px-4">{t.tableColTime}</th>
                    <th className="py-3 px-4">{t.adminAuditorColMeal}</th>
                    <th className="py-3 px-4">{t.adminAuditorColPrice}</th>
                    <th className="py-3 px-4">{t.adminAuditorColStatus}</th>
                    <th className="py-3 px-4">📸 {lang === 'zh' ? '支付记录' : lang === 'en' ? 'Payment Record' : 'Rekod Bayaran'}</th>
                    <th className="py-3 px-4">💳 {t.adminAuditorColPaymentTime}</th>
                    <th className="py-3 px-4">🧐 {lang === 'zh' ? '财务复核' : lang === 'en' ? 'Finance Verify' : 'Sahkan Kewangan'}</th>
                    <th className="py-3 px-4 text-right">{t.adminAuditorColAction}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedAdminOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-500">
                        {order.date}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          order.plant === 'Plant2'
                            ? 'bg-purple-50 text-purple-700 border border-purple-100'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                        }`}>
                          🏢 {order.plant || 'Plant1'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {order.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200/60 whitespace-nowrap" title={lang === 'zh' ? '员工下单登记时间' : 'Order registration time'}>
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          {formatPenangDateTime(order.createdAt)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-medium text-slate-700">
                            {order.mealName || (order.mealType === 'chicken_rice' ? '🍗 ' + t.chickenRiceTitle : '🍱 ' + t.mixedRiceTitle)}
                          </span>
                          {order.restaurantName && (
                            <span className="block text-[10px] text-slate-400">
                              {order.restaurantName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                        RM {order.price.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const nextIsPaid = !order.isPaid;
                                const response = await fetch(`/api/orders/${order.id}/receipt`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ 
                                    isPaid: nextIsPaid,
                                    paymentTime: nextIsPaid ? (order.paymentTime || new Date().toISOString()) : ''
                                  })
                                });
                                if (response.ok) {
                                  onOrderSubmitted();
                                }
                              } catch (err) {
                                console.error('Failed to update payment status:', err);
                              }
                            }}
                            className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer shadow-2xs ${
                              order.isPaid
                                ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                                : 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100'
                            }`}
                            title="点击直接修改支付状态"
                          >
                            {order.isPaid ? `✅ ${t.statusPaid}` : `⏳ ${t.statusUnpaid}`}
                          </button>

                          <select
                            value={order.paymentPlatform || 'Restaurant'}
                            onChange={async (e) => {
                              try {
                                const response = await fetch(`/api/orders/${order.id}/receipt`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ paymentPlatform: e.target.value })
                                });
                                if (response.ok) {
                                  onOrderSubmitted();
                                }
                              } catch (err) {
                                console.error('Failed to update platform:', err);
                              }
                            }}
                            className="block text-[10px] font-medium bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                          >
                            <option value="Restaurant">🍽️ 直接付餐厅</option>
                            <option value="WeChat">🟢 微信支付</option>
                            <option value="TNG">🔵 Touch 'n Go</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {order.receiptUrl ? (
                          <button
                            onClick={() => setPreviewImage(order.receiptUrl!)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            <img src={order.receiptUrl} alt="Receipt" className="w-5 h-5 rounded object-cover" />
                            <span>查看凭证</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-300 italic">未上传</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {order.paymentTime ? (
                          <span 
                            className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70 whitespace-nowrap" 
                            title={lang === 'zh' ? '员工上传支付凭证/标记付款时间' : 'Employee payment proof upload timestamp'}
                          >
                            <Clock className="w-3 h-3 text-emerald-500 shrink-0" />
                            {formatPenangDateTime(order.paymentTime)}
                          </span>
                        ) : order.isPaid ? (
                          <span 
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 whitespace-nowrap" 
                            title={lang === 'zh' ? '已付款（早期数据以登记时间为准）' : 'Paid (using registration timestamp)'}
                          >
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            {formatPenangDateTime(order.createdAt)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-300 italic">--</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/orders/${order.id}/verify`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ isAdminVerified: !order.isAdminVerified })
                              });
                              if (response.ok) {
                                onOrderSubmitted(); // Refresh parent states & list
                              }
                            } catch (err) {
                              console.error('Failed to verify order:', err);
                            }
                          }}
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                            order.isAdminVerified
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/10'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {order.isAdminVerified ? '✅ ' + (lang === 'zh' ? '已复核' : lang === 'en' ? 'Verified' : 'Disahkan') : '⏳ ' + (lang === 'zh' ? '待复核' : lang === 'en' ? 'Verify' : 'Sahkan')}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            if (confirm(t.adminAuditorDeleteConfirm.replace('{date}', order.date).replace('{name}', order.name))) {
                              onDeleteOrder(order.id);
                            }
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 font-bold px-2 py-1 rounded transition-colors"
                        >
                          {t.adminAuditorDeleteBtn}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalAdminPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 text-xs">
                <div className="text-slate-500 font-medium">
                  {lang === 'zh' 
                    ? `显示第 ${startAdminIndex + 1} - ${Math.min(startAdminIndex + adminPageSize, sortedAdminOrders.length)} 条，共 ${sortedAdminOrders.length} 条数据`
                    : `Showing ${startAdminIndex + 1} to ${Math.min(startAdminIndex + adminPageSize, sortedAdminOrders.length)} of ${sortedAdminOrders.length} orders`}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* First Page */}
                  <button
                    type="button"
                    onClick={() => setAdminPage(1)}
                    disabled={safeAdminPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    title={lang === 'zh' ? '首页' : 'First Page'}
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>

                  {/* Previous Page */}
                  <button
                    type="button"
                    onClick={() => setAdminPage(p => Math.max(1, p - 1))}
                    disabled={safeAdminPage === 1}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-1 font-medium"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>{lang === 'zh' ? '上一页' : 'Prev'}</span>
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1 mx-1">
                    {Array.from({ length: totalAdminPages }, (_, i) => i + 1)
                      .filter(pageNum => {
                        if (totalAdminPages <= 7) return true;
                        if (pageNum === 1 || pageNum === totalAdminPages) return true;
                        return Math.abs(pageNum - safeAdminPage) <= 1;
                      })
                      .map((pageNum, idx, arr) => {
                        const prevNum = arr[idx - 1];
                        const showEllipsisBefore = prevNum && pageNum - prevNum > 1;

                        return (
                          <React.Fragment key={pageNum}>
                            {showEllipsisBefore && (
                              <span className="px-1 text-slate-400 select-none">...</span>
                            )}
                            <button
                              type="button"
                              onClick={() => setAdminPage(pageNum)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                pageNum === safeAdminPage
                                  ? 'bg-rose-500 text-white shadow-xs'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  {/* Next Page */}
                  <button
                    type="button"
                    onClick={() => setAdminPage(p => Math.min(totalAdminPages, p + 1))}
                    disabled={safeAdminPage === totalAdminPages}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-1 font-medium"
                  >
                    <span>{lang === 'zh' ? '下一页' : 'Next'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Last Page */}
                  <button
                    type="button"
                    onClick={() => setAdminPage(totalAdminPages)}
                    disabled={safeAdminPage === totalAdminPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    title={lang === 'zh' ? '尾页' : 'Last Page'}
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CARD: System Operations, Storage Capacity & Disaster Recovery Control Center */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                <ShieldAlert className="w-4 h-4" />
              </span>
              🛡️ 系统运维监控、存储容量预警与离线双重容灾
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              查看云端数据库状态、配置容量配额预警与 FIFO 自动覆盖策略、导出离线全量 JSON 数据库归档
            </p>
          </div>

          <button
            type="button"
            onClick={fetchSystemHealth}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            刷新运维状态
          </button>
        </div>

        {/* System Health Overview Grid */}
        {systemHealth && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Storage Engine Status */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">数据库持久化架构</span>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${systemHealth.isCloud ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="text-xs font-black text-slate-800">{systemHealth.storageMode}</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {systemHealth.isCloud 
                  ? `已与 Google Cloud Firestore (${systemHealth.projectId}) 保持双向通信，防止节点重启掉盘。` 
                  : '目前使用单机本地文件，建议接入 Firebase 云数据库实现多机容灾。'}
              </p>
            </div>

            {/* Record Capacity Gauge */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">存储容量使用率</span>
                <span className={`text-xs font-black font-mono ${systemHealth.isQuotaWarning ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {systemHealth.usagePercentage}% ({systemHealth.totalOrdersCount} / {systemHealth.maxOrdersLimit} 条)
                </span>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    systemHealth.usagePercentage >= 80 ? 'bg-rose-500' : systemHealth.usagePercentage >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${systemHealth.usagePercentage}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                估算内存占用: <span className="font-mono font-bold">{systemHealth.estimatedMemorySizeKb} KB</span>
              </p>
            </div>

            {/* FIFO Pruning Policy */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">容量超限防爆机制</span>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                {systemHealth.autoPruneEnabled ? (
                  <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px]">
                    ✅ 已开启 FIFO 自动覆盖 (覆盖最早数据)
                  </span>
                ) : (
                  <span className="text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[11px]">
                    ⚠️ 已关闭自动覆盖 (超限停止写入)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                当订单数达到上限 ({systemHealth.maxOrdersLimit}) 时，将自动清理历史最早订单，确保系统绝不因磁盘爆满宕机。
              </p>
            </div>
          </div>
        )}

        {/* System Settings & Threshold Form */}
        <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4 space-y-4">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <span>⚙️ 运维预警阈值与自动清理策略设置</span>
          </h4>

          {systemSettingMsg && (
            <div className={`p-3 rounded-xl text-xs font-bold border ${
              systemSettingMsg.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {systemSettingMsg.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                最大允许订单容积配额 (条数上限)
              </label>
              <input
                type="number"
                value={limitInput}
                onChange={(e) => setLimitInput(e.target.value)}
                placeholder="例如 5000"
                min="100"
                max="50000"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                推荐设置 3000 ~ 10000 条。超限时自动保护高频活跃数据。
              </p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPruneInput}
                  onChange={(e) => setAutoPruneInput(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                />
                <span>开启【容量爆满自动滑动覆盖最早数据】(FIFO)</span>
              </label>

              <button
                type="button"
                onClick={handleUpdateSystemSettings}
                disabled={isUpdatingHealthSettings}
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isUpdatingHealthSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>保存系统容量预警策略</span>
              </button>
            </div>
          </div>
        </div>

        {/* Full Database Export & Import Backup */}
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <span>💾 全量数据库离线 JSON 镜像备份与恢复</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                定期将全库导出保存到本地硬盘，可在更换机器或任何突发状况下一键一秒还原全部数据。
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportDatabase}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>📥 导出全量 JSON 备份</span>
              </button>

              <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>{isRestoringDb ? '恢复中...' : '📤 恢复 JSON 备份文件'}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportDatabase}
                  disabled={isRestoringDb}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {backupMsg && (
            <div className={`p-3 rounded-xl text-xs font-bold border ${
              backupMsg.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {backupMsg.text}
            </div>
          )}
        </div>
      </div>

      {/* Image Preview Lightbox */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <button 
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="max-w-2xl w-full max-h-[80vh] overflow-hidden rounded-xl bg-slate-900 flex items-center justify-center border border-slate-700">
            <img 
              src={previewImage} 
              alt={t.transferActionLabel} 
              className="max-h-[80vh] max-w-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-100 max-w-sm w-full mx-4 relative">
            <button
              onClick={() => {
                setShowChangePassword(false);
                setChangePasswordError('');
                setChangePasswordSuccess('');
              }}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-500" />
              {lang === 'zh' ? '修改管理员密码' : 'Change Admin Password'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {lang === 'zh' ? '请输入当前密码和新密码以进行更新' : 'Enter current and new passwords to update'}
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {lang === 'zh' ? '当前密码' : 'Current Password'}
                </label>
                <input
                  type="password"
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {lang === 'zh' ? '新密码 (最少4位)' : 'New Password (min 4 chars)'}
                </label>
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              {changePasswordError && (
                <p className="text-xs text-rose-500 text-center font-medium">{changePasswordError}</p>
              )}
              {changePasswordSuccess && (
                <p className="text-xs text-emerald-500 text-center font-medium">{changePasswordSuccess}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setChangePasswordError('');
                    setChangePasswordSuccess('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  {lang === 'zh' ? '取消' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isChanging}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isChanging ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  {lang === 'zh' ? '保存更改' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GALLERY MODAL FOR BATCH PAYMENT SCREENSHOTS */}
      {showBatchGalleryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>🖼️</span>
                  {batchExportDate} | {activeRestaurantsList.find(r => r.id === batchExportRestId)?.name} {lang === 'zh' ? '员工支付截图凭证' : 'Payment Screenshots'} (共 {batchOrdersWithReceipts.length} 张)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchGalleryModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {batchOrdersWithReceipts.map((o, idx) => (
                <div key={o.id} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden space-y-2 p-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-800">{idx + 1}. {o.name}</span>
                      <span className="font-black text-emerald-600">RM {o.price.toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-between mb-2">
                      <span className="truncate max-w-[130px]">{o.mealName || '套餐'}</span>
                      <span className="bg-slate-200/70 px-1.5 py-0.5 rounded text-slate-700 font-medium">{o.paymentPlatform || '已支付'}</span>
                    </div>
                  </div>
                  <div className="h-44 rounded-lg border border-slate-200 overflow-hidden bg-white relative group">
                    <img 
                      src={o.receiptUrl} 
                      alt={o.name} 
                      className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform" 
                      onClick={() => setPreviewImage(o.receiptUrl || null)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
