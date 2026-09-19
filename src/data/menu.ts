/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language } from '../i18n';

export interface MenuItem {
  id: string;
  name: string;
  nameEn?: string;
  nameMs?: string;
  price: number;
  desc?: string;
  descEn?: string;
  descMs?: string;
}

export interface SideItem {
  id: string;
  name: string;
  nameEn?: string;
  nameMs?: string;
  priceAddon: number;
}

export type SideDish = SideItem;

export interface Restaurant {
  id: string;
  name: string;
  nameEn?: string;
  nameMs?: string;
  desc: string;
  descEn?: string;
  descMs?: string;
  description?: string;
  note?: string;
  minQuantity?: number;
  qrUrl?: string;
  mains: MenuItem[];
  sides: SideItem[];
}

export const RESTAURANTS: Restaurant[] = [
  {
    id: 'A',
    name: 'Delicious Cuckoo',
    nameEn: 'Delicious Cuckoo',
    nameMs: 'Delicious Cuckoo',
    desc: '丰富主食与特色小吃/配菜',
    descEn: 'Variety of main dishes & sides/snacks',
    descMs: 'Pelbagai hidangan utama & makanan sampingan',
    mains: [
      { id: 'chicken_rice', name: '鸡饭', nameEn: 'Chicken Rice', nameMs: 'Nasi Ayam', price: 15, desc: '招牌香滑鸡饭 (RM15)', descEn: 'Signature Chicken Rice (RM15)', descMs: 'Nasi Ayam Lazat Istimewa (RM15)' },
      { id: 'mixed_rice', name: '菜饭套餐', nameEn: 'Mixed Meals', nameMs: 'Nasi Campur', price: 18, desc: '两荤两素一汤套餐 (RM18)', descEn: '2 Meat + 2 Veg + 1 Soup (RM18)', descMs: 'Pakej 2 Lauk + 2 Sayur + 1 Sup (RM18)' },
      { id: 'malay_meal', name: '马来餐', nameEn: 'Malay Food', nameMs: 'Makanan Melayu', price: 15, desc: '风味马来餐 (RM15)', descEn: 'Flavorful Malay Food (RM15)', descMs: 'Makanan Melayu Enak (RM15)' },
      { id: 'chinese_muslim', name: '中式穆斯林餐', nameEn: 'Chinese Muslim Food', nameMs: 'Makanan Cina Muslim', price: 15, desc: '清真中式餐 (RM15)', descEn: 'Halal Chinese Muslim Meal (RM15)', descMs: 'Hidangan Cina Muslim Halal (RM15)' },
      { id: 'braised_pork_rice', name: '卤肉饭', nameEn: 'Braised pork rice', nameMs: 'Nasi Braised Pork', price: 15, desc: '香浓卤肉饭 (RM15)', descEn: 'Rich Braised Pork Rice (RM15)', descMs: 'Nasi Braised Pork Lazat (RM15)' },
      { id: 'zhajiang_noodles', name: '炸酱面', nameEn: 'Zha Jiang Noodle', nameMs: 'Mee Zha Jiang', price: 15, desc: '地道炸酱面 (RM15)', descEn: 'Authentic Zha Jiang Noodle (RM15)', descMs: 'Mee Zha Jiang Asli (RM15)' },
      { id: 'dumplings', name: '手工饺子', nameEn: 'Handmade Dumpling', nameMs: 'Dumpling Buatan Tangan', price: 15, desc: '鲜美手工饺子 (RM15)', descEn: 'Fresh Handmade Dumplings (RM15)', descMs: 'Dumpling Buatan Tangan Lazat (RM15)' }
    ],
    sides: [
      { id: 'mantou_3pcs', name: '馒头 3个', nameEn: 'Mantou (3 pcs)', nameMs: 'Mantou (3 biji)', priceAddon: 0 },
      { id: 'steamed_rice', name: '白饭', nameEn: 'Plain Rice', nameMs: 'Nasi Putih', priceAddon: 0 },
      { id: 'fried_rice', name: '炒饭 (+RM2)', nameEn: 'Fried Rice (+RM2)', nameMs: 'Nasi Goreng (+RM2)', priceAddon: 2 },
      { id: 'fried_noodles', name: '炒面 (+RM2)', nameEn: 'Fried Noodle (+RM2)', nameMs: 'Mee Goreng (+RM2)', priceAddon: 2 },
      { id: 'cold_noodles', name: '凉拌面 (+RM2)', nameEn: 'Dry Cold Noodle (+RM2)', nameMs: 'Mee Kering Dingin (+RM2)', priceAddon: 2 },
      { id: 'daily_soup', name: '例汤', nameEn: 'Daily Soup', nameMs: 'Sup Harian', priceAddon: 0 },
      { id: 'sweet_bean_soup', name: '甜豆汤', nameEn: 'Bean Soup', nameMs: 'Sup Kacang Manis', priceAddon: 0 },
      { id: 'chili_soy_sauce_large', name: '辣椒酱油 (大)', nameEn: 'Chili Soya (Large)', nameMs: 'Kicap Cili (Besar)', priceAddon: 0 },
      { id: 'chili_soy_sauce_small', name: '辣椒酱油 (小)', nameEn: 'Chili Soya (Small)', nameMs: 'Kicap Cili (Kecil)', priceAddon: 0 }
    ]
  },
  {
    id: 'B',
    name: 'Fatty Feng',
    nameEn: 'Fatty Feng',
    nameMs: 'Fatty Feng',
    desc: '精选经济菜饭',
    descEn: 'Selected Classic Mixed Meals',
    descMs: 'Nasi Campur Klasik Terpilih',
    mains: [
      { id: 'b_mixed_rice', name: '菜饭', nameEn: 'Mixed Meals', nameMs: 'Nasi Campur', price: 15, desc: '经典经济菜饭 (RM15)', descEn: 'Classic Mixed Meals (RM15)', descMs: 'Nasi Campur Klasik (RM15)' }
    ],
    sides: []
  },
  {
    id: 'C',
    name: '港式烧腊',
    nameEn: 'HK style roasted',
    nameMs: 'Daging Panggang Gaya HK',
    desc: '特色港式烧腊 (需要 3 份以上起订)',
    descEn: 'Special HK style roasted (Min 3 orders required)',
    descMs: 'Daging Panggang Gaya HK Istimewa (Min 3 pesanan diperlukan)',
    note: '需 3 份以上起订',
    minQuantity: 3,
    mains: [
      { id: 'c_roasted_meat_rice', name: '烧腊饭', nameEn: 'HK style roasted rice', nameMs: 'Nasi Daging Panggang HK', price: 15, desc: '港式香烤烧腊饭 (RM15)', descEn: 'HK style roasted rice (RM15)', descMs: 'Nasi Daging Panggang HK (RM15)' }
    ],
    sides: []
  }
];

