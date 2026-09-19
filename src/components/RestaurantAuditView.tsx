/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import JSZip from 'jszip';
import { Order, RmbRates } from '../types';
import { getActiveRestaurants } from '../data/menu';
import { translations, Language } from '../i18n';
import { 
  Utensils, 
  Calendar, 
  CheckCircle2, 
  FileArchive, 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  Eye, 
  X, 
  ArrowLeft,
  Coffee,
  Download,
  Clock
} from 'lucide-react';

interface RestaurantAuditViewProps {
  orders: Order[];
  rmbRates?: RmbRates;
  restaurantId: string;
  date: string;
  lang: Language;
  onClose?: () => void;
}

export default function RestaurantAuditView({
  orders,
  rmbRates,
  restaurantId,
  date,
  lang,
  onClose
}: RestaurantAuditViewProps) {
  const t = translations[lang] || translations.zh;
  const activeRestaurants = getActiveRestaurants(rmbRates?.customRestaurants, rmbRates);
  const targetRestaurant = activeRestaurants.find(r => r.id === restaurantId) || {
    id: restaurantId,
    name: restaurantId === 'A' ? 'A餐厅' : restaurantId === 'B' ? 'B餐厅' : restaurantId === 'C' ? 'C餐厅' : restaurantId
  };

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  // Filter orders for this restaurant and date that are paid with receipt
  const restOrders = orders.filter(o => 
    o.date === date && 
    (o.restaurantId === restaurantId || (!o.restaurantId && restaurantId === 'A'))
  );

  const paidOrdersWithReceipts = restOrders.filter(o => o.isPaid && o.receiptUrl && o.receiptUrl.trim() !== '');
  const totalAmount = restOrders.reduce((sum, o) => sum + o.price, 0);
  const totalPaidAmount = paidOrdersWithReceipts.reduce((sum, o) => sum + o.price, 0);

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

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}?shareRest=${restaurantId}&date=${date}` : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const mealStatsMap = new Map<string, { count: number; totalAmount: number }>();
    const sideCountsMap = new Map<string, number>();

    restOrders.forEach(o => {
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

    let text = `【${date} ${targetRestaurant.name} 订餐总览】\n`;
    text += `总订餐数: ${restOrders.length} 份 | 已核对凭证: ${paidOrdersWithReceipts.length} 份 | 金额: RM ${totalAmount.toFixed(2)}\n`;
    text += `------------------------------------------\n`;
    text += `【午餐套餐汇总】\n`;
    mealStatsMap.forEach((stats, meal) => {
      text += `• ${meal}: ${stats.count} 份，金额RM ${stats.totalAmount.toFixed(2)}\n`;
    });
    if (sideCountsMap.size > 0) {
      text += `\n【配菜/加料汇总】\n`;
      sideCountsMap.forEach((count, side) => {
        text += `• ${side}: ${count} 份\n`;
      });
    }
    text += `------------------------------------------\n`;
    text += `点击以下专属链接查看转账凭证与在线账单：\n${shareUrl}`;

    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const handleDownloadZip = async () => {
    if (paidOrdersWithReceipts.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      paidOrdersWithReceipts.forEach((order, index) => {
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
      a.download = `${date}_${targetRestaurant.name.replace(/\s+/g, '_')}_支付截图.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP error:', err);
      alert('ZIP打包下载失败');
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Top Banner */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                  餐厅对账专属页面
                </span>
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {date}
                </span>
              </div>
              <h1 className="text-lg font-black text-slate-800 mt-0.5">
                {targetRestaurant.name} · 订餐总览与支付凭证
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                返回系统
              </button>
            )}
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copiedToast ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copiedToast ? '已复制对账链接' : '复制对账链接'}
            </button>
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              WhatsApp 分享
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 mt-6 space-y-6">
        {/* Metric Cards Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <span className="text-xs font-bold text-slate-400">总订餐份数</span>
            <div className="text-2xl font-black text-slate-800">
              {restOrders.length} <span className="text-xs font-bold text-slate-500">份</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <span className="text-xs font-bold text-slate-400">已上传截图凭证</span>
            <div className="text-2xl font-black text-emerald-600">
              {paidOrdersWithReceipts.length} <span className="text-xs font-bold text-slate-500">张</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-rose-100 bg-rose-50/30 shadow-2xs space-y-1">
            <span className="text-xs font-bold text-rose-600">对账合计总金额</span>
            <div className="text-2xl font-black text-rose-600">
              RM {totalPaidAmount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Action Header for Downloading All Images */}
        {paidOrdersWithReceipts.length > 0 && (
          <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <FileArchive className="w-4 h-4 text-rose-400" />
                员工支付转账截图批量打包 (ZIP)
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                包含 {paidOrdersWithReceipts.length} 张员工支付转账截图，文件名已自动标注姓名、餐品与金额
              </p>
            </div>

            <button
              type="button"
              disabled={isZipping}
              onClick={handleDownloadZip}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              {isZipping ? '打包中...' : '下载全套截图 (.ZIP)'}
            </button>
          </div>
        )}

        {/* Detailed Orders Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Utensils className="w-4 h-4 text-rose-500" />
              订单列表明细 ({restOrders.length} 笔)
            </h3>
          </div>

          {restOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              该日期下暂无此餐厅的订餐记录
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">厂区 / 订单编号</th>
                    <th className="px-4 py-3">选择套餐 / 加料</th>
                    <th className="px-4 py-3 text-right">金额 (RM)</th>
                    <th className="px-4 py-3 text-center">支付状态</th>
                    <th className="px-4 py-3 text-center">💳 支付时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {restOrders.map((order, index) => (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{order.plant || 'Plant2'} #{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{order.mealName || '套餐'}</div>
                        {order.sideItems && order.sideItems.length > 0 && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            配菜: {order.sideItems.join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-900">
                        RM {order.price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {order.isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            已支付 {order.receiptUrl ? '(含截图)' : ''}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-bold">
                            待支付
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {order.paymentTime ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70 whitespace-nowrap">
                            <Clock className="w-3 h-3 text-emerald-500 shrink-0" />
                            {formatPenangDateTime(order.paymentTime)}
                          </span>
                        ) : order.isPaid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 whitespace-nowrap">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            {formatPenangDateTime(order.createdAt)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-300 italic">--</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Gallery of Uploaded Receipts */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Eye className="w-4 h-4 text-rose-500" />
              员工转账凭证截图展台 ({paidOrdersWithReceipts.length} 张)
            </h3>
            <span className="text-xs text-slate-400">点击任意图片可放大核对</span>
          </div>

          {paidOrdersWithReceipts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              暂无已上传的员工转账截图凭证
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {paidOrdersWithReceipts.map((o, idx) => (
                <div key={o.id} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-3 flex flex-col justify-between">
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span>凭证 #{idx + 1} ({o.plant || 'Plant2'})</span>
                      <span className="text-emerald-600">RM {o.price.toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {o.mealName || '套餐'}
                    </div>
                    {/* Payment Timestamp */}
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-50/80 px-1.5 py-0.5 rounded border border-emerald-200/60">
                      <Clock className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                      <span className="truncate">
                        {formatPenangDateTime(o.paymentTime || o.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="h-52 bg-white rounded-lg border border-slate-200 overflow-hidden relative group">
                    <img 
                      src={o.receiptUrl} 
                      alt={o.name} 
                      className="w-full h-full object-contain cursor-pointer group-hover:scale-105 transition-transform" 
                      onClick={() => setPreviewImage(o.receiptUrl || null)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Lightbox Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full max-h-[90vh] bg-white rounded-2xl overflow-hidden flex flex-col shadow-2xl">
            <div className="p-3 bg-slate-800 text-white flex items-center justify-between">
              <span className="text-xs font-bold">凭证原图预览</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex-1 flex items-center justify-center overflow-auto">
              <img src={previewImage} alt="Receipt Full" className="max-h-[75vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
