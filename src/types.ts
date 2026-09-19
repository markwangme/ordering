/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MealType = 'chicken_rice' | 'mixed_rice' | string;
export type RestaurantId = string;

export interface Order {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  restaurantId?: RestaurantId;
  restaurantName?: string; // 'A餐厅' | 'B餐厅' | 'C餐厅'
  mealType: string;
  mealName?: string; // e.g. '鸡饭', '菜饭套餐', '炸酱面', '烧腊饭'
  sideItems?: string[]; // e.g. ['馒头 3个', '例汤', '炒饭 (+RM 2)']
  price: number;
  isPaid: boolean;
  paymentPlatform: 'WeChat' | 'TNG' | 'Restaurant' | 'RestaurantA' | 'RestaurantB' | 'RestaurantC' | string;
  receiptUrl?: string; // base64 screenshot / receipt photo uploaded by employee
  paymentTime?: string; // timestamp when payment proof was uploaded
  createdAt: string;
  plant?: 'Plant1' | 'Plant2';
  isAdminVerified?: boolean;
}

export interface AdminTransfer {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  screenshotUrl: string; // base64 representation of image
  createdAt: string;
}

export interface CustomMenuItem {
  id: string;
  name: string;
  nameEn?: string;
  price: number;
  desc?: string;
  priceAddon?: number;
}

export interface CustomRestaurant {
  id: string; // 'A' | 'B' | 'C' or dynamic id
  name: string;
  nameEn?: string;
  desc: string;
  descEn?: string;
  note?: string;
  minQuantity?: number;
  qrUrl?: string;
  mains: CustomMenuItem[];
  sides: CustomMenuItem[];
}

export interface RmbRates {
  exchangeRate?: number; // e.g. 1.633333
  rm15RmbPrice: number; // e.g. 24.50
  rm18RmbPrice: number; // e.g. 29.40
  exchangeRateNote?: string;
  wechatQrUrl?: string;
  tngQrUrl?: string;
  restaurantQrUrl?: string; // fallback
  restaurantAQrUrl?: string; // A餐厅 DuitNow QR
  restaurantBQrUrl?: string; // B餐厅 DuitNow QR
  restaurantCQrUrl?: string; // C餐厅 DuitNow QR
  updatedAt?: string;
  customRestaurants?: CustomRestaurant[];
}

export interface StatsSummary {
  totalOrders: number;
  totalAmount: number;
  chickenRiceCount: number;
  mixedRiceCount: number;
  paidCount: number;
  unpaidCount: number;
  wechatCount: number;
  tngCount: number;
  restaurantCount: number;
}

export const APP_BASE_URL = 'https://ordering.ai.studio';

export interface ReminderOrder {
  id: string;
  date: string;
  name: string;
  price: number;
  isPaid: boolean;
  mealName: string;
  restaurantName: string;
  plant: string;
}