export function getLocalizedMenuItemName(item: MenuItem, lang: Language = 'zh'): string {
  if (lang === 'en' && item.nameEn) return item.nameEn;
  if (lang === 'ms' && item.nameMs) return item.nameMs;
  return item.name;
}

export function getLocalizedSideItemName(side: SideItem, lang: Language = 'zh'): string {
  if (lang === 'en' && side.nameEn) return side.nameEn;
  if (lang === 'ms' && side.nameMs) return side.nameMs;
  return side.name;
}

export function getLocalizedRestaurantName(restaurant: Restaurant, lang: Language = 'zh'): string {
  if (lang === 'en' && restaurant.nameEn) return restaurant.nameEn;
  if (lang === 'ms' && restaurant.nameMs) return restaurant.nameMs;
  return restaurant.name;
}

export function formatLocalizedSideItem(sideName: string, lang: Language = 'zh'): string {
  if (lang === 'zh') return sideName;
  const restaurantA = RESTAURANTS[0];
  const side = restaurantA.sides.find(s => 
    s.name === sideName || 
    s.name.includes(sideName) || 
    sideName.includes(s.name) ||
    (s.nameEn && sideName.includes(s.nameEn)) ||
    (s.nameMs && sideName.includes(s.nameMs))
  );
  if (side) {
    if (lang === 'en' && side.nameEn) return side.nameEn;
    if (lang === 'ms' && side.nameMs) return side.nameMs;
  }
  // Hardcoded fallback checks for side item strings
  if (sideName.includes('馒头')) return lang === 'en' ? 'Mantou' : 'Mantou';
  if (sideName.includes('白饭')) return lang === 'en' ? 'Plain Rice' : 'Nasi Putih';
  if (sideName.includes('炒饭')) return lang === 'en' ? 'Fried Rice (+RM2)' : 'Nasi Goreng (+RM2)';
  if (sideName.includes('炒面')) return lang === 'en' ? 'Fried Noodle (+RM2)' : 'Mee Goreng (+RM2)';
  if (sideName.includes('凉拌面')) return lang === 'en' ? 'Dry Cold Noodle (+RM2)' : 'Mee Kering Dingin (+RM2)';
  if (sideName.includes('例汤')) return lang === 'en' ? 'Daily Soup' : 'Sup Harian';
  if (sideName.includes('甜豆汤')) return lang === 'en' ? 'Bean Soup' : 'Sup Kacang Manis';
  if (sideName.includes('辣椒酱油')) return lang === 'en' ? 'Chili Soya' : 'Kicap Cili';
  return sideName;
}

