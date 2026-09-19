/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Order, AdminTransfer, RmbRates } from './types';
import OrderForm from './components/OrderForm';
import StatsView from './components/StatsView';
import AdminView from './components/AdminView';
import CompanyTransfersList from './components/CompanyTransfersList';
import RestaurantAuditView from './components/RestaurantAuditView';
import PasscodeLockScreen from './components/PasscodeLockScreen';
import { translations, Language } from './i18n';
import { 
  UtensilsCrossed, 
  BarChart3, 
  Settings, 
  HelpCircle, 
  Coffee,
  AlertCircle,
  RefreshCw,
  Clock,
  Heart,
  Globe,
  Upload,
  KeyRound,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'order' | 'stats' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      if (path === '/admin' || path.startsWith('/admin/') || params.get('tab') === 'admin') {
        return 'admin';
      }
      const view = params.get('view');
      const tab = params.get('tab');
      if (view === 'unpaid' || tab === 'unpaid' || tab === 'stats') {
        return 'stats';
      }
    }
    return 'order';
  });

  // Full-Site Visitor Passcode Verification State
  const [passcodeVerified, setPasscodeVerified] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('team_passcode_verified') === 'true';
    }
    return false;
  });

  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('lunch_lang');
    return (saved as Language) || 'zh';
  });

  useEffect(() => {
    localStorage.setItem('lunch_lang', lang);
  }, [lang]);

  const t = translations[lang];
  
  // Default date selection: If local time hour is >= 14 (2:00 PM), default to TOMORROW!
  const getInitialSelectedDate = () => {
    const d = new Date();
    if (d.getHours() >= 14) {
      d.setDate(d.getDate() + 1);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getInitialSelectedDate);

  // Pre-load from localStorage for 0ms instant display (Stale-While-Revalidate pattern)
  const [orders, setOrders] = useState<Order[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('lunch_cached_orders');
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return [];
  });

  const [transfers, setTransfers] = useState<AdminTransfer[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('lunch_cached_transfers');
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return [];
  });

  const [rmbRates, setRmbRates] = useState<RmbRates>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('lunch_cached_rates');
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return { rm15RmbPrice: 24.5, rm18RmbPrice: 29.4, exchangeRateNote: '依据每周实际支付汇率平均计算' };
  });

  const [dbStatus, setDbStatus] = useState<{ isCloud: boolean; projectId?: string } | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('lunch_cached_db_status');
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });
  
  // Page load states: if cached data already exists, render immediately without blocking spinner!
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('lunch_cached_orders');
    }
    return true;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState('');

  // Fetch all orders, corporate transfers and RMB exchange rates
  const fetchAllData = async (skipRates = false) => {
    if (orders.length === 0) {
      setLoading(true);
    }
    setIsSyncing(true);
    setError('');
    try {
      const fetchPromises: Promise<any>[] = [
        fetch('/api/orders'),
        fetch('/api/transfers'),
        skipRates ? Promise.resolve(null) : fetch('/api/rates').catch(() => null),
        fetch('/api/db-status').catch(() => null)
      ];
      const [ordersRes, transfersRes, ratesRes, dbStatusRes] = await Promise.all(fetchPromises);

      if (!ordersRes.ok || !transfersRes.ok) {
        throw new Error('从后端拉取订餐数据失败，请检查服务状态');
      }

      const ordersData = await ordersRes.json();
      const transfersData = await transfersRes.json();
      
      if (ratesRes && ratesRes.ok) {
        const ratesData = await ratesRes.json();
        setRmbRates(ratesData);
        try { localStorage.setItem('lunch_cached_rates', JSON.stringify(ratesData)); } catch (e) {}
      }

      if (dbStatusRes && dbStatusRes.ok) {
        const dbStatusData = await dbStatusRes.json();
        setDbStatus(dbStatusData);
        try { localStorage.setItem('lunch_cached_db_status', JSON.stringify(dbStatusData)); } catch (e) {}
      }

      setOrders(ordersData);
      setTransfers(transfersData);
      try {
        localStorage.setItem('lunch_cached_orders', JSON.stringify(ordersData));
        localStorage.setItem('lunch_cached_transfers', JSON.stringify(transfersData));
      } catch (e) {}
    } catch (err: any) {
      console.error(err);
      if (orders.length === 0) {
        setError(err.message || '网络连接失败，请稍后刷新重试');
      }
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  // On mount load data and sync when window regains focus
  useEffect(() => {
    // Validate stored visitor passcode against current backend passcode
    const checkPasscodeValidity = async () => {
      const storedToken = sessionStorage.getItem('team_passcode_token');
      if (sessionStorage.getItem('team_passcode_verified') === 'true') {
        if (!storedToken) {
          // Legacy session without stored token, re-prompt
          sessionStorage.removeItem('team_passcode_verified');
          setPasscodeVerified(false);
          return;
        }
        try {
          const res = await fetch('/api/auth/verify-passcode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passcode: storedToken })
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            // Passcode was changed in admin backend! Invalidate session immediately
            sessionStorage.removeItem('team_passcode_verified');
            sessionStorage.removeItem('team_passcode_token');
            setPasscodeVerified(false);
          }
        } catch (e) {
          // If network offline, retain session
        }
      }
    };

    checkPasscodeValidity();
    fetchAllData();

    const handleFocus = () => {
      checkPasscodeValidity();
      // Do not overwrite rates when window regains focus if currently on admin tab
      fetchAllData(activeTab === 'admin');
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [activeTab]);

  // Delete Order
  const handleDeleteOrder = async (id: string) => {
    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('彻底删除此订餐记录失败');
      }
      // Refresh local copy
      fetchAllData();
    } catch (err: any) {
      alert(err.message || '网络错误，请稍后重试');
    }
  };

  // Add Corporate Transfer 公示
  const handleAddTransfer = async (transfer: { amount: number; screenshotUrl: string; date: string }) => {
    const response = await fetch('/api/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transfer)
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error || '打款账单上传失败');
    }

    fetchAllData();
  };

  // Audit Link state for restaurant owner share view
  const [auditParams, setAuditParams] = useState<{ restId: string; date: string } | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const shareRest = params.get('shareRest') || params.get('auditRest');
      const date = params.get('date');
      if (shareRest && date) {
        return { restId: shareRest, date };
      }
    }
    return null;
  });

  // Delete Corporate Transfer 公示
  const handleDeleteTransfer = async (id: string) => {
    try {
      const response = await fetch(`/api/transfers/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('删除款项凭证失败');
      }
      fetchAllData();
    } catch (err: any) {
      alert(err.message || '网络错误，请稍后重试');
    }
  };

  // Dedicated view for Restaurant Owner if URL share params exist
  if (auditParams) {
    return (
      <RestaurantAuditView
        orders={orders}
        rmbRates={rmbRates}
        restaurantId={auditParams.restId}
        date={auditParams.date}
        lang={lang}
        onClose={() => {
          setAuditParams(null);
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', window.location.pathname);
          }
        }}
      />
    );
  }

  // Full-Site Team Passcode Lockscreen (Requires visitor passcode to enter the system)
  if (!passcodeVerified) {
    return (
      <PasscodeLockScreen
        lang={lang}
        onSuccess={() => setPasscodeVerified(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col pb-16">
      {/* Universal Page Header Banner */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo Brand area */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <Coffee className="w-5.5 h-5.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-slate-800">
                  {t.title}
                </h1>
                {isSyncing && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 animate-pulse">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    <span>同步中</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                {t.subtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
            {/* Language switcher */}
            <div className="grid grid-cols-3 sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
              <button
                onClick={() => setLang('zh')}
                className={`px-2 sm:px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all text-center whitespace-nowrap ${
                  lang === 'zh'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                中文
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2 sm:px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all text-center whitespace-nowrap ${
                  lang === 'en'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLang('ms')}
                className={`px-2 sm:px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all text-center whitespace-nowrap ${
                  lang === 'ms'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Melayu
              </button>
            </div>

            {/* Navigation tabs - visible to everyone in header, Admin tab requires admin password to enter */}
            <div className="flex items-center gap-2">
              <div className="grid grid-cols-3 sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setActiveTab('order');
                    fetchAllData();
                  }}
                  className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                    activeTab === 'order'
                      ? 'bg-white text-rose-500 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <UtensilsCrossed className="hidden sm:block w-3.5 h-3.5" />
                  {t.tabOrder}
                </button>
                <button
                  onClick={() => setActiveTab('stats')}
                  className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                    activeTab === 'stats'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <BarChart3 className="hidden sm:block w-3.5 h-3.5" />
                  {t.tabStats}
                </button>
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                    activeTab === 'admin'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Settings className="hidden sm:block w-3.5 h-3.5" />
                  {t.tabAdmin}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Stage */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-8 flex-grow">
        
        {/* Loading and error banners */}
        {loading && orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <RefreshCw className="w-10 h-10 text-rose-500 animate-spin mb-4" />
            <p className="text-sm text-slate-500 font-medium">Loading...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-center max-w-lg mx-auto">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 mb-1">Error</h3>
            <p className="text-xs text-rose-600 mb-4">{error}</p>
            <button
              onClick={fetchAllData}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Database status warning when ephemeral storage is active */}
            {dbStatus && !dbStatus.isCloud && (
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between animate-fade-in">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl flex-shrink-0">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-1">
                      {t.dbWarningTitle}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
                      {t.dbWarningDesc}
                    </p>
                    <div className="text-[11px] text-amber-800 font-semibold mt-2.5 bg-amber-100/40 p-3 rounded-xl border border-amber-200/50 leading-relaxed">
                      {t.dbWarningFix}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* View switching */}
            {activeTab === 'order' && (
              <OrderForm
                lang={lang}
                orders={orders}
                rmbRates={rmbRates}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                onOrderSubmitted={fetchAllData}
                onDeleteOrder={handleDeleteOrder}
              />
            )}

            {activeTab === 'stats' && (
              <StatsView 
                lang={lang} 
                orders={orders} 
                rmbRates={rmbRates}
                transfers={transfers}
                onOrderSubmitted={fetchAllData}
                onDeleteOrder={handleDeleteOrder}
              />
            )}

            {activeTab === 'admin' && (
              <AdminView
                lang={lang}
                orders={orders}
                transfers={transfers}
                rmbRates={rmbRates}
                selectedDate={selectedDate}
                onOrderSubmitted={fetchAllData}
                onDeleteOrder={handleDeleteOrder}
                onAddTransfer={handleAddTransfer}
                onDeleteTransfer={handleDeleteTransfer}
                onUpdateRates={fetchAllData}
                onBackToOrder={() => {
                  setActiveTab('order');
                  if (typeof window !== 'undefined') {
                    window.history.pushState({}, '', '/');
                  }
                }}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer information */}
      <footer className="mt-16 text-center border-t border-slate-100 pt-8 max-w-7xl mx-auto w-full px-4 text-slate-400">
        <p className="text-[11px] leading-relaxed">
          {t.footerText}
        </p>
        <p className="text-[10px] mt-1 flex items-center justify-center gap-1">
          <span>{t.footerWish.split('•')[0]}</span>
          <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
          <span>{t.footerWish.split('•')[1] || ''}</span>
        </p>
      </footer>
    </div>
  );
}
