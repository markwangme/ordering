import React, { useEffect, useRef, useState } from 'react';
import { BellRing, CheckCircle2, Loader2, QrCode } from 'lucide-react';

const WORKER_URL = 'https://ordering-wxpusher-reminder.wfkkl.workers.dev';

type BindingState = 'idle' | 'loading' | 'waiting' | 'bound' | 'error';

export default function WxPusherBinding() {
  const [name, setName] = useState('');
  const [state, setState] = useState<BindingState>('idle');
  const [qrUrl, setQrUrl] = useState('');
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);

  const startBinding = async () => {
    const employeeName = name.trim();
    if (!employeeName) {
      setMessage('请先填写姓名。');
      setState('error');
      return;
    }
    if (timer.current) window.clearInterval(timer.current);
    setState('loading');
    setMessage('正在生成绑定二维码…');
    setQrUrl('');
    try {
      const response = await fetch(`${WORKER_URL}/binding/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeName }),
      });
      const data = await response.json();
      if (!response.ok || !data.qrUrl || !data.token) throw new Error(data.error || '二维码生成失败');
      setQrUrl(data.qrUrl);
      setToken(data.token);
      setState('waiting');
      setMessage('请用微信扫描二维码，关注 WxPusher 应用；扫码后请等待绑定成功。');
      timer.current = window.setInterval(async () => {
        try {
          const statusResponse = await fetch(`${WORKER_URL}/binding/status?token=${encodeURIComponent(data.token)}`);
          const status = await statusResponse.json();
          if (status.uid) {
            if (timer.current) window.clearInterval(timer.current);
            setState('bound');
            setMessage(`绑定成功：${status.employeeName || employeeName}`);
          }
        } catch {
          // Keep polling; temporary network errors should not cancel the user's binding.
        }
      }, 2500);
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : '绑定失败，请稍后重试。');
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-rose-50 text-rose-500"><BellRing className="w-5 h-5" /></div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-800">微信自动提醒绑定</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">绑定后，你只会收到自己的订餐提醒和未支付提醒。</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <input
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="请输入订餐时使用的姓名"
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-400"
          disabled={state === 'loading' || state === 'waiting'}
        />
        <button onClick={startBinding} disabled={state === 'loading' || state === 'waiting'} className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
          {state === 'loading' ? <Loader2 className="inline w-4 h-4 mr-1 animate-spin" /> : <QrCode className="inline w-4 h-4 mr-1" />}
          开始绑定
        </button>
      </div>
      <p className="mt-3 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3 leading-relaxed">
        姓名必须与订餐时填写的姓名完全一致；请不要使用重名。二维码扫码关注的是 WxPusher 应用，不是主题。
      </p>
      {qrUrl && state !== 'bound' && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <img src={qrUrl} alt="WxPusher 绑定二维码" className="w-52 h-52 rounded-xl border border-slate-200" />
          <p className="text-xs text-slate-500 text-center">二维码有效期约 15 分钟<br />请在微信中完成关注后保持此页面打开</p>
        </div>
      )}
      {message && <p className={`mt-3 text-sm ${state === 'error' ? 'text-rose-600' : state === 'bound' ? 'text-emerald-600' : 'text-slate-600'}`}>
        {state === 'bound' && <CheckCircle2 className="inline w-4 h-4 mr-1" />}{message}
      </p>}
      {token && state === 'waiting' && <span className="sr-only">binding token active</span>}
    </section>
  );
}