export function formatLocalizedMealName(mealName: string | undefined, lang: Language = 'zh'): string {
  if (!mealName) return '';
  if (lang === 'zh') return mealName;
  
  for (const r of RESTAURANTS) {
    for (const m of r.mains) {
      if (m.name === mealName || mealName.includes(m.name) || m.name.includes(mealName)) {
        if (lang === 'en' && m.nameEn) return m.nameEn;
        if (lang === 'ms' && m.nameMs) return m.nameMs;
      }
    }
  }

  if (mealName.includes('鸡饭')) return lang === 'en' ? 'Chicken Rice' : 'Nasi Ayam';
  if (mealName.includes('菜饭')) return lang === 'en' ? 'Mixed Meals' : 'Nasi Campur';
  if (mealName.includes('马来餐')) return lang === 'en' ? 'Malay Food' : 'Makanan Melayu';
  if (mealName.includes('穆斯林')) return lang === 'en' ? 'Chinese Muslim Food' : 'Makanan Cina Muslim';
  if (mealName.includes('卤肉饭')) return lang === 'en' ? 'Braised pork rice' : 'Nasi Braised Pork';
  if (mealName.includes('炸酱面')) return lang === 'en' ? 'Zha Jiang Noodle' : 'Mee Zha Jiang';
  if (mealName.includes('饺子')) return lang === 'en' ? 'Handmade Dumpling' : 'Dumpling Buatan Tangan';
  if (mealName.includes('烧腊')) return lang === 'en' ? 'HK style roasted' : 'Nasi Daging Panggang HK';

  return mealName;
}

// Helper to get all active restaurants merged with custom override if available
export function getActiveRestaurants(customRestaurants?: any[], rmbRates?: any): Restaurant[] {
  if (customRestaurants && Array.isArray(customRestaurants) && customRestaurants.length > 0) {
    return customRestaurants.map(r => ({
      id: r.id,
      name: r.name,
      nameEn: r.nameEn || r.name,
      nameMs: r.nameMs || r.name,
      desc: r.desc || '',
      descEn: r.descEn || r.desc || '',
      descMs: r.descMs || r.desc || '',
      note: r.note,
      minQuantity: r.minQuantity,
      qrUrl: r.qrUrl || (r.id === 'A' ? rmbRates?.restaurantAQrUrl : r.id === 'B' ? rmbRates?.restaurantBQrUrl : r.id === 'C' ? rmbRates?.restaurantCQrUrl : undefined),
      mains: (r.mains || []).map((m: any) => ({
        id: m.id || `m_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: m.name,
        nameEn: m.nameEn || m.name,
        nameMs: m.nameMs || m.name,
        price: Number(m.price) || 0,
        desc: m.desc || `${m.name} (RM${m.price})`
      })),
      sides: (r.sides || []).map((s: any) => ({
        id: s.id || `s_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: s.name,
        nameEn: s.nameEn || s.name,
        nameMs: s.nameMs || s.name,
        priceAddon: Number(s.price || s.priceAddon) || 0
      }))
    }));
  }
  return RESTAURANTS.map(r => ({
    ...r,
    qrUrl: r.id === 'A' ? rmbRates?.restaurantAQrUrl : r.id === 'B' ? rmbRates?.restaurantBQrUrl : r.id === 'C' ? rmbRates?.restaurantCQrUrl : undefined
  }));
}

// Helper to look up restaurant by ID
export function getRestaurantById(id: string, customRestaurants?: any[], rmbRates?: any): Restaurant | undefined {
  const activeList = getActiveRestaurants(customRestaurants, rmbRates);
  return activeList.find(r => r.id === id);
}

// Helper to calculate total price
export function calculateOrderPrice(mainPrice: number, selectedSides: string[]): number {
  let total = mainPrice;
  const restaurantA = RESTAURANTS[0];
  selectedSides.forEach(sideName => {
    const sideObj = restaurantA.sides.find(s => 
      s.name === sideName || 
      s.name.includes(sideName) || 
      (s.nameEn && (s.nameEn === sideName || sideName.includes(s.nameEn))) ||
      (s.nameMs && (s.nameMs === sideName || sideName.includes(s.nameMs)))
    );
    if (sideObj) {
      total += sideObj.priceAddon;
    }
  });
  return total;
}
