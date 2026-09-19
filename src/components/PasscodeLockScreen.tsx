/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { KeyRound, ShieldCheck, ArrowRight, RefreshCw, AlertCircle, Utensils } from 'lucide-react';
import { Language } from '../i18n';

interface PasscodeLockScreenProps {
  lang?: Language;
  onSuccess: () => void;
}

export default function PasscodeLockScreen({ lang = 'zh', onSuccess }: PasscodeLockScreenProps) {
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setErrorMsg(lang === 'zh' ? '请输入团队访问口令' : 'Please enter team passcode');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/auth/verify-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim() })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        // Save to sessionStorage with actual passcode token so we can re-verify if admin changes it
        sessionStorage.setItem('team_passcode_verified', 'true');
        sessionStorage.setItem('team_passcode_token', passcode.trim());
        onSuccess();
      } else {
        setErrorMsg(
          data.error ||
          (lang === 'zh'
            ? '口令错误，请联系系统管理员获取最新团队访问口令'
            : 'Invalid passcode. Please contact administrator for access.')
        );
      }
    } catch (err) {
      setErrorMsg(
        lang === 'zh'
          ? '网络连接异常，请稍后重试'
          : 'Network connection error, please try again.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-rose-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-slate-200/80 p-8 space-y-6">
        {/* Top Branding & Lock Icon */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200/60 shadow-inner">
            <KeyRound className="w-8 h-8" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-bold border border-rose-200/60 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              {lang === 'zh' ? '企业团队内部访问安全核验' : 'Team Security Verification'}
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              Novolyte团队订餐系统
            </h1>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {lang === 'zh'
                ? '为保护员工隐私与订单数据安全，本系统采用全站访客访问口令保护，请输入口令进入点餐。'
                : 'To protect employee privacy, please enter the team access passcode to proceed.'}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>{lang === 'zh' ? '团队访问口令 (Passcode)' : 'Team Passcode'}</span>
            </label>
            <div className="relative">
              <input
                type="password"
                autoFocus
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder={lang === 'zh' ? '请输入团队访问口令...' : 'Enter team passcode...'}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono tracking-widest text-center text-lg placeholder:text-slate-400 placeholder:text-sm placeholder:tracking-normal focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{lang === 'zh' ? '正在核验证口令...' : 'Verifying...'}</span>
              </>
            ) : (
              <>
                <span>{lang === 'zh' ? '验证口令并进入系统' : 'Enter System'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div className="pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400 space-y-1">
          <p>
            {lang === 'zh'
              ? '💡 口令由订餐组织人员定期向内部员工通知更新。'
              : 'Passcode is periodically updated and shared by team organizers.'}
          </p>
          <p className="text-[10px] text-slate-400">
            {lang === 'zh'
              ? '注：合作餐厅专属对账链接可直接打开，不受此访问口令拦截。'
              : 'Note: Restaurant audit links remain directly accessible.'}
          </p>
        </div>
      </div>
    </div>
  );
}
