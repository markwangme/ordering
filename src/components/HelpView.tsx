/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  QrCode, 
  BookOpen, 
  HelpCircle, 
  Clock, 
  CreditCard, 
  Utensils, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight,
  Info,
  ShieldAlert,
  BellRing,
  ShieldCheck,
  Sparkles,
  History,
  Rocket,
  Zap,
  Tag,
  Share2
} from 'lucide-react';
import { Language } from '../i18n';
import WeChatBindingCard from './WeChatBindingCard';

interface HelpViewProps {
  lang: Language;
  onBackToOrder: () => void;
}

export default function HelpView({ lang, onBackToOrder }: HelpViewProps) {
  const isZh = lang === 'zh';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in" id="help-instructions-view">
      {/* Title Header Banner */}
      <div className="bg-gradient-to-r from-rose-500 to-pink-600 rounded-2xl p-4 md:py-4 md:px-5 text-white shadow-md shadow-rose-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-md text-[10px] font-semibold backdrop-blur-sm">
              <BookOpen className="w-3 h-3" />
              {isZh ? '系统指南' : 'System Guide'}
            </span>
            <h2 className="text-sm md:text-base font-bold tracking-tight">
              {isZh ? '员工每日订餐系统操作说明' : 'Employee Daily Lunch Ordering Guide'}
            </h2>
          </div>
          <p className="text-rose-100/90 text-[11px] leading-relaxed max-w-2xl">
            {isZh 
              ? '为了帮助大家更顺畅地完成日常订餐、微信提醒绑定与支付，请仔细阅读以下简要指南。' 
              : 'Please read this brief guide to complete daily ordering, WeChat reminder binding, and payment easily.'}
          </p>
        </div>
        <button
          onClick={onBackToOrder}
          className="px-4 py-2 bg-white text-rose-600 font-bold rounded-xl text-xs hover:bg-rose-50 transition-all shadow-sm self-start sm:self-auto shrink-0 flex items-center gap-1"
        >
          {isZh ? '去点餐 ➔' : 'Go to Order ➔'}
        </button>
      </div>

      {/* Special Notice Card - Eye catching background & icon */}
      <div className="bg-gradient-to-br from-amber-50 via-orange-50/50 to-rose-50 border-2 border-amber-300/80 rounded-2xl p-4 md:p-5 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start gap-3.5">
          <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20 mt-0.5">
            <BellRing className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-amber-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                {isZh ? '特别提醒' : 'Important Notice'}
              </span>
              <h3 className="text-sm font-black text-amber-950">
                {isZh 
                  ? '为什么必须先完成个人微信绑定？' 
                  : 'Why is personal WeChat binding mandatory?'}
              </h3>
            </div>
            
            <p className="text-xs text-amber-950/90 leading-relaxed font-medium">
              {isZh 
                ? '完成个人微信绑定是接收每日订餐与支付提醒的【唯一必要前提】。为保护员工隐私，系统已关闭大群公开催款，升级为 1 对 1 私人通知通道。' 
                : 'Completing personal WeChat binding is the mandatory prerequisite for daily order and payment reminders. For privacy, group notifications have been replaced by private 1-on-1 alerts.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 text-[11px]">
              <div className="bg-white/80 border border-amber-200/70 rounded-xl p-2.5 flex items-start gap-2 text-slate-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">
                    {isZh ? '专属隐私保护：' : 'Private & Secure: '}
                  </span>
                  {isZh 
                    ? '每个人只能收到自己的订餐和付款记录，其他人无法看到您的订单与付款状态。' 
                    : 'You only receive your own records; others cannot view your orders or payment status.'}
                </div>
              </div>

              <div className="bg-white/80 border border-amber-200/70 rounded-xl p-2.5 flex items-start gap-2 text-slate-700">
                <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">
                    {isZh ? '未绑定后果：' : 'If not bound: '}
                  </span>
                  {isZh 
                    ? '未完成绑定的员工将无法接收 09:30 点餐提醒与 15:00 / 17:00 支付提醒，容易漏餐漏付。' 
                    : 'Unbound employees will not receive 09:30 order alerts or 15:00/17:00 payment reminders.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: WeChat 1-on-1 Personal Binding Card & Notification Schedules */}
        <div className="lg:col-span-1 space-y-6">
          {/* Real-time personal 1-on-1 binding interactive card */}
          <WeChatBindingCard lang={lang} />

          {/* Privacy & Anti-Broadcast Notice Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col items-start text-left relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
            
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-slate-800">
                {isZh ? '1 对 1 私人专属推送机制' : '1-on-1 Private Notification Model'}
              </h3>
            </div>
            
            <div className="space-y-2.5 text-[11px] text-slate-600 leading-relaxed">
              <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-3 text-emerald-950 font-medium">
                <span className="font-black text-emerald-800">
                  {isZh ? '✅ 为什么必须使用上方专属绑定？' : '✅ Why use personal binding above? '}
                </span>
                <p className="mt-1 text-slate-600">
                  {isZh 
                    ? '系统已彻底弃用“公共广播大喇叭”模式。在上方输入姓名后，系统会为您的姓名生成专属应用绑定二维码，精准关联您的微信 UID。' 
                    : 'Group broadcast topics are decommissioned. Enter your name above to generate your exclusive 1-on-1 binding QR code.'}
                </p>
              </div>

              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 text-amber-950 font-medium">
                <span className="font-black text-amber-900">
                  {isZh ? '⚠️ 避免关注错误（切勿使用旧版公共主题）：' : '⚠️ Avoid broadcast topics: '}
                </span>
                <ul className="mt-1 space-y-1 list-disc list-inside text-slate-700">
                  <li>{isZh ? '只需在上方输入订餐姓名并扫码一次' : 'Enter name above & scan once'}</li>
                  <li>{isZh ? '无需、也不要在公众号内订阅任何公共主题' : 'Do not subscribe to public topics'}</li>
                  <li>{isZh ? '绑定成功后，系统仅将个人账单推送给您本人' : 'Only your personal bills will be sent to you'}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* WeChat notification timeline */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-500" />
              <span>{isZh ? '微信自动提醒时间' : 'WeChat Auto Reminder Times'}</span>
            </h3>
            
            <div className="space-y-4">
              <div className="flex gap-3.5 items-start">
                <span className="text-xs font-black text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md font-mono shrink-0">09:30</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-700">{isZh ? '每日订餐提醒' : 'Daily Ordering Reminder'}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{isZh ? '提醒登记今日的午餐选择，避免遗忘。' : 'Reminds you to lock in today\'s lunch selection.'}</p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start">
                <span className="text-xs font-black text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md font-mono shrink-0">15:00</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-700">{isZh ? '第 1 次未支付提醒' : '1st Unpaid Reminder'}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{isZh ? '系统自动向下午 3 点仍未上传转账凭证的人员推送。' : 'Auto-sent to users who ordered but haven\'t uploaded receipt.'}</p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start">
                <span className="text-xs font-black text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md font-mono shrink-0">17:00</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-700">{isZh ? '第 2 次未支付提醒' : '2nd Unpaid Reminder'}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{isZh ? '每日未支付订单最后核对催缴，请尽早打款并上传凭证。' : 'Final daily reminder for unpaid orders.'}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-50 flex items-start gap-2 bg-slate-50/50 p-2.5 rounded-xl">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-500 leading-relaxed">
                {isZh ? '注：该公众号由 WxPusher 驱动，仅用于向您个人发送通知提醒，无其他商业功能。' : 'Note: Driven by WxPusher, used solely for personal notifications.'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed ordering and payment process, and FAQ */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Steps */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Utensils className="w-5 h-5 text-rose-500" />
              <span>{isZh ? '两步极速点餐流程' : 'Two-Step Quick Ordering Process'}</span>
            </h3>

            {/* Step 2: Ordering */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-600">2</span>
                <h4 className="text-sm font-bold text-slate-800">{isZh ? '进行点餐登记' : 'Register Lunch Order'}</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50/60 rounded-2xl border border-slate-100/60">
                  <span className="text-[10px] uppercase font-bold text-rose-500 tracking-wider">Step 2.1</span>
                  <h5 className="text-xs font-bold text-slate-800 mt-1 mb-1">{isZh ? '输入访问口令' : 'Enter Team Passcode'}</h5>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {isZh ? '进入网站后，首次需输入团队防窥探访问口令（保护员工点餐和账单信息安全）。' : 'First-time entering requires the team passcode to protect private orders and billings.'}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50/60 rounded-2xl border border-slate-100/60">
                  <span className="text-[10px] uppercase font-bold text-rose-500 tracking-wider">Step 2.2</span>
                  <h5 className="text-xs font-bold text-slate-800 mt-1 mb-1">{isZh ? '填写点餐选项' : 'Fill Order Selection'}</h5>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {isZh ? '确认页面上的订餐日期，依次输入个人真实姓名、选择工作的厂区（Plant1 或 Plant2）、餐厅、以及具体套餐与加菜。' : 'Confirm date, enter true name, select Plant area, Restaurant and desired package.'}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50/60 rounded-2xl border border-slate-100/60">
                  <span className="text-[10px] uppercase font-bold text-rose-500 tracking-wider">Step 2.3</span>
                  <h5 className="text-xs font-bold text-slate-800 mt-1 mb-1">{isZh ? '提交点餐' : 'Submit Order'}</h5>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {isZh ? '确认无误后点击“确认提交订餐”。提交成功后，页面底部点餐记录中便会实时显示您的订单。' : 'Confirm inputs and click "Confirm Submit". Your order appears in list below.'}
                  </p>
                </div>

                <div className="p-3.5 bg-rose-50/40 rounded-2xl border border-rose-100/40">
                  <span className="text-[10px] uppercase font-bold text-rose-500 tracking-wider">Important</span>
                  <h5 className="text-xs font-bold text-rose-800 mt-1 mb-1">{isZh ? '避免重复与更改' : 'Consistent Name Usage'}</h5>
                  <p className="text-[11px] text-rose-700 leading-relaxed font-medium">
                    {isZh ? '注意：每天请一律使用完全相同的中文真实姓名，切勿重复提交订单，如有差错直接修改原记录。' : 'Attention: Always use identical real name each day, do not submit duplicate orders.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3: Payment */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-600">3</span>
                <h4 className="text-sm font-bold text-slate-800">{isZh ? '完成支付并上传凭证' : 'Upload Payment Receipt'}</h4>
              </div>

              <div className="space-y-3.5">
                <div className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-[10px] font-black text-rose-600 shrink-0 mt-0.5">3.1</span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {isZh 
                      ? '在订餐结果列表中，找到自己的姓名订单，在订单状态栏点击“支付款项”或“未支付”红色按钮。' 
                      : 'Find your name in orders list below and click red "Unpaid" status button.'}
                  </p>
                </div>

                <div className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-[10px] font-black text-rose-600 shrink-0 mt-0.5">3.2</span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {isZh 
                      ? '系统弹出转账核对卡片，自动为您换算出应付人民币（RMB）金额。' 
                      : 'An interface pops up calculating precisely the equivalent RMB amount due based on rate.'}
                  </p>
                </div>

                <div className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-[10px] font-black text-rose-600 shrink-0 mt-0.5">3.3</span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {isZh 
                      ? '使用微信 (WeChat) 或 触控通 (TNG) 扫描页面展示的商家 DuitNow 收款二维码进行付款。' 
                      : 'Scan standard DuitNow QR for selected restaurant using WeChat Pay or TNG to pay.'}
                  </p>
                </div>

                <div className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-[10px] font-black text-rose-600 shrink-0 mt-0.5">3.4</span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {isZh 
                      ? '付款完成后，将付款成功账单截图上传到对应的栏位。勾选“我已支付并确认金额无误”，并点击“保存核销”。保存后，您的状态自动更新为“已支付”绿标。' 
                      : 'Upload receipt screenshot, check "I have paid and confirmed amount" and save. Status shifts to green "Paid".'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Version Updates & Evolution Card (V2.0) */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-7 shadow-sm space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500"></div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 border border-rose-100 shrink-0">
                  <Rocket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">
                    {isZh ? '系统版本更新与动态' : 'System Version Updates & Evolution'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isZh ? '持续迭代，为您提供更高效、私密、稳定的订餐与提醒体验' : 'Continuously evolving for a better ordering & reminder experience'}
                  </p>
                </div>
              </div>

              {/* Version Badge */}
              <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3.5 py-1.5 rounded-xl self-start sm:self-auto shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-black tracking-wide">
                  {isZh ? '当前系统版本：V2.0' : 'Current Version: V2.0'}
                </span>
              </div>
            </div>

            {/* Version Timeline */}
            <div className="space-y-6">
              {/* V2.0 Release */}
              <div className="relative pl-6 border-l-2 border-emerald-500 space-y-3">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-xs"></div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                    V2.0 正式版
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {isZh ? '最新重磅功能发布' : 'Latest Major Release'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                  {/* WeChat Reminder System */}
                  <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-3.5 text-[11px] space-y-1.5">
                    <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <BellRing className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{isZh ? '微信 1 对 1 专属提醒系统' : 'WeChat 1-on-1 Reminder System'}</span>
                    </div>
                    <ul className="text-slate-600 space-y-1 list-disc list-inside leading-relaxed text-[11px]">
                      <li>{isZh ? '告别大群广播，升级为真实姓名与微信 UID 的一对一私密推送' : '1-on-1 private push based on real name & WeChat UID'}</li>
                      <li>{isZh ? '专属动态绑定：输入姓名生成专属二维码，微信扫码一键绑定' : 'Dynamic personal binding QR for 1-click association'}</li>
                      <li>{isZh ? '每日三段式自动提醒：09:30订餐、15:00未付提醒、17:00最终核销' : 'Automated schedules: 09:30 order, 15:00 unpaid, 17:00 final audit'}</li>
                      <li>{isZh ? '全面杜绝关注错误，彻底弃用旧版公共广播主题' : 'Strict anti-error guard, deprecated public broadcast topics'}</li>
                    </ul>
                  </div>

                  {/* Deep URLs & Navigation */}
                  <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3.5 text-[11px] space-y-1.5">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{isZh ? '全站独立子路由与深链接' : 'Deep URLs & Independent Routes'}</span>
                    </div>
                    <ul className="text-slate-600 space-y-1 list-disc list-inside leading-relaxed text-[11px]">
                      <li>{isZh ? '每个页面拥有专属网址（/order、/stats、/help、/admin）' : 'Dedicated sub-URLs for all modules'}</li>
                      <li>{isZh ? '支持一键将特定页面链接精准分享给同事，点击直达' : 'Direct link sharing for specific functional views'}</li>
                      <li>{isZh ? '完整支持浏览器前进与后退历史联动与动态页面标题' : 'Full browser history back/forward sync & dynamic titles'}</li>
                    </ul>
                  </div>

                  {/* Disaster Recovery & Persistence */}
                  <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3.5 text-[11px] space-y-1.5">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                      <span>{isZh ? '双轨云端 + 离线热镜像容灾' : 'Dual Cloud & Offline Resilience'}</span>
                    </div>
                    <ul className="text-slate-600 space-y-1 list-disc list-inside leading-relaxed text-[11px]">
                      <li>{isZh ? 'Firestore 云端多端秒级同步 + 本地热镜像自动熔断备份' : 'Firestore cloud sync + local hot mirroring backup'}</li>
                      <li>{isZh ? '无论网络波动或云端配额状态，确保历史订单与账单零丢失' : 'Zero data loss guarantee even during quota limits'}</li>
                    </ul>
                  </div>

                  {/* Audit & Management Enhancement */}
                  <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3.5 text-[11px] space-y-1.5">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>{isZh ? '全维管理审计与凭证打包' : 'Audit & Receipt Archive'}</span>
                    </div>
                    <ul className="text-slate-600 space-y-1 list-disc list-inside leading-relaxed text-[11px]">
                      <li>{isZh ? '支持 Excel / CSV 订餐报表一键导出' : 'One-click Excel/CSV report export'}</li>
                      <li>{isZh ? '支持员工付款截图凭证一键批量 ZIP 打包下载归档' : 'Batch ZIP download for employee payment screenshots'}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* V1.0 Foundation */}
              <div className="relative pl-6 border-l-2 border-slate-200 space-y-2">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-300 border-4 border-white shadow-xs"></div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                    V1.0 基础版本
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {isZh ? '系统初版基座' : 'Initial System Release'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {isZh 
                    ? '提供 Plant 1 / Plant 2 双厂区订餐、多餐厅与定制加菜、马币（MYR）与人民币（RMB）实时汇率折算、商家 DuitNow 收款码展示与账单截图上传核销。' 
                    : 'Initial release featuring Plant 1/2 ordering, multi-restaurant routing, MYR-RMB currency conversion, DuitNow QR, and receipt uploads.'}
                </p>
              </div>
            </div>
          </div>

          {/* FAQ Area */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-rose-500" />
              <span>{isZh ? '常见问题与答疑 (FAQ)' : 'Frequently Asked Questions'}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <span className="text-rose-500">Q:</span>
                  <span>{isZh ? '收不到微信消息提醒怎么办？' : 'Not receiving WeChat notifications?'}</span>
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed pl-5">
                  {isZh 
                    ? '请确认：(1) 已成功微信扫码左侧二维码并关注成功；(2) 没有屏蔽服务号消息或关闭应用通知；(3) 手机和微信网络处于连接状态。' 
                    : 'Confirm: (1) Scan & follow left QR successfully; (2) Did not block notification/account; (3) Stable internet.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <span className="text-rose-500">Q:</span>
                  <span>{isZh ? '已经付款了，页面上仍显示“未支付”？' : 'Already paid but shows "Unpaid"?'}</span>
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed pl-5">
                  {isZh 
                    ? '请重新在下方列表中打开自己的姓名订单，在付款栏重新选择并上传您的付款成功账单截图，勾选已支付并保存，即可更改为已支付。' 
                    : 'Re-open your order in the list, upload payment screenshot, check "paid" box, and hit save to update.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <span className="text-rose-500">Q:</span>
                  <span>{isZh ? '点完餐之后，看不到自己的订单记录？' : 'Can\'t find order after submitting?'}</span>
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed pl-5">
                  {isZh 
                    ? '请首先在日期框中核对是否选对了日期，再在下方列表中通过搜索框或厂区筛选您的姓名。若确实不存在，请尝试重新提交，注意不要提交双份。' 
                    : 'Double check target date input first, then search name or filter plant. Re-submit only if truly absent.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <span className="text-rose-500">Q:</span>
                  <span>{isZh ? '忘记网页的防窥探访问口令怎么办？' : 'Forgot team access passcode?'}</span>
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed pl-5">
                  {isZh 
                    ? '您可以查看团队订餐微信群内的公告，或直接向当日值班的系统管理员询问获取当前最新的正确口令。' 
                    : 'Check latest notice in WeChat group, or ask active admin for correct passcode.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
