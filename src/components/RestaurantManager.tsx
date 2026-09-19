/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CustomRestaurant, CustomMenuItem, RmbRates } from '../types';
import { RESTAURANTS } from '../data/menu';
import { 
  DEFAULT_RESTAURANT_A_QR_URL, 
  DEFAULT_RESTAURANT_B_QR_URL, 
  DEFAULT_RESTAURANT_C_QR_URL 
} from '../assets/restaurantQr';
import { Language } from '../i18n';
import {
  Utensils,
  Plus,
  Trash2,
  Upload,
  Save,
  QrCode,
  Eye,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Smartphone,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Check
} from 'lucide-react';

interface RestaurantManagerProps {
  lang?: Language;
  rmbRates?: RmbRates;
  onUpdate?: () => void;
}

export default function RestaurantManager({
  lang = 'zh',
  rmbRates,
  onUpdate
}: RestaurantManagerProps) {
  // Initialize restaurants from rmbRates or defaults
  const initialRestaurants: CustomRestaurant[] = useMemo(() => {
    if (rmbRates?.customRestaurants && Array.isArray(rmbRates.customRestaurants) && rmbRates.customRestaurants.length > 0) {
      return rmbRates.customRestaurants;
    }
    return RESTAURANTS.map(r => ({
      id: r.id,
      name: r.name,
      nameEn: r.nameEn || r.name,
      desc: r.desc || '',
      descEn: r.descEn || r.desc || '',
      note: r.note,
      minQuantity: r.minQuantity,
      qrUrl: r.id === 'A' ? (rmbRates?.restaurantAQrUrl || rmbRates?.restaurantQrUrl || DEFAULT_RESTAURANT_A_QR_URL) :
             r.id === 'B' ? (rmbRates?.restaurantBQrUrl || DEFAULT_RESTAURANT_B_QR_URL) :
             r.id === 'C' ? (rmbRates?.restaurantCQrUrl || DEFAULT_RESTAURANT_C_QR_URL) : undefined,
      mains: r.mains.map(m => ({ id: m.id, name: m.name, nameEn: m.nameEn, price: m.price, desc: m.desc })),
      sides: r.sides.map(s => ({ id: s.id, name: s.name, nameEn: s.nameEn, price: s.priceAddon }))
    }));
  }, [rmbRates]);

  const [restaurants, setRestaurants] = useState<CustomRestaurant[]>(initialRestaurants);
  const [selectedRestId, setSelectedRestId] = useState<string>(() => initialRestaurants[0]?.id || 'A');
  const [isEdited, setIsEdited] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showEmployeePreview, setShowEmployeePreview] = useState(false);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Sync if rmbRates update externally and not currently editing
  useEffect(() => {
    if (!isEdited && initialRestaurants.length > 0) {
      setRestaurants(initialRestaurants);
      if (!initialRestaurants.some(r => r.id === selectedRestId)) {
        setSelectedRestId(initialRestaurants[0].id);
      }
    }
  }, [initialRestaurants, isEdited]);

  // Current active restaurant
  const currentRest = restaurants.find(r => r.id === selectedRestId) || restaurants[0];

  // Helper to get effective QR code for a restaurant
  const getQrUrl = (r: CustomRestaurant): string => {
    if (r.qrUrl) return r.qrUrl;
    if (r.id === 'A') return rmbRates?.restaurantAQrUrl || rmbRates?.restaurantQrUrl || DEFAULT_RESTAURANT_A_QR_URL;
    if (r.id === 'B') return rmbRates?.restaurantBQrUrl || DEFAULT_RESTAURANT_B_QR_URL;
    if (r.id === 'C') return rmbRates?.restaurantCQrUrl || DEFAULT_RESTAURANT_C_QR_URL;
    return '';
  };

  // Read original QR code image without compression/downsampling to guarantee scanability for banking apps
  const readOriginalImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('读取二维码图片失败'));
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  };

  // Save All Restaurants to Backend
  const handleSaveAll = async (overrideList?: CustomRestaurant[]) => {
    const listToSave = overrideList || restaurants;
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurants: listToSave })
      });

      if (!response.ok) {
        throw new Error('保存失败，请检查服务器连接');
      }

      const data = await response.json();
      if (data.restaurants) {
        setRestaurants(data.restaurants);
      }
      setIsEdited(false);
      setSaveMessage({
        type: 'success',
        text: `🎉 所有餐厅与菜单设置已成功保存至云端数据库！`
      });

      if (onUpdate) {
        onUpdate();
      }
    } catch (err: any) {
      setSaveMessage({
        type: 'error',
        text: err.message || '保存失败，请稍后重试'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Add New Restaurant
  const handleAddNewRestaurant = () => {
    // Generate next clean ID (e.g. D, E, F or R_TIMESTAMP)
    const existingIds = new Set(restaurants.map(r => r.id));
    let nextId = '';
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    for (const l of letters) {
      if (!existingIds.has(l)) {
        nextId = l;
        break;
      }
    }
    if (!nextId) {
      nextId = `R_${Date.now().toString(36).toUpperCase().slice(-4)}`;
    }

    const newRest: CustomRestaurant = {
      id: nextId,
      name: lang === 'en' ? `New Restaurant ${nextId}` : `新餐厅 ${nextId}`,
      nameEn: `Restaurant ${nextId}`,
      desc: lang === 'en' ? 'Signature packages & dishes' : '精选特色套餐与招牌美味',
      descEn: 'Signature packages & dishes',
      mains: [
        {
          id: `m_${Date.now()}_1`,
          name: lang === 'en' ? 'Signature Combo' : '招牌精选套餐',
          nameEn: 'Signature Combo',
          price: 15,
          desc: 'RM15'
        }
      ],
      sides: []
    };

    const updated = [...restaurants, newRest];
    setRestaurants(updated);
    setSelectedRestId(newRest.id);
    setIsEdited(true);
    setSaveMessage({
      type: 'success',
      text: `✨ 已新建餐厅【${newRest.name}】！请填写详细菜品并点击保存。`
    });
  };

  // Delete Restaurant
  const handleDeleteRestaurant = (restId: string) => {
    const target = restaurants.find(r => r.id === restId);
    const targetName = target?.name || restId;
    if (!window.confirm(`⚠️ 确定要删除餐厅【${targetName}】及其所有套餐菜单吗？删除后请点击保存以同步至云端。`)) {
      return;
    }

    if (restaurants.length <= 1) {
      alert('系统必须至少保留 1 家餐厅，无法全部删除。');
      return;
    }

    const updated = restaurants.filter(r => r.id !== restId);
    setRestaurants(updated);
    setSelectedRestId(updated[0].id);
    setIsEdited(true);
    setSaveMessage({
      type: 'success',
      text: `已移除餐厅【${targetName}】。请点击右上角【💾 保存所有更改】生效。`
    });
  };

  // Update Restaurant General Fields
  const handleUpdateRestInfo = (restId: string, field: keyof CustomRestaurant, value: any) => {
    setIsEdited(true);
    setRestaurants(prev => prev.map(r => r.id === restId ? { ...r, [field]: value } : r));
  };

  // Upload QR Code for specific restaurant (Direct full fidelity uncompressed for DuitNow scanability)
  const handleQrUpload = async (restId: string, file: File) => {
    setIsUploadingQr(true);
    setSaveMessage(null);

    try {
      const base64Url = await readOriginalImageFile(file);
      
      // Update local state first
      const updatedList = restaurants.map(r => r.id === restId ? { ...r, qrUrl: base64Url } : r);
      setRestaurants(updatedList);

      // Save directly to server via /api/restaurants/qr endpoint
      const res = await fetch('/api/restaurants/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: restId, qrUrl: base64Url })
      });

      if (!res.ok) {
        throw new Error('二维码保存到服务器失败');
      }

      const restName = updatedList.find(r => r.id === restId)?.name || restId;
      setSaveMessage({
        type: 'success',
        text: `🎉 已成功上传【${restName}】DuitNow 高清原图收款码并同步云端！`
      });

      if (onUpdate) {
        onUpdate();
      }
    } catch (err: any) {
      setSaveMessage({
        type: 'error',
        text: err.message || '二维码上传失败'
      });
    } finally {
      setIsUploadingQr(false);
    }
  };

  // Remove QR Code for specific restaurant
  const handleRemoveQr = async (restId: string) => {
    const target = restaurants.find(r => r.id === restId);
    if (!window.confirm(`确定要移除餐厅【${target?.name || restId}】的收款二维码吗？`)) {
      return;
    }

    try {
      const updatedList = restaurants.map(r => r.id === restId ? { ...r, qrUrl: '' } : r);
      setRestaurants(updatedList);

      const res = await fetch('/api/restaurants/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: restId, qrUrl: '' })
      });

      if (!res.ok) throw new Error('清除收款码失败');

      setSaveMessage({
        type: 'success',
        text: `已清除【${target?.name || restId}】收款二维码并同步云端。`
      });

      if (onUpdate) onUpdate();
    } catch (err: any) {
      setSaveMessage({
        type: 'error',
        text: err.message || '清除收款码失败'
      });
    }
  };

  // Mains Dish Handlers
  const handleAddMainDish = (restId: string) => {
    setIsEdited(true);
    setRestaurants(prev => prev.map(r => {
      if (r.id === restId) {
        const newDish: CustomMenuItem = {
          id: `m_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: lang === 'en' ? 'New Combo' : '新套餐菜品',
          nameEn: 'New Combo',
          price: 15,
          desc: 'RM15'
        };
        return { ...r, mains: [...r.mains, newDish] };
      }
      return r;
    }));
  };

  const handleUpdateMainDish = (restId: string, dishId: string, field: keyof CustomMenuItem, value: any) => {
    setIsEdited(true);
    setRestaurants(prev => prev.map(r => {
      if (r.id === restId) {
        return {
          ...r,
          mains: r.mains.map(m => m.id === dishId ? { ...m, [field]: value } : m)
        };
      }
      return r;
    }));
  };

  const handleDeleteMainDish = (restId: string, dishId: string) => {
    setIsEdited(true);
    setRestaurants(prev => prev.map(r => {
      if (r.id === restId) {
        if (r.mains.length <= 1) {
          alert('每家餐厅至少需保留 1 个主食套餐。');
          return r;
        }
        return {
          ...r,
          mains: r.mains.filter(m => m.id !== dishId)
        };
      }
      return r;
    }));
  };

  // Sides Dish Handlers
  const handleAddSideDish = (restId: string) => {
    setIsEdited(true);
    setRestaurants(prev => prev.map(r => {
      if (r.id === restId) {
        const newSide: CustomMenuItem = {
          id: `s_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: lang === 'en' ? 'New Side (+RM 0)' : '新配菜小吃 (0元)',
          nameEn: 'New Side Item',
          price: 0,
          priceAddon: 0
        };
        return { ...r, sides: [...(r.sides || []), newSide] };
      }
      return r;
    }));
  };

  const handleUpdateSideDish = (restId: string, sideId: string, field: keyof CustomMenuItem, value: any) => {
    setIsEdited(true);
    setRestaurants(prev => prev.map(r => {
      if (r.id === restId) {
        return {
          ...r,
          sides: (r.sides || []).map(s => s.id === sideId ? { ...s, [field]: value } : s)
        };
      }
      return r;
    }));
  };

  const handleDeleteSideDish = (restId: string, sideId: string) => {
    setIsEdited(true);
    setRestaurants(prev => prev.map(r => {
      if (r.id === restId) {
        return {
          ...r,
          sides: (r.sides || []).filter(s => s.id !== sideId)
        };
      }
      return r;
    }));
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
      {/* Header & Global Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
              <Utensils className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">
              🍽️ 餐厅与套餐菜单管理
            </h3>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200/60 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              云端同步就绪
            </span>
          </div>
          <p className="text-xs text-slate-500">
            自定义新增/删除餐厅、上传各餐厅独立 DuitNow 收款二维码、设定主食套餐菜品与加料配菜
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleAddNewRestaurant}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>➕ 新建餐厅</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveAll()}
            disabled={isSaving}
            className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
              isEdited ? 'bg-rose-600 hover:bg-rose-700 ring-2 ring-rose-500/30' : 'bg-slate-800 hover:bg-slate-900'
            }`}
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSaving ? '保存中...' : isEdited ? '💾 保存修改 (有未保存更改)' : '💾 保存所有餐厅与菜单'}</span>
          </button>
        </div>
      </div>

      {/* Save Message Notification */}
      {saveMessage && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all animate-fade-in ${
          saveMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {saveMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{saveMessage.text}</span>
          <button 
            type="button" 
            onClick={() => setSaveMessage(null)} 
            className="ml-auto text-slate-400 hover:text-slate-600 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Restaurant Tabs Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            选择要管理的餐厅 ({restaurants.length} 家)
          </span>
          {isEdited && (
            <span className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md animate-pulse">
              ⚠️ 有未保存的更改，请记得点击上方保存
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80">
          {restaurants.map((rest) => {
            const isSelected = rest.id === selectedRestId;
            const qrExists = !!getQrUrl(rest);
            const mainsCount = rest.mains?.length || 0;

            return (
              <button
                key={rest.id}
                type="button"
                onClick={() => setSelectedRestId(rest.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                  isSelected
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/90 ring-2 ring-rose-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent'
                }`}
              >
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${
                  isSelected ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {rest.id}
                </span>

                <div className="text-left">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>{rest.name}</span>
                    <span 
                      className={`w-2 h-2 rounded-full ${qrExists ? 'bg-emerald-500' : 'bg-amber-400'}`} 
                      title={qrExists ? '已设置收款码' : '未设置收款码'} 
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    {mainsCount} 套餐 {rest.sides?.length ? `• ${rest.sides.length} 配菜` : ''}
                  </div>
                </div>
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleAddNewRestaurant}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
            title="添加新餐厅"
          >
            <Plus className="w-4 h-4" />
            <span>添加餐厅</span>
          </button>
        </div>
      </div>

      {/* Active Restaurant Detailed Workspace */}
      {currentRest && (
        <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 space-y-6">
          {/* Workspace Title Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 bg-rose-500 text-white rounded-xl flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                {currentRest.id}
              </span>
              <div>
                <h4 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <span>{currentRest.name}</span>
                  <span className="text-xs font-normal text-slate-400">ID: {currentRest.id}</span>
                </h4>
                <p className="text-xs text-slate-500">
                  {currentRest.desc || '暂无描述'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEmployeePreview(!showEmployeePreview)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                  showEmployeePreview 
                    ? 'bg-indigo-600 text-white border-indigo-600' 
                    : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{showEmployeePreview ? '收起员工端预览' : '📱 员工端效果预览'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteRestaurant(currentRest.id)}
                className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                title="删除该餐厅"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>删除餐厅</span>
              </button>
            </div>
          </div>

          {/* Section 1: Basic Information & DuitNow QR Box */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Basic Info Fields (7 cols) */}
            <div className="lg:col-span-7 space-y-4 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <span>📝 餐厅基础信息</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    餐厅名称 (中文显示) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={currentRest.name}
                    onChange={(e) => handleUpdateRestInfo(currentRest.id, 'name', e.target.value)}
                    placeholder="例如：Delicious Cuckoo"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    英文名称 (English Name)
                  </label>
                  <input
                    type="text"
                    value={currentRest.nameEn || ''}
                    onChange={(e) => handleUpdateRestInfo(currentRest.id, 'nameEn', e.target.value)}
                    placeholder="e.g. Delicious Cuckoo"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  特色描述 / 招牌简介
                </label>
                <input
                  type="text"
                  value={currentRest.desc || ''}
                  onChange={(e) => handleUpdateRestInfo(currentRest.id, 'desc', e.target.value)}
                  placeholder="例如：丰富主食与特色小吃/配菜"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    起订份数限制 (0 为无限制)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={currentRest.minQuantity || 0}
                    onChange={(e) => handleUpdateRestInfo(currentRest.id, 'minQuantity', Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">如港式烧腊需 3 份以上起订</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    特别提示 / 备忘说明 (选填)
                  </label>
                  <input
                    type="text"
                    value={currentRest.note || ''}
                    onChange={(e) => handleUpdateRestInfo(currentRest.id, 'note', e.target.value)}
                    placeholder="例如：需 3 份以上起订"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>
            </div>

            {/* QR Code Box (5 cols) */}
            <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-rose-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-rose-500" />
                  <span>📱 DuitNow 收款二维码</span>
                </div>
                {getQrUrl(currentRest) ? (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">
                    ✅ 已就绪
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">
                    ⚠️ 未配置
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4">
                {/* QR Code Thumbnail Preview */}
                <div 
                  className="w-24 h-24 bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200 shrink-0 relative group cursor-pointer"
                  onClick={() => {
                    const url = getQrUrl(currentRest);
                    if (url) setPreviewImage(url);
                  }}
                  title="点击放大预览二维码"
                >
                  {getQrUrl(currentRest) ? (
                    <img 
                      src={getQrUrl(currentRest)} 
                      alt="DuitNow QR" 
                      className="w-full h-full object-contain p-1" 
                    />
                  ) : (
                    <div className="text-center p-2">
                      <QrCode className="w-8 h-8 text-slate-300 mx-auto" />
                      <span className="text-[9px] text-slate-400 block mt-1">暂无图片</span>
                    </div>
                  )}

                  {getQrUrl(currentRest) && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                      🔍 放大
                    </div>
                  )}
                </div>

                {/* Upload & Action Controls */}
                <div className="space-y-2 flex-1">
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    员工点餐选择【直接付餐厅】时，页面将展示该收款码（以无损高清原图保存，确保手机银行与电子钱包扫码识别率 100%）。
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        fileInputRefs.current[currentRest.id]?.click();
                      }}
                      disabled={isUploadingQr}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      {isUploadingQr ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>{isUploadingQr ? '上传中...' : getQrUrl(currentRest) ? '更换收款码 (原图)' : '上传高清收款码'}</span>
                    </button>

                    <input
                      ref={(el) => { fileInputRefs.current[currentRest.id] = el; }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          await handleQrUpload(currentRest.id, file);
                          if (e.target) e.target.value = '';
                        }
                      }}
                    />

                    {getQrUrl(currentRest) && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQr(currentRest.id)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                        title="清除此二维码"
                      >
                        清除
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: 套餐主食菜单 (Main Combos & Dishes) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🍱 主食套餐菜单管理 ({currentRest.mains?.length || 0} 道菜品)</span>
                </h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  配置该餐厅在员工点餐时供单选的主菜品、套餐名称和价格 (RM)
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleAddMainDish(currentRest.id)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>➕ 添加套餐菜品</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {currentRest.mains.map((main, mIndex) => (
                <div 
                  key={main.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80 hover:bg-slate-50 transition-colors"
                >
                  <span className="w-6 h-6 bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0">
                    {mIndex + 1}
                  </span>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={main.name}
                        onChange={(e) => handleUpdateMainDish(currentRest.id, main.id, 'name', e.target.value)}
                        placeholder="菜品名称 (如 鸡饭)"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={main.nameEn || ''}
                        onChange={(e) => handleUpdateMainDish(currentRest.id, main.id, 'nameEn', e.target.value)}
                        placeholder="英文名 (English)"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 text-[11px] font-bold text-slate-400">RM</span>
                        <input
                          type="number"
                          step="0.5"
                          min="1"
                          value={main.price}
                          onChange={(e) => handleUpdateMainDish(currentRest.id, main.id, 'price', Number(e.target.value) || 0)}
                          placeholder="价格"
                          className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={main.desc || ''}
                        onChange={(e) => handleUpdateMainDish(currentRest.id, main.id, 'desc', e.target.value)}
                        placeholder="说明备注 (如 招牌香滑鸡饭)"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteMainDish(currentRest.id, main.id)}
                    className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors self-end sm:self-auto"
                    title="删除此菜品"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: 自选小吃 / 加料配菜 (Sides & Add-ons) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🥟 自选小吃与配菜加料 ({currentRest.sides?.length || 0} 项)</span>
                </h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  员工点餐时可多选的配菜或小吃（如例汤 0元，炒饭 +RM2）。若无小吃可不填。
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleAddSideDish(currentRest.id)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>➕ 添加小吃/配菜</span>
              </button>
            </div>

            {(!currentRest.sides || currentRest.sides.length === 0) ? (
              <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                暂未添加自选配菜（员工点餐时将直接选择主食套餐）
              </div>
            ) : (
              <div className="space-y-2.5">
                {currentRest.sides.map((side, sIndex) => (
                  <div 
                    key={side.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80 hover:bg-slate-50 transition-colors"
                  >
                    <span className="w-6 h-6 bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0">
                      {sIndex + 1}
                    </span>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-5">
                        <input
                          type="text"
                          value={side.name}
                          onChange={(e) => handleUpdateSideDish(currentRest.id, side.id, 'name', e.target.value)}
                          placeholder="小吃/配菜名称 (如 馒头 3个)"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          value={side.nameEn || ''}
                          onChange={(e) => handleUpdateSideDish(currentRest.id, side.id, 'nameEn', e.target.value)}
                          placeholder="英文名 (English)"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-[11px] font-bold text-slate-400">+RM</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={side.priceAddon !== undefined ? side.priceAddon : (side.price || 0)}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              handleUpdateSideDish(currentRest.id, side.id, 'priceAddon', val);
                              handleUpdateSideDish(currentRest.id, side.id, 'price', val);
                            }}
                            placeholder="加价 (0为免费)"
                            className="w-full pl-10 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-emerald-600 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSideDish(currentRest.id, side.id)}
                      className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors self-end sm:self-auto"
                      title="删除此配菜"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Live Employee View Interactive Preview */}
          {showEmployeePreview && (
            <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-5 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-black text-indigo-900">📱 员工下单端实际视觉预览 (Live Mobile View)</span>
                </div>
                <span className="text-[10px] text-indigo-600 font-bold bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                  真实点餐交互模式
                </span>
              </div>

              <div className="max-w-md mx-auto bg-white rounded-2xl p-5 border border-slate-200 shadow-md space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <span className="w-7 h-7 bg-rose-500 text-white rounded-lg flex items-center justify-center font-black text-xs">
                    {currentRest.id}
                  </span>
                  <div>
                    <h6 className="text-sm font-black text-slate-800">{currentRest.name}</h6>
                    <p className="text-[11px] text-slate-400">{currentRest.desc}</p>
                  </div>
                </div>

                {/* Sample Mains Radio */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-600 block">选择主食套餐:</span>
                  <div className="grid grid-cols-1 gap-2">
                    {currentRest.mains.map((m, idx) => (
                      <div 
                        key={m.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer ${
                          idx === 0 ? 'bg-rose-50/70 border-rose-300 text-rose-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input type="radio" checked={idx === 0} readOnly className="text-rose-500" />
                          <span>{m.name}</span>
                        </div>
                        <span className="font-mono font-bold text-rose-600">RM {m.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sample Sides Checkbox */}
                {currentRest.sides && currentRest.sides.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-600 block">可选小吃/加料:</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {currentRest.sides.map((s) => (
                        <div key={s.id} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] flex items-center justify-between">
                          <span>{s.name}</span>
                          {(s.priceAddon || s.price || 0) > 0 && (
                            <span className="text-[10px] text-emerald-600 font-bold font-mono">
                              +{s.priceAddon || s.price}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Save Reminder Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
            <div className="text-xs text-slate-500">
              当前正在编辑：<strong className="text-slate-800">【{currentRest.name}】</strong>
            </div>

            <button
              type="button"
              onClick={() => handleSaveAll()}
              disabled={isSaving}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>保存所有餐厅与菜单设置</span>
            </button>
          </div>
        </div>
      )}

      {/* Image Preview Lightbox */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <button 
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="max-w-md w-full max-h-[85vh] overflow-hidden rounded-2xl bg-white p-4 flex flex-col items-center justify-center border border-slate-700 shadow-2xl space-y-3">
            <h5 className="text-xs font-bold text-slate-600">DuitNow 收款二维码高清预览</h5>
            <img 
              src={previewImage} 
              alt="DuitNow QR Full" 
              className="max-h-[70vh] max-w-full object-contain rounded-xl"
              referrerPolicy="no-referrer"
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="w-full py-2 bg-slate-800 text-white text-xs font-bold rounded-xl"
            >
              关闭预览
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
