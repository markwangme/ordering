/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AdminTransfer } from '../types';
import { Calendar, DollarSign, Image, Eye, X, Receipt, ChevronDown, ChevronUp } from 'lucide-react';
import { translations, Language } from '../i18n';

interface CompanyTransfersListProps {
  lang?: Language;
  transfers: AdminTransfer[];
}

export default function CompanyTransfersList({ lang = 'zh', transfers }: CompanyTransfersListProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const t = translations[lang];

  // Sort transfers by date descending
  const sortedTransfers = [...transfers].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const visibleTransfers = showAll ? sortedTransfers : sortedTransfers.slice(0, 6);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
          <Receipt className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">{t.transferTitle}</h2>
          <p className="text-xs text-slate-500">
            {t.transferSubtitle}
          </p>
        </div>
      </div>

      {sortedTransfers.length === 0 ? (
        <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          <div className="text-3xl mb-2">📜</div>
          <p className="text-sm text-slate-400 font-medium">{t.transferEmpty}</p>
          <p className="text-xs text-slate-300 mt-1">{t.transferEmptySub}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleTransfers.map((transfer) => (
              <div 
                key={transfer.id} 
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-3">
                  {/* Image Thumbnail with zoom hover */}
                  <div 
                    onClick={() => setSelectedImage(transfer.screenshotUrl)}
                    className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-200 cursor-zoom-in shrink-0"
                  >
                    <img 
                      src={transfer.screenshotUrl} 
                      alt="付款截图" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      {transfer.date}
                    </div>
                    <div className="text-sm font-bold text-slate-700">
                      {t.transferActionLabel}
                    </div>
                    <div className="text-xs text-slate-400">
                      {t.transferTimeLabel}: {new Date(transfer.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                {/* Amount Label */}
                <div className="text-right">
                  <div className="text-xs text-slate-400 font-semibold mb-0.5">{t.transferOutAmount}</div>
                  <div className="text-lg font-black text-blue-600 flex items-center justify-end">
                    RM {transfer.amount.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {sortedTransfers.length > 6 && (
            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                {showAll ? (
                  <>
                    <span>{t.transferShowLess}</span>
                    <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>
                      {t.transferShowMore
                        ? t.transferShowMore.replace('{count}', String(sortedTransfers.length))
                        : `展开查看全部 ${sortedTransfers.length} 张打款凭证记录`}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Fullscreen Lightbox Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <button 
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="max-w-3xl w-full max-h-[85vh] overflow-hidden rounded-xl bg-slate-950 flex items-center justify-center border border-slate-800">
            <img 
              src={selectedImage} 
              alt="打款收条大图" 
              className="max-h-[85vh] max-w-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
