/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Order, AdminTransfer, RmbRates, APP_BASE_URL } from '../types';
import { translations, Language } from '../i18n';
import { 
  getActiveRestaurants, 
  getLocalizedRestaurantName, 
  formatLocalizedMealName, 
  formatLocalizedSideItem 
} from '../data/menu';

import { 
  BarChart3, 
  Calendar, 
  Search, 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  Sparkles, 
  User, 
  Clock,
  Filter,
  Check,
  Upload,
  X,
  AlertCircle,
  Store,
  Receipt,
  Eye,
  CheckCircle2,
  Image as ImageIcon,
  Link as LinkIcon,
  Share2,
  Copy,
  ExternalLink,
  MessageSquare
} from 'lucide-react';

interface StatsViewProps {
  lang?: Language;
  orders: Order[];
  rmbRates?: RmbRates;
  transfers?: AdminTransfer[];
  onOrderSubmitted?: () => void;
  onDeleteOrder?: (id: string) => void;
}

const RESTAURANT_PALETTE = [
  { name: 'rose', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', badgeBg: 'bg-rose-100 text-rose-800', fillClass: 'bg-rose-500', hex: '#f43f5e' },
  { name: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', badgeBg: 'bg-indigo-100 text-indigo-800', fillClass: 'bg-indigo-500', hex: '#6366f1' },
  { name: 'amber', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badgeBg: 'bg-amber-100 text-amber-800', fillClass: 'bg-amber-500', hex: '#f59e0b' },
  { name: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badgeBg: 'bg-emerald-100 text-emerald-800', fillClass: 'bg-emerald-500', hex: '#10b981' },
  { name: 'purple', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', badgeBg: 'bg-purple-100 text-purple-800', fillClass: 'bg-purple-500', hex: '#8b5cf6' },
  { name: 'cyan', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', badgeBg: 'bg-cyan-100 text-cyan-800', fillClass: 'bg-cyan-500', hex: '#06b6d4' },
  { name: 'orange', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', badgeBg: 'bg-orange-100 text-orange-800', fillClass: 'bg-orange-500', hex: '#f97316' },
  { name: 'pink', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', badgeBg: 'bg-pink-100 text-pink-800', fillClass: 'bg-pink-500', hex: '#ec4899' },
  { name: 'blue', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badgeBg: 'bg-blue-100 text-blue-800', fillClass: 'bg-blue-500', hex: '#3b82f6' },
  { name: 'teal', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', badgeBg: 'bg-teal-100 text-teal-800', fillClass: 'bg-teal-500', hex: '#14b8a6' },
];

export default function StatsView({ 
  lang = 'zh', 
  orders, 
  rmbRates, 
  transfers = [], 
  onOrderSubmitted 
}: StatsViewProps) {
  const t = translations[lang];

  // Personal name search to filter stats
  const [personalName, setPersonalName] = useState('');
  // Time scope: 'all' | 'today' | 'week' | 'month'
  const [timeScope, setTimeScope] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Filters specifically for the Unpaid Orders table
  const [unpaidSearchTerm, setUnpaidSearchTerm] = useState('');
  const [unpaidPlantFilter, setUnpaidPlantFilter] = useState<string>('all');
  const [unpaidRestaurantFilter, setUnpaidRestaurantFilter] = useState<string>('all');
  const [unpaidDateFilter, setUnpaidDateFilter] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const d = params.get('date') || params.get('unpaidDate');
      if (d) return d;
    }
    return 'all';
  });
  const [customUnpaidDate, setCustomUnpaidDate] = useState<string>('');
  const [showUnpaidShareModal, setShowUnpaidShareModal] = useState(false);
  const [unpaidCopiedToast, setUnpaidCopiedToast] = useState<string | null>(null);

  // Helper date strings
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Compute distinct dates that contain unpaid orders
  const unpaidDatesSummary = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach(o => {
      if (!o.isPaid && o.date) {
        map.set(o.date, (map.get(o.date) || 0) + 1);
      }
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [orders]);

  // Handle URL deep-link for unpaid view on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      const section = params.get('section');
      const dateParam = params.get('date') || params.get('unpaidDate');
      const plantParam = params.get('plant');
      const restParam = params.get('restaurant') || params.get('restId');

      if (dateParam) setUnpaidDateFilter(dateParam);
      if (plantParam) setUnpaidPlantFilter(plantParam);
      if (restParam) setUnpaidRestaurantFilter(restParam);

      if (view === 'unpaid' || section === 'unpaid' || dateParam) {
        setTimeout(() => {
          const el = document.getElementById('unpaid-orders-section');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300);
      }
    }
  }, []);

  // Receipt Modal and Lightbox states
  const [receiptModalOrder, setReceiptModalOrder] = useState<Order | null>(null);
  const [receiptFormPlatform, setReceiptFormPlatform] = useState<string>('WeChat');
  const [receiptFormImage, setReceiptFormImage] = useState<string>('');
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // 1. Compute ALL active & discovered restaurants dynamically (No limit to 3!)
  const allRestaurants = useMemo(() => {
    const list = getActiveRestaurants(rmbRates?.customRestaurants, rmbRates);
    const existingIds = new Set(list.map(r => r.id));

    // Also include any restaurantId or restaurantName in historical orders not in standard menu
    orders.forEach((o) => {
      const rId = o.restaurantId || 'A';
      if (!existingIds.has(rId)) {
        existingIds.add(rId);
        list.push({
          id: rId,
          name: o.restaurantName || `Restaurant ${rId}`,
          nameEn: o.restaurantName || `Restaurant ${rId}`,
          nameMs: o.restaurantName || `Restoran ${rId}`,
          desc: '',
          descEn: '',
          descMs: '',
          mains: [],
          sides: []
        });
      }
    });

    return list.map((rest, index) => {
      const palette = RESTAURANT_PALETTE[index % RESTAURANT_PALETTE.length];
      return {
        ...rest,
        palette
      };
    });
  }, [rmbRates, orders]);

  // Restaurant ID to Palette map for fast lookups
  const restaurantColorMap = useMemo(() => {
    const map = new Map<string, typeof RESTAURANT_PALETTE[0]>();
    allRestaurants.forEach(r => {
      map.set(r.id, r.palette);
    });
    return map;
  }, [allRestaurants]);

  // Filter orders based on overall query and time scope
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Filter by name if entered
    if (personalName.trim()) {
      result = result.filter((o) => 
        o.name.toLowerCase().includes(personalName.toLowerCase().trim())
      );
    }

    // Filter by date range if specified
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (timeScope === 'today') {
      result = result.filter((o) => o.date === todayStr);
    } else if (timeScope === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      result = result.filter((o) => new Date(o.date) >= oneWeekAgo);
    } else if (timeScope === 'month') {
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      result = result.filter((o) => new Date(o.date) >= oneMonthAgo);
    }

    return result;
  }, [orders, personalName, timeScope]);

  // Dynamic Restaurant Breakdown & KPI calculations across ALL restaurants
  const { 
    totalOrders, 
    totalAmount, 
    paid, 
    unpaid, 
    restaurantBreakdown 
  } = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalAmount = filteredOrders.reduce((sum, o) => sum + o.price, 0);
    const paid = filteredOrders.filter((o) => o.isPaid).length;
    const unpaid = totalOrders - paid;

    // Calculate per-restaurant breakdown for ALL restaurants
    const breakdown = allRestaurants.map((rest) => {
      const restOrders = filteredOrders.filter((o) => {
        if (rest.id === 'A') {
          return o.restaurantId === 'A' || o.restaurantId === 'rest_a' || !o.restaurantId;
        }
        return o.restaurantId === rest.id || (o.restaurantName && o.restaurantName.includes(rest.name));
      });

      const count = restOrders.length;
      const amount = restOrders.reduce((sum, o) => sum + o.price, 0);
      const paidCount = restOrders.filter(o => o.isPaid).length;
      const unpaidCount = count - paidCount;
      const percent = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;

      return {
        restaurant: rest,
        count,
        amount,
        paidCount,
        unpaidCount,
        percent,
        palette: rest.palette
      };
    });

    return {
      totalOrders,
      totalAmount,
      paid,
      unpaid,
      restaurantBreakdown: breakdown
    };
  }, [filteredOrders, allRestaurants]);

  // Dynamic Daily Chart Data for ALL restaurants (Stacked Bar)
  const { dailyChartData, maxDailyValue } = useMemo(() => {
    const countsByDate: { [date: string]: { [restId: string]: number; total: number } } = {};

    filteredOrders.forEach((o) => {
      if (!countsByDate[o.date]) {
        countsByDate[o.date] = { total: 0 };
        allRestaurants.forEach(r => {
          countsByDate[o.date][r.id] = 0;
        });
      }
      const rId = o.restaurantId || 'A';
      if (countsByDate[o.date][rId] !== undefined) {
        countsByDate[o.date][rId] += 1;
      } else {
        countsByDate[o.date]['A'] = (countsByDate[o.date]['A'] || 0) + 1;
      }
      countsByDate[o.date].total += 1;
    });

    const sortedDates = Object.keys(countsByDate).sort().slice(-10); // last 10 active dates

    const chartData = sortedDates.map((date) => {
      const entry = countsByDate[date];
      return {
        date: date.substring(5), // MM-DD
        fullDate: date,
        total: entry.total,
        restCounts: allRestaurants.map(r => ({
          restId: r.id,
          name: getLocalizedRestaurantName(r, lang),
          count: entry[r.id] || 0,
          palette: r.palette
        }))
      };
    });

    const maxVal = chartData.length > 0 ? Math.max(...chartData.map(d => d.total)) : 10;
    const scaledMax = maxVal < 5 ? 5 : maxVal;

    return { dailyChartData: chartData, maxDailyValue: scaledMax };
  }, [filteredOrders, allRestaurants, lang]);

  // Unpaid Orders List (Filtered and Sorted)
  const filteredUnpaidOrders = useMemo(() => {
    // 1. Start from all unpaid orders or filtered by personal name
    let unpaids = orders.filter(o => !o.isPaid);

    // Apply personal name filter if set at top level
    if (personalName.trim()) {
      const pName = personalName.toLowerCase().trim();
      unpaids = unpaids.filter(o => o.name.toLowerCase().includes(pName));
    }

    // 2. Apply Unpaid Date filter
    if (unpaidDateFilter !== 'all') {
      if (unpaidDateFilter === 'today') {
        unpaids = unpaids.filter(o => o.date === todayStr);
      } else if (unpaidDateFilter === 'except_today') {
        unpaids = unpaids.filter(o => o.date !== todayStr);
      } else if (unpaidDateFilter === 'tomorrow') {
        unpaids = unpaids.filter(o => o.date === tomorrowStr);
      } else if (unpaidDateFilter === 'yesterday') {
        unpaids = unpaids.filter(o => o.date === yesterdayStr);
      } else {
        unpaids = unpaids.filter(o => o.date === unpaidDateFilter);
      }
    } else if (timeScope !== 'all') {
      // If unpaidDateFilter is 'all' but top timeScope is active, respect top timeScope
      if (timeScope === 'today') {
        unpaids = unpaids.filter(o => o.date === todayStr);
      } else if (timeScope === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split('T')[0];
        unpaids = unpaids.filter(o => o.date >= weekAgoStr);
      } else if (timeScope === 'month') {
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        const monthAgoStr = monthAgo.toISOString().split('T')[0];
        unpaids = unpaids.filter(o => o.date >= monthAgoStr);
      }
    }

    // 3. Apply search filter
    if (unpaidSearchTerm.trim()) {
      const term = unpaidSearchTerm.toLowerCase().trim();
      unpaids = unpaids.filter(o => 
        o.name.toLowerCase().includes(term) ||
        (o.mealName && o.mealName.toLowerCase().includes(term)) ||
        (o.sideItems && o.sideItems.some(s => s.toLowerCase().includes(term))) ||
        (o.restaurantName && o.restaurantName.toLowerCase().includes(term))
      );
    }

    // 4. Apply Plant filter
    if (unpaidPlantFilter !== 'all') {
      unpaids = unpaids.filter(o => 
        unpaidPlantFilter === 'Plant2' ? o.plant === 'Plant2' : (o.plant === 'Plant1' || !o.plant)
      );
    }

    // 5. Apply Restaurant filter
    if (unpaidRestaurantFilter !== 'all') {
      unpaids = unpaids.filter(o => 
        (o.restaurantId === unpaidRestaurantFilter) || (!o.restaurantId && unpaidRestaurantFilter === 'A')
      );
    }

    // Sort by Date Descending, then Creation time
    return unpaids.sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [
    orders, 
    personalName, 
    timeScope, 
    unpaidDateFilter, 
    todayStr, 
    tomorrowStr, 
    yesterdayStr, 
    unpaidSearchTerm, 
    unpaidPlantFilter, 
    unpaidRestaurantFilter
  ]);

  const unpaidTotalAmount = useMemo(() => {
    return filteredUnpaidOrders.reduce((sum, o) => sum + o.price, 0);
  }, [filteredUnpaidOrders]);

  // Generate shareable URL for unpaid orders module
  const generateUnpaidShareUrl = () => {
    const params = new URLSearchParams();
    params.set('tab', 'stats');
    params.set('view', 'unpaid');
    if (unpaidDateFilter !== 'all') {
      params.set('date', unpaidDateFilter);
    }
    if (unpaidPlantFilter !== 'all') {
      params.set('plant', unpaidPlantFilter);
    }
    if (unpaidRestaurantFilter !== 'all') {
      params.set('restaurant', unpaidRestaurantFilter);
    }
    return `${APP_BASE_URL}/?${params.toString()}`;
  };

  const handleCopyUnpaidLink = async () => {
    const url = generateUnpaidShareUrl();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setUnpaidCopiedToast(t.unpaidLinkCopiedToast || '✅ 未支付对账明细链接已复制！');
      setTimeout(() => setUnpaidCopiedToast(null), 3500);
    } catch (e) {
      console.error(e);
      setUnpaidCopiedToast('✅ 链接已生成：' + url);
      setTimeout(() => setUnpaidCopiedToast(null), 4000);
    }
  };

  // Generate WhatsApp / WeChat payment reminder notice text
  const generateUnpaidReminderText = () => {
    const url = generateUnpaidShareUrl();
    const dateLabel = unpaidDateFilter === 'all'
      ? (lang === 'zh' ? '全部未付历史' : lang === 'en' ? 'All Unpaid History' : 'Semua Rekod Belum Bayar')
      : unpaidDateFilter === 'except_today'
      ? (lang === 'zh' ? '除当天之外 (历史待付)' : lang === 'en' ? 'Excluding Today (Past & Other Dates)' : 'Kecuali Hari Ini')
      : unpaidDateFilter === 'today' ? `${todayStr} (${lang === 'zh' ? '今日' : 'Today'})`
      : unpaidDateFilter === 'tomorrow' ? `${tomorrowStr} (${lang === 'zh' ? '明日' : 'Tomorrow'})`
      : unpaidDateFilter === 'yesterday' ? `${yesterdayStr} (${lang === 'zh' ? '昨日' : 'Yesterday'})`
      : unpaidDateFilter;

    let msg = `📢【午餐订餐催缴与核对提醒】\n`;
    msg += `各位同事好，以下为午餐餐费尚未标记已付的明细记录，请大家核对并在付款后上传凭证或标记已付：\n`;
    msg += `─────────────────────\n`;
    msg += `📅 核对日期: ${dateLabel}\n`;
    msg += `👥 待付总数: ${filteredUnpaidOrders.length} 份 | 待付金额: RM ${unpaidTotalAmount.toFixed(2)}\n`;
    if (rmbRates) {
      msg += `💱 折合人民币: ≈ ¥ ${(unpaidTotalAmount * (rmbRates.exchangeRate ?? 1.6333)).toFixed(2)} RMB\n`;
    }
    msg += `─────────────────────\n`;

    if (filteredUnpaidOrders.length > 0) {
      msg += `📋 待付名单预览:\n`;
      filteredUnpaidOrders.slice(0, 15).forEach((o, i) => {
        msg += `${i + 1}. ${o.name} (${o.plant || 'Plant1'}) · ${o.date} [${o.restaurantName || '餐厅'}] RM ${o.price}\n`;
      });
      if (filteredUnpaidOrders.length > 15) {
        msg += `... 等共 ${filteredUnpaidOrders.length} 条待付记录\n`;
      }
      msg += `─────────────────────\n`;
    }

    msg += `👉 点击下方专属链接，可直接在线查看明细、上传付款截图或确认已付：\n`;
    msg += `${url}\n`;
    return msg;
  };

  const handleCopyUnpaidNotice = async () => {
    const text = generateUnpaidReminderText();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setUnpaidCopiedToast(t.unpaidNoticeCopiedToast || '✅ 催款提醒通知文案已复制！');
      setTimeout(() => setUnpaidCopiedToast(null), 3500);
    } catch (e) {
      console.error(e);
    }
  };

  // Platform helper
  const getPlatformLabel = (platform?: string) => {
    if (!platform) return '';
    if (platform === 'WeChat') return lang === 'en' ? 'WeChat Pay' : lang === 'ms' ? 'WeChat Pay' : '微信支付';
    if (platform === 'TNG') return lang === 'en' ? 'Touch \'n Go' : lang === 'ms' ? 'Touch \'n Go' : 'Touch \'n Go';
    if (platform.startsWith('Restaurant')) {
      return lang === 'en' ? 'Direct to Restaurant' : lang === 'ms' ? 'Terus ke Restoran' : '直付餐馆';
    }
    return platform;
  };

  const formatPenangDateTime = (createdAtStr?: string) => {
    if (!createdAtStr) return '--';
    try {
      const d = new Date(createdAtStr);
      if (isNaN(d.getTime())) return createdAtStr;
      return d.toLocaleString('zh-CN', {
        timeZone: 'Asia/Kuala_Lumpur',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return createdAtStr;
    }
  };

  const handleOpenReceiptModal = (order: Order) => {
    setReceiptModalOrder(order);
    setReceiptFormPlatform(order.paymentPlatform || 'WeChat');
    setReceiptFormImage(order.receiptUrl || '');
  };

  const handleSaveReceipt = async () => {
    if (!receiptModalOrder) return;
    setIsSubmittingReceipt(true);
    try {
      const response = await fetch(`/api/orders/${receiptModalOrder.id}/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPaid: true,
          paymentPlatform: receiptFormPlatform,
          receiptUrl: receiptFormImage,
          paymentTime: new Date().toISOString()
        })
      });

      if (response.ok) {
        setReceiptModalOrder(null);
        if (onOrderSubmitted) onOrderSubmitted();
      } else {
        alert(lang === 'zh' ? '更新付款凭证失败' : lang === 'en' ? 'Failed to update payment' : 'Gagal mengemas kini bayaran');
      }
    } catch (err) {
      console.error(err);
      alert(lang === 'zh' ? '网络请求出错' : lang === 'en' ? 'Network error' : 'Ralat rangkaian');
    } finally {
      setIsSubmittingReceipt(false);
    }
  };

  const handleQuickMarkPaid = async (order: Order) => {
    try {
      const response = await fetch(`/api/orders/${order.id}/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPaid: true,
          paymentTime: new Date().toISOString()
        })
      });
      if (response.ok && onOrderSubmitted) {
        onOrderSubmitted();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setReceiptFormImage(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-8">
      {/* 1. Search Header & Scope Filters */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5.5 h-5.5 text-rose-500" />
            {t.statsDashboardTitle}
          </h2>
          <p className="text-xs text-slate-400">
            {personalName ? t.statsUserDashboardSubtitle.replace('{name}', personalName) : t.statsDashboardSubtitle}
          </p>
        </div>

        {/* Filters Panel */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Name filter */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t.statsFilterNamePlaceholder}
              value={personalName}
              onChange={(e) => setPersonalName(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 w-full sm:w-56"
            />
            {personalName && (
              <button 
                type="button"
                onClick={() => setPersonalName('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                {t.statsFilterClear}
              </button>
            )}
          </div>

          {/* Time range switcher */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setTimeScope('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                timeScope === 'all'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.statsPeriodAll}
            </button>
            <button
              type="button"
              onClick={() => setTimeScope('today')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                timeScope === 'today'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {lang === 'zh' ? '今日' : lang === 'en' ? 'Today' : 'Hari Ini'}
            </button>
            <button
              type="button"
              onClick={() => setTimeScope('week')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                timeScope === 'week'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.statsPeriodWeek}
            </button>
            <button
              type="button"
              onClick={() => setTimeScope('month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                timeScope === 'month'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.statsPeriodMonth}
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Orders */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute right-4 top-4 text-3xl opacity-10 group-hover:scale-110 transition-transform">🛍️</div>
          <span className="text-xs font-semibold text-slate-400 block mb-1">
            {personalName ? t.statsKpiPersonalOrders : t.statsKpiOrders}
          </span>
          <div className="text-2xl font-black text-slate-800">
            {totalOrders} <span className="text-xs text-slate-400 font-normal">{t.portionUnit}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            {lang === 'zh' ? '统计范围' : lang === 'en' ? 'Scope' : 'Skop'}: {
              timeScope === 'all' ? t.statsPeriodAll : 
              timeScope === 'today' ? (lang === 'zh' ? '今日' : lang === 'en' ? 'Today' : 'Hari Ini') :
              timeScope === 'week' ? t.statsPeriodWeek : t.statsPeriodMonth
            }
          </div>
        </div>

        {/* Metric 2: Total Revenue */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute right-4 top-4 text-3xl opacity-10 group-hover:scale-110 transition-transform">💰</div>
          <span className="text-xs font-semibold text-slate-400 block mb-1">
            {personalName ? t.statsKpiPersonalAmount : t.statsKpiAmount}
          </span>
          <div className="text-2xl font-black text-rose-500">RM {totalAmount}</div>
          {rmbRates && (
            <div className="text-[11px] text-amber-700 font-bold mt-1.5 flex items-center gap-1">
              <span>≈ ¥ {(totalAmount * (rmbRates.exchangeRate ?? 1.6333)).toFixed(2)} RMB</span>
              <span className="text-[10px] text-slate-400 font-normal">({t.exchangeRateLabel}: {rmbRates.exchangeRate ?? 1.6333})</span>
            </div>
          )}
        </div>

        {/* Metric 3: Restaurant Distribution (ALL RESTAURANTS DISPLAYED DYNAMICALLY) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute right-4 top-4 text-3xl opacity-10 group-hover:scale-110 transition-transform">🏪</div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">
              {lang === 'en' ? 'All Restaurants Distribution' : lang === 'ms' ? 'Taburan Semua Restoran' : '合作餐馆分布 (全部)'}
            </span>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              {allRestaurants.length} {lang === 'zh' ? '家' : 'rests'}
            </span>
          </div>

          <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
            {restaurantBreakdown.map((item) => (
              <div key={item.restaurant.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${item.palette.fillClass}`} />
                  <span className="font-semibold text-slate-700 truncate" title={getLocalizedRestaurantName(item.restaurant, lang)}>
                    {getLocalizedRestaurantName(item.restaurant, lang)}
                  </span>
                </div>
                <div className="text-[11px] font-mono font-bold text-slate-800 shrink-0 ml-2">
                  {item.count} {t.portionUnit} <span className="text-slate-400 font-normal">({item.percent}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metric 4: Payment Audit Status */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute right-4 top-4 text-3xl opacity-10 group-hover:scale-110 transition-transform">💳</div>
          <span className="text-xs font-semibold text-slate-400 block mb-1">{t.statsKpiStatus}</span>
          <div className="text-lg font-black text-slate-800 flex flex-col gap-1">
            <span className="text-emerald-600 text-sm flex items-center justify-between">
              <span>{t.statsKpiPaidPercent}:</span>
              <span>{paid} {t.portionUnit} ({totalOrders ? Math.round((paid / totalOrders) * 100) : 0}%)</span>
            </span>
            <span className="text-amber-600 text-sm flex items-center justify-between">
              <span>{t.statsKpiUnpaid}:</span>
              <span>{unpaid} {t.portionUnit} ({totalOrders ? Math.round((unpaid / totalOrders) * 100) : 0}%)</span>
            </span>
          </div>
        </div>
      </div>

      {/* 3. Dynamic Daily Chart for ALL Restaurants */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              {t.statsChartTitle}
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'zh' ? '展示每日各合作餐厅的实际下单趋势与配比' : t.statsChartSubtitle}
            </p>
          </div>
          
          {/* Dynamic Legend for ALL Restaurants */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
            {allRestaurants.map((rest) => (
              <span key={rest.id} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${rest.palette.fillClass}`} />
                <span>{getLocalizedRestaurantName(rest, lang)}</span>
              </span>
            ))}
          </div>
        </div>

        {dailyChartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-100">
            <span className="text-2xl mb-1">📊</span>
            <span className="text-xs text-slate-400">{t.statsChartNoData}</span>
          </div>
        ) : (
          <div className="w-full">
            <div className="relative w-full h-64 pt-4">
              <svg className="w-full h-full" viewBox="0 0 500 220" preserveAspectRatio="none">
                {/* Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                  const y = 20 + ratio * 160;
                  const val = Math.round(maxDailyValue * (1 - ratio));
                  return (
                    <g key={index}>
                      <line x1="40" y1={y} x2="490" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                      <text x="10" y={y + 4} fill="#94a3b8" fontSize="10" className="font-mono">
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Render Dynamic Stacked Bars for ALL Restaurants */}
                {dailyChartData.map((d, index) => {
                  const totalBars = dailyChartData.length;
                  const spacing = 450 / totalBars;
                  const barWidth = Math.min(24, spacing - 10);
                  const x = 50 + index * spacing + (spacing - barWidth) / 2;

                  let currentTopY = 180;

                  return (
                    <g key={index} className="group cursor-pointer">
                      {d.restCounts.map((rc, rIdx) => {
                        if (rc.count === 0) return null;
                        const segmentHeight = (rc.count / maxDailyValue) * 160;
                        const y = currentTopY - segmentHeight;
                        currentTopY = y;

                        return (
                          <rect
                            key={rIdx}
                            x={x}
                            y={y}
                            width={barWidth}
                            height={segmentHeight}
                            fill={rc.palette.hex}
                            rx={rIdx === d.restCounts.filter(item => item.count > 0).length - 1 ? "2" : "0"}
                            className="transition-all duration-300 group-hover:opacity-90"
                          >
                            <title>{`${rc.name}: ${rc.count} ${t.portionUnit}`}</title>
                          </rect>
                        );
                      })}

                      {/* Hover Tooltip display text */}
                      <text
                        x={x + barWidth / 2}
                        y={Math.max(12, currentTopY - 6)}
                        textAnchor="middle"
                        fill="#334155"
                        fontSize="9"
                        fontWeight="bold"
                        className="opacity-0 group-hover:opacity-100 transition-opacity font-mono pointer-events-none"
                      >
                        {d.total}{t.portionUnit}
                      </text>

                      {/* Date label */}
                      <text
                        x={x + barWidth / 2}
                        y="198"
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="10"
                        className="font-mono"
                      >
                        {d.date}
                      </text>
                    </g>
                  );
                })}
                {/* Base axis line */}
                <line x1="40" y1="180" x2="490" y2="180" stroke="#cbd5e1" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* 4. Comprehensive All Restaurants Data Overview */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {t.allRestaurantsCardTitle || (lang === 'zh' ? '各餐馆订餐数据汇总' : 'All Restaurants Breakdown')}
              </h3>
              <p className="text-xs text-slate-400">
                {t.allRestaurantsCardSubtitle || (lang === 'zh' ? '展示所有合作餐馆的下单人次、营业额与付款情况' : 'Order volume, revenue and payment rates across all partner restaurants')}
              </p>
            </div>
          </div>
          <div className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
            {lang === 'zh' ? '共计合作' : 'Total Partner'}: <span className="text-rose-600 font-extrabold">{allRestaurants.length}</span> {lang === 'zh' ? '家餐厅' : 'Restaurants'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {restaurantBreakdown.map((item) => (
            <div 
              key={item.restaurant.id}
              className={`p-4 rounded-xl border transition-all hover:shadow-sm ${item.palette.bg} ${item.palette.border}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.palette.badgeBg}`}>
                  {getLocalizedRestaurantName(item.restaurant, lang)}
                </span>
                <span className="text-xs font-extrabold text-slate-700 font-mono">
                  RM {item.amount}
                </span>
              </div>

              <div className="flex items-baseline justify-between text-xs mt-3">
                <span className="text-slate-500">{lang === 'zh' ? '订餐数量' : 'Orders'}:</span>
                <span className="font-bold text-slate-800 text-sm">
                  {item.count} <span className="text-xs font-normal text-slate-500">{t.portionUnit}</span> ({item.percent}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-white/80 rounded-full h-2 mt-2 overflow-hidden border border-slate-200/50">
                <div 
                  className={`h-full ${item.palette.fillClass}`}
                  style={{ width: `${item.percent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-black/5">
                <span className="text-emerald-700 font-semibold">
                  ✅ {lang === 'zh' ? '已付' : 'Paid'}: {item.paidCount}
                </span>
                <span className="text-amber-700 font-semibold">
                  ⏳ {lang === 'zh' ? '未付' : 'Unpaid'}: {item.unpaidCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. 未支付的订餐信息 (Reference Today's Orders list format & columns) */}
      <div id="unpaid-orders-section" className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4 scroll-mt-20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">⏳</span>
              {t.unpaidOrdersTitle || (lang === 'zh' ? '未支付订餐信息明细' : 'Unpaid Orders Details')}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {t.unpaidTotalNotice?.replace('{count}', String(filteredUnpaidOrders.length)) || (lang === 'zh' ? `当前共 ${filteredUnpaidOrders.length} 条未付款订单，待催缴总额：` : `Total ${filteredUnpaidOrders.length} unpaid orders, total pending: `)}
              <span className="font-bold text-rose-600 text-sm ml-1 font-mono">RM {unpaidTotalAmount.toFixed(2)}</span>
              {rmbRates && (
                <span className="ml-1.5 text-amber-700 font-bold">
                  (≈ ¥ {(unpaidTotalAmount * (rmbRates.exchangeRate ?? 1.6333)).toFixed(2)} RMB)
                </span>
              )}
            </p>
          </div>

          {/* Action buttons & Search bar inside unpaid section */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Direct copy link button */}
            <button
              type="button"
              onClick={handleCopyUnpaidLink}
              title={lang === 'zh' ? '复制当前筛选条件的未支付对账专属链接' : 'Copy link to share unpaid list'}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>{t.copyUnpaidLinkBtn || (lang === 'zh' ? '🔗 复制未付链接' : 'Copy Link')}</span>
            </button>

            {/* Direct copy reminder notice button */}
            <button
              type="button"
              onClick={handleCopyUnpaidNotice}
              title={lang === 'zh' ? '复制包含待付名单与直接链接的催款通知文案' : 'Copy formatted reminder message'}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl border border-amber-200 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{t.copyUnpaidNoticeBtn || (lang === 'zh' ? '💬 复制催款文案' : 'Copy Reminder')}</span>
            </button>

            {/* Open share modal button */}
            <button
              type="button"
              onClick={() => setShowUnpaidShareModal(true)}
              title={lang === 'zh' ? '查看催款专属链接与通知模版' : 'Open share modal'}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Search input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t.searchPlaceholder || '搜索姓名/菜品...'}
                value={unpaidSearchTerm}
                onChange={(e) => setUnpaidSearchTerm(e.target.value)}
                className="w-full sm:w-44 pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Filter toolbar: Date / Plant / Restaurant */}
        <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 text-xs w-full sm:w-auto">
            <span className="font-bold text-slate-600 flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              {lang === 'en' ? 'Filters:' : lang === 'ms' ? 'Penapis:' : '筛选:'}
            </span>

            {/* Date filter dropdown */}
            <div className="flex items-center gap-1.5">
              <select
                value={
                  unpaidDateFilter === 'all' || 
                  unpaidDateFilter === 'today' || 
                  unpaidDateFilter === 'except_today' || 
                  unpaidDateFilter === 'tomorrow' || 
                  unpaidDateFilter === 'yesterday' ||
                  unpaidDatesSummary.some(([d]) => d === unpaidDateFilter)
                    ? unpaidDateFilter 
                    : 'custom'
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'custom') {
                    setUnpaidDateFilter(customUnpaidDate || todayStr);
                  } else {
                    setUnpaidDateFilter(val);
                  }
                }}
                className={`px-2.5 py-1.5 text-xs rounded-lg border font-bold cursor-pointer shadow-2xs transition-all ${
                  unpaidDateFilter !== 'all' 
                    ? 'border-rose-300 bg-rose-50 text-rose-800' 
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <option value="all">{t.unpaidDateAll || (lang === 'zh' ? '📅 全部日期' : 'All Dates')}</option>
                <option value="today">📅 {t.unpaidDateToday || (lang === 'zh' ? '今日' : 'Today')} ({todayStr})</option>
                <option value="except_today">⏳ {t.unpaidDateExceptToday || (lang === 'zh' ? '除当天之外 (历史待付)' : 'Exclude Today')}</option>
                <option value="tomorrow">📅 {t.unpaidDateTomorrow || (lang === 'zh' ? '明日' : 'Tomorrow')} ({tomorrowStr})</option>
                <option value="yesterday">📅 {t.unpaidDateYesterday || (lang === 'zh' ? '昨日' : 'Yesterday')} ({yesterdayStr})</option>
                
                {unpaidDatesSummary.length > 0 && (
                  <optgroup label={lang === 'zh' ? '有未付订单的历史日期' : 'Dates with Unpaid Orders'}>
                    {unpaidDatesSummary.map(([d, count]) => (
                      <option key={d} value={d}>
                        📅 {d} ({count}{lang === 'zh' ? '条未付' : ' unpaid'})
                      </option>
                    ))}
                  </optgroup>
                )}

                <option value="custom">📅 {t.unpaidDateCustom || (lang === 'zh' ? '自定义指定日期...' : 'Custom Date...')}</option>
              </select>

              {/* Direct calendar date picker if custom or specific date chosen */}
              {unpaidDateFilter !== 'all' && (
                <div className="flex items-center gap-1">
                  {unpaidDateFilter !== 'except_today' && (
                    <input
                      type="date"
                      value={
                        unpaidDateFilter === 'today' ? todayStr 
                        : unpaidDateFilter === 'tomorrow' ? tomorrowStr 
                        : unpaidDateFilter === 'yesterday' ? yesterdayStr 
                        : unpaidDateFilter
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          setCustomUnpaidDate(val);
                          setUnpaidDateFilter(val);
                        }
                      }}
                      className="px-2 py-1 text-xs rounded-lg border border-rose-200 bg-white text-rose-700 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer shadow-2xs"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setUnpaidDateFilter('all')}
                    title={lang === 'zh' ? '清除日期筛选' : 'Clear Date Filter'}
                    className="p-1 text-rose-500 hover:bg-rose-100 rounded-md transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Plant filter */}
            <select
              value={unpaidPlantFilter}
              onChange={(e) => setUnpaidPlantFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer shadow-2xs"
            >
              <option value="all">{lang === 'en' ? '🏢 All Plants' : lang === 'ms' ? '🏢 Semua Kilang' : '🏢 所有厂区'}</option>
              <option value="Plant1">🏢 {lang === 'en' ? 'Plant 1' : lang === 'ms' ? 'Kilang 1' : '一厂'}</option>
              <option value="Plant2">🏢 {lang === 'en' ? 'Plant 2' : lang === 'ms' ? 'Kilang 2' : '二厂'}</option>
            </select>

            {/* Restaurant filter */}
            <select
              value={unpaidRestaurantFilter}
              onChange={(e) => setUnpaidRestaurantFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer shadow-2xs"
            >
              <option value="all">{lang === 'en' ? '🍽️ All Restaurants' : lang === 'ms' ? '🍽️ Semua Restoran' : '🍽️ 所有餐厅'}</option>
              {allRestaurants.map((rest) => (
                <option key={rest.id} value={rest.id}>
                  {getLocalizedRestaurantName(rest, lang)}
                </option>
              ))}
            </select>
          </div>

          {/* Showing count and reset button */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 shrink-0 ml-auto sm:ml-0">
            <span>
              {lang === 'en' ? 'Showing' : lang === 'ms' ? 'Menunjukkan' : '显示'} <span className="font-bold text-slate-800">{filteredUnpaidOrders.length}</span> {lang === 'en' ? 'unpaid orders' : lang === 'ms' ? 'pesanan belum bayar' : '条未付记录'}
            </span>

            {(unpaidDateFilter !== 'all' || unpaidPlantFilter !== 'all' || unpaidRestaurantFilter !== 'all' || unpaidSearchTerm.trim() !== '') && (
              <button
                type="button"
                onClick={() => {
                  setUnpaidDateFilter('all');
                  setUnpaidPlantFilter('all');
                  setUnpaidRestaurantFilter('all');
                  setUnpaidSearchTerm('');
                  setCustomUnpaidDate('');
                }}
                className="text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer flex items-center gap-0.5 ml-1"
              >
                <X className="w-3 h-3" />
                {lang === 'en' ? 'Reset' : lang === 'ms' ? 'Set Semula' : '重置'}
              </button>
            )}
          </div>
        </div>

        {/* Floating / Inline copied toast */}
        {unpaidCopiedToast && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center justify-between gap-2 shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{unpaidCopiedToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setUnpaidCopiedToast(null)}
              className="text-emerald-600 hover:text-emerald-800 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Unpaid Orders Table (Identical structure to Today's Orders list) */}
        {filteredUnpaidOrders.length === 0 ? (
          <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-sm text-emerald-600 font-bold">
              {t.unpaidEmpty || (lang === 'zh' ? '太棒了！当前所选范围内没有未支付的订餐记录 🎉' : 'Awesome! No unpaid orders found 🎉')}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {lang === 'zh' ? '所有已选订单均已标记结清' : 'All selected orders have been settled'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3">{t.tableColName || '姓名'}</th>
                  <th className="py-3 px-3">{t.plantLabel || '厂区'}</th>
                  <th className="py-3 px-3">{lang === 'zh' ? '订餐日期' : 'Date'}</th>
                  <th className="py-3 px-3">{t.tableColMeal || '套餐明细'}</th>
                  <th className="py-3 px-3">{t.tableColPrice || '价格'}</th>
                  <th className="py-3 px-3">{t.tableColStatus || '支付状态'}</th>
                  <th className="py-3 px-3 text-right">📸 {lang === 'zh' ? '支付记录 / 操作' : lang === 'en' ? 'Payment Record / Action' : 'Tindakan'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUnpaidOrders.map((order) => {
                  const palette = restaurantColorMap.get(order.restaurantId || 'A') || RESTAURANT_PALETTE[0];
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition-colors group">
                      {/* Name */}
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {order.name}
                      </td>

                      {/* Plant */}
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          order.plant === 'Plant2'
                            ? 'bg-purple-50 text-purple-700 border border-purple-100'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                        }`}>
                          🏢 {order.plant || 'Plant1'}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex flex-col text-xs font-mono">
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {order.date}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-slate-300" />
                            {formatPenangDateTime(order.createdAt)}
                          </span>
                        </div>
                      </td>

                      {/* Meal & Sides */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${palette.badgeBg}`}>
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

                      {/* Price */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-slate-700 text-sm">
                          RM {order.price}
                        </div>
                        {rmbRates && (
                          <div className="text-[10px] text-amber-700 font-medium">
                            ≈ ¥ {(order.price * (rmbRates.exchangeRate ?? 1.6333)).toFixed(2)}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-amber-700 bg-amber-50 border border-amber-100">
                            ⏳ {t.statusUnpaid}
                          </span>
                          {order.paymentPlatform && (
                            <span className="text-[10px] font-medium text-slate-400">
                              {getPlatformLabel(order.paymentPlatform)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {order.receiptUrl ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setLightboxImageUrl(order.receiptUrl!)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-700 transition-all cursor-pointer"
                                title={lang === 'en' ? 'View uploaded receipt' : lang === 'ms' ? 'Lihat resit dimuat naik' : '查看已上传凭证'}
                              >
                                <img src={order.receiptUrl} alt="Receipt" className="w-4 h-4 rounded object-cover" />
                                <span>{t.viewReceiptBtn || (lang === 'en' ? 'View Receipt' : '查看凭证')}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenReceiptModal(order)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                                title={lang === 'en' ? 'Modify payment receipt' : '修改凭证'}
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
                              <span>📸 {lang === 'zh' ? '上传支付记录' : lang === 'en' ? 'Upload Payment Record' : 'Muat Naik Bayaran'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleQuickMarkPaid(order)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            title={lang === 'zh' ? '标记为已付款' : 'Mark as paid'}
                          >
                            ✅ {lang === 'zh' ? '已付' : 'Paid'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
                  {receiptModalOrder.date} • [{receiptModalOrder.restaurantName || (receiptModalOrder.restaurantId === 'B' ? 'Fatty Feng' : receiptModalOrder.restaurantId === 'C' ? t.restaurantCTitle : 'Delicious Cuckoo')}] {formatLocalizedMealName(receiptModalOrder.mealName, lang) || (lang === 'en' ? 'Meal' : '主食')}
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-black text-rose-600 font-mono">RM {receiptModalOrder.price}</div>
                {rmbRates && (
                  <div className="text-[10px] text-amber-700 font-bold">
                    ¥ {(receiptModalOrder.price * (rmbRates.exchangeRate ?? 1.6333)).toFixed(2)} RMB
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                1. {lang === 'zh' ? '选择付款渠道' : lang === 'en' ? 'Select Payment Platform' : 'Pilih Saluran Bayaran'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'WeChat', name: lang === 'zh' ? '微信支付' : 'WeChat Pay', icon: '🟢' },
                  { id: 'TNG', name: 'Touch \'n Go', icon: '🔵' },
                  { id: 'Restaurant', name: lang === 'zh' ? '直付餐馆' : lang === 'en' ? 'Direct Pay' : 'Bayar Terus', icon: '🏪' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setReceiptFormPlatform(item.id)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      receiptFormPlatform === item.id
                        ? 'bg-rose-50 text-rose-600 border-rose-300 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Image Upload Area */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                <span>2. {t.paymentReceiptLabel}-</span>
                <span className="text-rose-600 font-bold">
                  {lang === 'en' ? '(Image must include date and time)' : lang === 'ms' ? '(Imej mesti sertakan tarikh dan masa)' : '(图片中需要日期和时间)'}
                </span>
              </label>
              
              {receiptFormImage ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-2 text-center">
                  <img
                    src={receiptFormImage}
                    alt="Receipt preview"
                    className="max-h-56 mx-auto rounded-lg object-contain shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setReceiptFormImage('')}
                    className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-md transition-colors cursor-pointer"
                    title={lang === 'zh' ? '移除图片' : 'Remove Image'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-200 hover:border-rose-400 bg-slate-50 hover:bg-rose-50/30 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all">
                  <div className="p-3 bg-white text-rose-500 rounded-full shadow-2xs mb-2">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">
                    {lang === 'zh' ? '点击上传付款截图' : lang === 'en' ? 'Click to upload payment screenshot' : 'Klik untuk muat naik tangkapan skrin'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">PNG, JPG, JPEG (Max 10MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReceiptModalOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                {lang === 'zh' ? '取消' : lang === 'en' ? 'Cancel' : 'Batal'}
              </button>
              <button
                type="button"
                onClick={handleSaveReceipt}
                disabled={isSubmittingReceipt}
                className="px-5 py-2 text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingReceipt ? (
                  <span>{lang === 'zh' ? '保存中...' : lang === 'en' ? 'Saving...' : 'Menyimpan...'}</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{lang === 'zh' ? '确认保存凭证' : lang === 'en' ? 'Confirm Save' : 'Sahkan Simpan'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for zooming receipt screenshot */}
      {lightboxImageUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in cursor-zoom-out"
          onClick={() => setLightboxImageUrl(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] bg-transparent flex flex-col items-center">
            <button
              type="button"
              onClick={() => setLightboxImageUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-rose-400 p-2 transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxImageUrl}
              alt="Receipt zoom"
              className="max-h-[85vh] max-w-full rounded-xl shadow-2xl object-contain bg-white"
            />
          </div>
        </div>
      )}

      {/* Share / Reminder Modal for Unpaid Orders */}
      {showUnpaidShareModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">📢</span>
                <div>
                  <h4 className="text-base font-bold text-slate-800">
                    {t.unpaidShareModalTitle || (lang === 'zh' ? '分享未支付明细 / 催款通知' : 'Share Unpaid Orders Link')}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {lang === 'zh' ? '生成专属对账链接，发给尚未付款的同事核对' : 'Generate dedicated link for pending colleagues'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUnpaidShareModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Direct Link Section */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                1. 🔗 {lang === 'zh' ? '未支付对账专属访问链接' : 'Direct Link to Unpaid Orders'}:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generateUnpaidShareUrl()}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-mono select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyUnpaidLink}
                  className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl transition-all shrink-0 flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{lang === 'zh' ? '复制链接' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                💡 {lang === 'zh' ? '同事打开此链接可直接看到未付款名单，支持直接上传付款截图或确认支付。' : 'Employees clicking this link will directly see their pending orders and can upload receipts.'}
              </p>
            </div>

            {/* Reminder Message Text Section */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  2. 💬 {lang === 'zh' ? '微信 / WhatsApp 催款提醒文案模板' : 'WhatsApp / WeChat Reminder Text'}:
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {filteredUnpaidOrders.length} {lang === 'zh' ? '条待付' : 'pending'}
                </span>
              </div>
              <textarea
                readOnly
                rows={7}
                value={generateUnpaidReminderText()}
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-mono select-all focus:outline-none leading-relaxed"
              />
              <button
                type="button"
                onClick={handleCopyUnpaidNotice}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{lang === 'zh' ? '一键复制催款通知文案' : 'Copy Reminder Message'}</span>
              </button>
            </div>

            {/* Footer */}
            <div className="pt-2 flex items-center justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUnpaidShareModal(false)}
                className="px-5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                {lang === 'zh' ? '完成 / 关闭' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
