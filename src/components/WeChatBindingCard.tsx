/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, 
  User, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Bell,
  HelpCircle,
  CheckSquare,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { Language } from '../i18n';

interface WeChatBindingCardProps {
  lang: Language;
}

export default function WeChatBindingCard({ lang }: WeChatBindingCardProps) {
  const isZh = lang === 'zh';
  const [employeeName, setEmployeeName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'expired' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clear intervals on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      stopCountdown();
    };
  }, []);

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const stopCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  // Countdown timer for QR code expiration
  useEffect(() => {
    if (status === 'pending' && expiresAt) {
      const updateTimer = () => {
        const now = Date.now();
        const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setTimeLeft(diff);

        if (diff <= 0) {
          setStatus('expired');
          stopPolling();
          stopCountdown();
        }
      };

      updateTimer();
      stopCountdown();
      countdownIntervalRef.current = setInterval(updateTimer, 1000);
    } else {
      stopCountdown();
    }
  }, [status, expiresAt]);

  // Start binding process
  const handleStartBinding = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = employeeName.trim();
    if (!trimmedName) {
      setErrorMsg(isZh ? '请输入订餐时使用的姓名' : 'Please enter your ordering name');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setStatus('idle');
    stopPolling();

    try {
      const response = await fetch('https://ordering-wxpusher-reminder.wfkkl.workers.dev/binding/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employeeName: trimmedName }),
      });

      if (!response.ok) {
        throw new Error(isZh ? '接口请求失败，请稍后重试' : 'Request failed, please try again later');
      }

      const data = await response.json();
      if (data && data.token && data.qrUrl) {
        setToken(data.token);
        setQrUrl(data.qrUrl);
        setExpiresAt(data.expiresAt || (Date.now() + 15 * 60 * 1000));
        setStatus('pending');
        startPolling(data.token);
      } else {
        throw new Error(isZh ? '返回数据格式不正确' : 'Invalid data format from server');
      }
    } catch (err: any) {
      console.error('Failed to start binding:', err);
      setErrorMsg(err.message || (isZh ? '启动绑定失败，请检查网络后重试' : 'Failed to start binding'));
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Poll binding status every 2.5 seconds
  const startPolling = (bindingToken: string) => {
    stopPolling();
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`https://ordering-wxpusher-reminder.wfkkl.workers.dev/binding/status?token=${encodeURIComponent(bindingToken)}`);
        if (!response.ok) return;

        const data = await response.json();
        if (data && data.status !== 'pending' && data.uid) {
          setStatus('success');
          stopPolling();
          stopCountdown();
        }
      } catch (err) {
        console.error('Polling error (silent recovery):', err);
      }
    }, 2500);
  };

  const handleReset = () => {
    stopPolling();
    stopCountdown();
    setQrUrl(null);
    setToken(null);
    setStatus('idle');
    setErrorMsg(null);
    setExpiresAt(null);
  };

  // Format countdown string
  const formatTimeLeft = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 md:p-6 shadow-sm relative overflow-hidden transition-all duration-300">
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
      
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100/50 shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-black text-slate-800">
            {isZh ? '微信提醒绑定' : 'WeChat Reminder Binding'}
          </h3>
        </div>
        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
          {isZh ? '个人私人推送' : '1-on-1 Private'}
        </span>
      </div>

      {status === 'idle' && (
        <form onSubmit={handleStartBinding} className="space-y-4">
          <div className="space-y-1.5 text-xs text-slate-600 leading-relaxed">
            <p>
              {isZh 
                ? '绑定微信后，您将获得专属的私人定制化消息提醒，不遗漏每日点餐和付款。' 
                : 'Bind WeChat to receive private personal order notifications and payment reminders.'}
            </p>
          </div>

          {/* Pre-binding Checklist Box */}
          <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-800 text-[11px] font-black">
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isZh ? '绑定前核对清单（必读）' : 'Pre-binding Checklist (Required)'}</span>
            </div>
            
            <div className="space-y-1.5 text-[11px] text-slate-600">
              <div className="flex items-start gap-1.5">
                <span className="w-4 h-4 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                <div>
                  <span className="font-black text-slate-800">
                    {isZh ? '【姓名完全一致】' : '[Exact Name Match] '}
                  </span>
                  {isZh 
                    ? '输入的姓名必须与每日订餐时填写的姓名完全一致；重名员工需要管理员区分。' 
                    : 'Name must exactly match what you enter when ordering lunch.'}
                </div>
              </div>

              <div className="flex items-start gap-1.5">
                <span className="w-4 h-4 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                <div>
                  <span className="font-black text-slate-800">
                    {isZh ? '【关注 WxPusher 应用】' : '[Follow WxPusher App] '}
                  </span>
                  {isZh 
                    ? '微信扫码后，请关注【WxPusher 应用】（不是关注主题或订阅号）。' 
                    : 'Scan with WeChat and follow the "WxPusher Application", NOT the theme.'}
                </div>
              </div>

              <div className="flex items-start gap-1.5">
                <span className="w-4 h-4 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                <div>
                  <span className="font-black text-slate-800">
                    {isZh ? '【仅需绑定一次】' : '[One-time Binding] '}
                  </span>
                  {isZh 
                    ? '绑定成功后长期有效，系统只向您推送个人的订单和催付款信息。' 
                    : 'Valid permanently after binding. Only pushes your own orders and payment status.'}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-700 block">
              {isZh ? '请输入订餐时使用的姓名' : 'Enter your ordering name'}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder={isZh ? '例如：张三（需与订餐姓名一致）' : 'e.g. John Doe (must match order name)'}
                disabled={isLoading}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300 disabled:opacity-60 disabled:bg-slate-50 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !employeeName.trim()}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-black rounded-xl text-xs transition-all shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-1.5"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{isZh ? '正在生成二维码...' : 'Generating QR code...'}</span>
              </>
            ) : (
              <>
                <QrCode className="w-3.5 h-3.5" />
                <span>{isZh ? '生成绑定二维码 ➔' : 'Generate QR Code ➔'}</span>
              </>
            )}
          </button>
        </form>
      )}

      {status === 'pending' && qrUrl && (
        <div className="flex flex-col items-center text-center space-y-4 py-2 animate-fade-in">
          <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl px-3 py-1.5 text-[11px] font-bold inline-flex items-center gap-1.5 shadow-sm">
            <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
            <span>{isZh ? '请微信扫码关注【WxPusher 应用】' : 'Please scan with WeChat & follow WxPusher'}</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 relative group max-w-[200px] shadow-sm">
            <img 
              src={qrUrl} 
              alt="Scan to bind WxPusher" 
              className="w-36 h-36 object-contain rounded-lg shadow-sm bg-white p-1"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none flex items-center justify-center">
              <span className="bg-white text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                {isZh ? '微信扫码绑定' : 'Scan to Bind'}
              </span>
            </div>
          </div>

          <div className="space-y-2 w-full bg-slate-50/90 p-3 rounded-2xl border border-slate-200/70 text-left text-[11px]">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
              <span className="text-xs font-black text-slate-800">
                {isZh ? `绑定员工：${employeeName}` : `Employee: ${employeeName}`}
              </span>
              <span className="text-[10px] text-rose-500 font-bold">
                {isZh 
                  ? `⏱️ 有效期：${formatTimeLeft(timeLeft)}` 
                  : `⏱️ ${formatTimeLeft(timeLeft)}`}
              </span>
            </div>
            
            <div className="space-y-1 text-slate-600 text-[10px] leading-relaxed">
              <p className="flex items-center gap-1 font-bold text-emerald-800">
                <span>👉</span>
                <span>{isZh ? '微信扫码后，请在手机上点击【关注应用】' : 'After scanning, tap [Follow Application]'}</span>
              </p>
              <p className="text-slate-400">
                {isZh ? '（关注成功后此卡片将自动变为绿色成功状态，无需手动刷新）' : '(This card will automatically update upon follow)'}
              </p>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition-all"
          >
            {isZh ? '修改姓名 / 重新生成' : 'Change Name / Regenerate'}
          </button>
        </div>
      )}

      {status === 'success' && (
        <div className="flex flex-col items-center text-center space-y-3.5 py-4 animate-fade-in">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center border-2 border-emerald-200 shadow-sm">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-black text-slate-800">
              {isZh ? '微信提醒绑定成功！' : 'Successfully Bound!'}
            </h4>
            <span className="text-xs text-emerald-800 font-black bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg inline-block">
              {employeeName}
            </span>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3 text-left space-y-1.5 text-[11px] text-slate-700">
            <p className="font-bold text-emerald-950">
              {isZh 
                ? '🎉 微信提醒绑定成功，以后将只收到自己的订餐和付款提醒。' 
                : '🎉 Success! You will now receive private 1-on-1 lunch orders and payment notifications.'}
            </p>
            <p className="text-slate-500 text-[10px] leading-relaxed">
              {isZh 
                ? '每日 09:30 订餐提醒、15:00 及 17:00 未支付提醒将自动推送到您的微信中。' 
                : 'Daily 09:30 ordering reminders and 15:00/17:00 unpaid alerts will be sent automatically to your WeChat.'}
            </p>
          </div>

          <button
            onClick={handleReset}
            className="text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-lg transition-all"
          >
            {isZh ? '为其他同事绑定 / 重置' : 'Bind for another name'}
          </button>
        </div>
      )}

      {(status === 'expired' || status === 'error') && (
        <div className="flex flex-col items-center text-center space-y-3.5 py-4 animate-fade-in">
          <div className="w-11 h-11 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center border border-rose-100">
            <AlertCircle className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <h4 className="text-xs font-black text-slate-800">
              {status === 'expired' 
                ? (isZh ? '二维码已过期' : 'QR Code Expired') 
                : (isZh ? '绑定请求失败' : 'Binding Failed')}
            </h4>
            {errorMsg && (
              <p className="text-[10px] text-rose-500 max-w-[220px] leading-tight">
                {errorMsg}
              </p>
            )}
          </div>

          <button
            onClick={handleReset}
            className="text-[11px] font-bold text-white bg-rose-500 hover:bg-rose-600 px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isZh ? '重新生成二维码' : 'Regenerate QR'}</span>
          </button>
        </div>
      )}

      {errorMsg && status === 'idle' && (
        <div className="mt-3 bg-rose-50 border border-rose-100 rounded-xl p-2.5 flex items-start gap-1.5 animate-fade-in">
          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-rose-700 leading-tight">
            {errorMsg}
          </p>
        </div>
      )}
    </div>
  );
}
