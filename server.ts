import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, deleteDoc, Firestore } from 'firebase/firestore';
import { Order, AdminTransfer, RmbRates, CustomRestaurant } from './src/types.js';

// Determine whether to serve pre-built dist assets or use Vite dev middleware
const distIndexPath = path.join(process.cwd(), 'dist/index.html');
const hasDistBuild = fs.existsSync(distIndexPath);
const isProduction = process.env.NODE_ENV === 'production' && hasDistBuild;

const app = express();
const PORT = 3000;
const REMINDER_TIME_ZONE = 'Asia/Kuala_Lumpur';

// Enable gzip/deflate response compression for ultra-fast payload delivery over mobile networks
app.use(compression());

// Set up JSON body parser with limit for base64 uploads
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Data directory and database file configuration (for Local JSON Fallback)
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const JOURNAL_FILE = path.join(DATA_DIR, 'orders_journal.jsonl');

// Helper to write line to append-only journal
function appendToJournal(order: Order) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.appendFileSync(JOURNAL_FILE, JSON.stringify(order) + '\n');
  } catch (err) {
    console.error('Error writing to orders_journal.jsonl:', err);
  }
}

// Replay journal log if db.json is missing or empty
function replayJournalIfEmpty(db: { orders: Order[]; transfers: AdminTransfer[] }) {
  if (db.orders.length === 0 && fs.existsSync(JOURNAL_FILE)) {
    try {
      const content = fs.readFileSync(JOURNAL_FILE, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim().length > 0);
      const ordersMap = new Map<string, Order>();
      
      for (const line of lines) {
        try {
          const order = JSON.parse(line) as Order;
          if (order && order.id) {
            ordersMap.set(order.id, order);
          }
        } catch (e) {
          // ignore corrupted lines
        }
      }

      if (ordersMap.size > 0) {
        db.orders = Array.from(ordersMap.values());
        console.log(`🎉 [Recovery] Automatically restored ${db.orders.length} orders from orders_journal.jsonl`);
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
      }
    } catch (err) {
      console.error('Error replaying journal:', err);
    }
  }
}

// Initialize local database
function initDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ orders: [], transfers: [] }, null, 2));
  }
}

initDb();

// Helper to read local database
function readDb(): { orders: Order[]; transfers: AdminTransfer[] } {
  try {
    initDb();
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    replayJournalIfEmpty(parsed);
    return parsed;
  } catch (error) {
    console.error('Error reading database:', error);
    return { orders: [], transfers: [] };
  }
}

// Helper to write local database
function writeDb(data: { orders: Order[]; transfers: AdminTransfer[] }) {
  try {
    initDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing database:', error);
  }
}

// Firebase Cloud Firestore Configuration (Web JS SDK)
let dbFirestore: Firestore | null = null;
let isFirebaseInitialized = false;

function getFirestoreDB(): Firestore | null {
  if (isFirebaseInitialized) return dbFirestore;

  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (cfg && cfg.projectId) {
        const apps = getApps();
        const firebaseApp = apps.length === 0 ? initializeApp(cfg) : apps[0];
        dbFirestore = getFirestore(firebaseApp, cfg.firestoreDatabaseId || undefined);
        isFirebaseInitialized = true;
        console.log(`🎉 [Firebase] Connected to Google Cloud Firestore (${cfg.projectId} / ${cfg.firestoreDatabaseId})`);
        return dbFirestore;
      }
    } catch (e) {
      console.error('Error initializing Firebase Web SDK with firebase-applet-config.json:', e);
    }
  }

  isFirebaseInitialized = true;
  console.log('ℹ️ [Database] Firebase credentials not found. Using local JSON file storage.');
  return null;
}

// Database abstract storage layers & In-Memory Performance Cache (Instant <1ms response)
let cachedOrders: { data: Order[]; expiresAt: number } | null = null;
let cachedTransfers: { data: AdminTransfer[]; expiresAt: number } | null = null;
let cachedRates: { data: RmbRates; expiresAt: number } | null = null;
let cachedVisitorPasscode: { data: string; expiresAt: number } | null = null;
let cachedAdminPasscode: { data: string; expiresAt: number } | null = null;
const CACHE_TTL_MS = 20000; // 20s in-memory cache, auto-invalidated instantly on write

async function getOrdersAsync(): Promise<Order[]> {
  const now = Date.now();
  if (cachedOrders && cachedOrders.expiresAt > now) {
    return cachedOrders.data;
  }

  const firestore = getFirestoreDB();
  if (firestore) {
    try {
      const snapshot = await getDocs(collection(firestore, 'orders'));
      const orders: Order[] = [];
      snapshot.forEach(docSnap => {
        orders.push({ id: docSnap.id, ...docSnap.data() } as Order);
      });
      // Sort chronologically by createdAt
      const sorted = orders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      cachedOrders = { data: sorted, expiresAt: now + CACHE_TTL_MS };
      return sorted;
    } catch (err) {
      console.error('Error fetching orders from Firestore, falling back to local JSON:', err);
    }
  }
  const localOrders = readDb().orders;
  cachedOrders = { data: localOrders, expiresAt: now + CACHE_TTL_MS };
  return localOrders;
}

// System Capacity, Quota & Pruning Configuration
let maxOrdersLimit = 5000;
let autoPruneEnabled = true;

async function enforcePruningIfOverCapacity() {
  if (!autoPruneEnabled) return;
  try {
    const orders = await getOrdersAsync();
    if (orders.length > maxOrdersLimit) {
      const excessCount = orders.length - maxOrdersLimit;
      const oldestToPrune = orders.slice(0, excessCount);
      for (const oldOrder of oldestToPrune) {
        if (oldOrder.id) {
          await deleteOrderAsync(oldOrder.id);
        }
      }
      console.log(`🧹 [FIFO Prune] Auto pruned ${excessCount} oldest orders to maintain capacity limit (${maxOrdersLimit})`);
    }
  } catch (e) {
    console.error('Error during auto-prune:', e);
  }
}

async function saveOrderAsync(order: Order): Promise<void> {
  // Invalidate in-memory cache immediately
  cachedOrders = null;

  const cleanOrder: any = {};
  for (const [k, v] of Object.entries(order)) {
    if (v !== undefined) {
      cleanOrder[k] = v;
    }
  }

  const firestore = getFirestoreDB();
  if (firestore) {
    try {
      await setDoc(doc(firestore, 'orders', order.id), cleanOrder, { merge: true });
    } catch (err) {
      console.error('Error saving order to Firestore, falling back to local JSON:', err);
    }
  }

  const db = readDb();
  const existingIdx = db.orders.findIndex(o => o.id === order.id);
  if (existingIdx >= 0) {
    db.orders[existingIdx] = cleanOrder;
  } else {
    db.orders.push(cleanOrder);
  }
  writeDb(db);
  appendToJournal(cleanOrder);

  // Trigger FIFO capacity check asynchronously
  enforcePruningIfOverCapacity();
}

async function deleteOrderAsync(id: string): Promise<boolean> {
  // Invalidate in-memory cache immediately
  cachedOrders = null;

  const firestore = getFirestoreDB();
  if (firestore) {
    try {
      await deleteDoc(doc(firestore, 'orders', id));
    } catch (err) {
      console.error('Error deleting order from Firestore, falling back to local JSON:', err);
    }
  }
  const db = readDb();
  db.orders = db.orders.filter(o => o.id !== id);
  writeDb(db);
  return true;
}

async function getTransfersAsync(): Promise<AdminTransfer[]> {
  const now = Date.now();
  if (cachedTransfers && cachedTransfers.expiresAt > now) {
    return cachedTransfers.data;
  }

  const firestore = getFirestoreDB();
  if (firestore) {
    try {
      const snapshot = await getDocs(collection(firestore, 'transfers'));
      const transfers: AdminTransfer[] = [];
      snapshot.forEach(docSnap => {
        transfers.push({ id: docSnap.id, ...docSnap.data() } as AdminTransfer);
      });
      const sorted = transfers.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      cachedTransfers = { data: sorted, expiresAt: now + CACHE_TTL_MS };
      return sorted;
    } catch (err) {
      console.error('Error fetching transfers from Firestore, falling back to local JSON:', err);
    }
  }
  const localTransfers = readDb().transfers;
  cachedTransfers = { data: localTransfers, expiresAt: now + CACHE_TTL_MS };
  return localTransfers;
}

async function saveTransferAsync(transfer: AdminTransfer): Promise<void> {
  cachedTransfers = null;

  const cleanTransfer: any = {};
  for (const [k, v] of Object.entries(transfer)) {
    if (v !== undefined) {
      cleanTransfer[k] = v;
    }
  }

  const firestore = getFirestoreDB();
  if (firestore) {
    try {
      await setDoc(doc(firestore, 'transfers', transfer.id), cleanTransfer, { merge: true });
    } catch (err) {
      console.error('Error saving transfer to Firestore, falling back to local JSON:', err);
    }
  }
  const db = readDb();
  db.transfers.push(cleanTransfer);
  writeDb(db);
}

async function deleteTransferAsync(id: string): Promise<boolean> {
  cachedTransfers = null;

  const firestore = getFirestoreDB();
  if (firestore) {
    try {
      await deleteDoc(doc(firestore, 'transfers', id));
      return true;
    } catch (err) {
      console.error('Error deleting transfer from Firestore, falling back to local JSON:', err);
    }
  }
  const db = readDb();
  const initialLength = db.transfers.length;
  db.transfers = db.transfers.filter(t => t.id !== id);
  if (db.transfers.length === initialLength) {
    return false;
  }
  writeDb(db);
  return true;
}

async function getAdminPasscodeAsync(): Promise<string> {
  const now = Date.now();
  if (cachedAdminPasscode && cachedAdminPasscode.expiresAt > now) {
    return cachedAdminPasscode.data;
  }

  const firestore = getFirestoreDB();
  if (firestore) {
    try {
      const snap = await getDoc(doc(firestore, 'config', 'admin_passcode'));
      if (snap.exists()) {
        const pass = snap.data()?.passcode || 'admin888';
        cachedAdminPasscode = { data: pass, expiresAt: now + CACHE_TTL_MS };
        return pass;
      } else {
        await setDoc(doc(firestore, 'config', 'admin_passcode'), { passcode: 'admin888' });
        cachedAdminPasscode = { data: 'admin888', expiresAt: now + CACHE_TTL_MS };
        return 'admin888';
      }
    } catch (err) {
      console.error('Error getting passcode from Firestore:', err);
    }
  }
  const db = readDb();
  if (!(db as any).adminPasscode) {
    (db as any).adminPasscode = 'admin888';
    writeDb(db);
  }
  const pass = (db as any).adminPasscode;
  cachedAdminPasscode = { data: pass, expiresAt: now + CACHE_TTL_MS };
  return pass;
}

async function saveAdminPasscodeAsync(newPasscode: string): Promise<void> {
  cachedAdminPasscode = null;

  const firestore = getFirestoreDB();
  if (firestore) {
    try {
      await setDoc(doc(firestore, 'config', 'admin_passcode'), { passcode: newPasscode }, { merge: true });
      return;
    } catch (err) {
      console.error('Error saving passcode to Firestore:', err);
    }
  }
  const db = readDb();
  (db as any).adminPasscode = newPasscode;
  writeDb(db);
}

// Visitor Team Passcode Logic
async function getVisitorPasscodeAsync(): Promise<string> {
  const now = Date.now();
  if (cachedVisitorPasscode && cachedVisitorPasscode.expiresAt > now) {
    return cachedVisitorPasscode.data;
  }

  const firestore = getFirestoreDB();
  if (firestore) {
    try {
      const snap = await getDoc(doc(firestore, 'config', 'visitor_passcode'));
      if (snap.exists()) {
        const pass = snap.data()?.passcode || 'lunch888';
        cachedVisitorPasscode = { data: pass, expiresAt: now + CACHE_TTL_MS };
        return pass;
      } else {
        await setDoc(doc(firestore, 'config', 'visitor_passcode'), { passcode: 'lunch888' });
        cachedVisitorPasscode = { data: 'lunch888', expiresAt: now + CACHE_TTL_MS };
        return 'lunch888';
      }
    } catch (err) {
      console.error('Error getting visitor passcode from Firestore:', err);
    }
  }
  const db = readDb();
  if (!(db as any).visitorPasscode) {
    (db as any).visitorPasscode = 'lunch888';
    writeDb(db);
  }
  const pass = (db as any).visitorPasscode;
  cachedVisitorPasscode = { data: pass, expiresAt: now + CACHE_TTL_MS };
  return pass;
}

async function saveVisitorPasscodeAsync(newPasscode: string): Promise<void> {
  cachedVisitorPasscode = null;

  const firestore = getFirestoreDB();
  if (firestore) {
    try {
      await setDoc(doc(firestore, 'config', 'visitor_passcode'), { passcode: newPasscode }, { merge: true });
      return;
    } catch (err) {
      console.error('Error saving visitor passcode to Firestore:', err);
    }
  }
  const db = readDb();
  (db as any).visitorPasscode = newPasscode;
  writeDb(db);
}

import { 
  DEFAULT_RESTAURANT_QR_URL, 
  DEFAULT_RESTAURANT_A_QR_URL, 
  DEFAULT_RESTAURANT_B_QR_URL, 
  DEFAULT_RESTAURANT_C_QR_URL 
} from './src/assets/restaurantQr.js';

async function getRmbRatesAsync(): Promise<RmbRates> {
  const now = Date.now();
  if (cachedRates && cachedRates.expiresAt > now) {
    return cachedRates.data;
  }

  const firestore = getFirestoreDB();
  if (firestore) {
    try {
      const snap = await getDoc(doc(firestore, 'config', 'rmb_rates'));
      if (snap.exists()) {
        const data = snap.data() as RmbRates;
        if (data.exchangeRate === undefined && data.rm15RmbPrice) {
          data.exchangeRate = Number((data.rm15RmbPrice / 15).toFixed(6));
        }
        if (!data.restaurantQrUrl) data.restaurantQrUrl = DEFAULT_RESTAURANT_A_QR_URL;
        if (!data.restaurantAQrUrl) data.restaurantAQrUrl = DEFAULT_RESTAURANT_A_QR_URL;
        if (!data.restaurantBQrUrl) data.restaurantBQrUrl = DEFAULT_RESTAURANT_B_QR_URL;
        if (!data.restaurantCQrUrl) data.restaurantCQrUrl = DEFAULT_RESTAURANT_C_QR_URL;
        cachedRates = { data, expiresAt: now + CACHE_TTL_MS };
        return data;
      } else {
        const defaultRates: RmbRates = {
          exchangeRate: 1.633333,
          rm15RmbPrice: 24.5,
          rm18RmbPrice: 29.4,
          exchangeRateNote: '依据每周实际支付汇率及成本平均计算',
          restaurantQrUrl: DEFAULT_RESTAURANT_A_QR_URL,
          restaurantAQrUrl: DEFAULT_RESTAURANT_A_QR_URL,
          restaurantBQrUrl: DEFAULT_RESTAURANT_B_QR_URL,
          restaurantCQrUrl: DEFAULT_RESTAURANT_C_QR_URL,
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(firestore, 'config', 'rmb_rates'), defaultRates);
        cachedRates = { data: defaultRates, expiresAt: now + CACHE_TTL_MS };
        return defaultRates;
      }
    } catch (err) {
      console.error('Error getting RMB rates from Firestore:', err);
    }
  }
  const db = readDb();
  if (!(db as any).rmbRates) {
    (db as any).rmbRates = {
      exchangeRate: 1.633333,
      rm15RmbPrice: 24.5,
      rm18RmbPrice: 29.4,
      exchangeRateNote: '依据每周实际支付汇率及成本平均计算',
      restaurantQrUrl: DEFAULT_RESTAURANT_A_QR_URL,
      restaurantAQrUrl: DEFAULT_RESTAURANT_A_QR_URL,
      restaurantBQrUrl: DEFAULT_RESTAURANT_B_QR_URL,
      restaurantCQrUrl: DEFAULT_RESTAURANT_C_QR_URL,
      updatedAt: new Date().toISOString()
    };
    writeDb(db);
  }
  if (!(db as any).rmbRates.restaurantQrUrl) (db as any).rmbRates.restaurantQrUrl = DEFAULT_RESTAURANT_A_QR_URL;
  if (!(db as any).rmbRates.restaurantAQrUrl) (db as any).rmbRates.restaurantAQrUrl = DEFAULT_RESTAURANT_A_QR_URL;
  if (!(db as any).rmbRates.restaurantBQrUrl) (db as any).rmbRates.restaurantBQrUrl = DEFAULT_RESTAURANT_B_QR_URL;
  if (!(db as any).rmbRates.restaurantCQrUrl) (db as any).rmbRates.restaurantCQrUrl = DEFAULT_RESTAURANT_C_QR_URL;
  const rates = (db as any).rmbRates;
  cachedRates = { data: rates, expiresAt: now + CACHE_TTL_MS };
  return rates;
}

function sanitizeObjectForFirestore(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  return JSON.parse(JSON.stringify(obj, (key, value) => (value === undefined ? null : value)));
}

async function saveRmbRatesAsync(rates: Partial<RmbRates>): Promise<RmbRates> {
  cachedRates = null;

  const current = await getRmbRatesAsync();
  const rate = rates.exchangeRate !== undefined ? Number(rates.exchangeRate) : (current.exchangeRate || 1.633333);
  const rm15RmbPrice = rates.rm15RmbPrice !== undefined ? Number(rates.rm15RmbPrice) : Number((15 * rate).toFixed(2));
  const rm18RmbPrice = rates.rm18RmbPrice !== undefined ? Number(rates.rm18RmbPrice) : Number((18 * rate).toFixed(2));

  const updated: RmbRates = {
    exchangeRate: rate,
    rm15RmbPrice,
    rm18RmbPrice,
    exchangeRateNote: rates.exchangeRateNote !== undefined ? rates.exchangeRateNote : (current.exchangeRateNote || ''),
    wechatQrUrl: rates.wechatQrUrl !== undefined ? rates.wechatQrUrl : (current.wechatQrUrl || ''),
    tngQrUrl: rates.tngQrUrl !== undefined ? rates.tngQrUrl : (current.tngQrUrl || ''),
    restaurantQrUrl: rates.restaurantQrUrl !== undefined ? rates.restaurantQrUrl : (current.restaurantQrUrl || DEFAULT_RESTAURANT_A_QR_URL),
    restaurantAQrUrl: rates.restaurantAQrUrl !== undefined ? rates.restaurantAQrUrl : (current.restaurantAQrUrl || DEFAULT_RESTAURANT_A_QR_URL),
    restaurantBQrUrl: rates.restaurantBQrUrl !== undefined ? rates.restaurantBQrUrl : (current.restaurantBQrUrl || DEFAULT_RESTAURANT_B_QR_URL),
    restaurantCQrUrl: rates.restaurantCQrUrl !== undefined ? rates.restaurantCQrUrl : (current.restaurantCQrUrl || DEFAULT_RESTAURANT_C_QR_URL),
    customRestaurants: rates.customRestaurants !== undefined ? rates.customRestaurants : current.customRestaurants,
    updatedAt: new Date().toISOString()
  };

  const firestore = getFirestoreDB();
  if (firestore) {
    try {
      const sanitized = sanitizeObjectForFirestore(updated);
      await setDoc(doc(firestore, 'config', 'rmb_rates'), sanitized, { merge: true });
      console.log('🎉 [Firestore] Successfully saved RMB rates, QR codes, and custom restaurants to Cloud Firestore!');
    } catch (err) {
      console.error('Error saving RMB rates to Firestore:', err);
    }
  }
  const db = readDb();
  (db as any).rmbRates = updated;
  writeDb(db);
  return updated;
}

// API Endpoints

// Get RMB rates / meal prices
app.get('/api/rates', async (req, res) => {
  const rates = await getRmbRatesAsync();
  res.json(rates);
});

// Update RMB rates / meal prices & QR Code images (Admin)
app.post('/api/rates', async (req, res) => {
  const { 
    exchangeRate, 
    rm15RmbPrice, 
    rm18RmbPrice, 
    exchangeRateNote, 
    wechatQrUrl, 
    tngQrUrl, 
    restaurantQrUrl,
    restaurantAQrUrl,
    restaurantBQrUrl,
    restaurantCQrUrl,
    customRestaurants
  } = req.body;

  let rate = exchangeRate !== undefined ? Number(exchangeRate) : undefined;
  let p15 = rm15RmbPrice !== undefined ? Number(rm15RmbPrice) : undefined;
  let p18 = rm18RmbPrice !== undefined ? Number(rm18RmbPrice) : undefined;

  if (rate === undefined && p15 === undefined && customRestaurants === undefined && wechatQrUrl === undefined && restaurantAQrUrl === undefined) {
    // If just updating customRestaurants or QR codes
    const current = await getRmbRatesAsync();
    rate = current.exchangeRate;
  }

  if (rate !== undefined && !isNaN(rate)) {
    p15 = Number((15 * rate).toFixed(2));
    p18 = Number((18 * rate).toFixed(2));
  } else if (p15 !== undefined && !isNaN(p15)) {
    rate = Number((p15 / 15).toFixed(6));
    if (p18 === undefined || isNaN(p18)) {
      p18 = Number((18 * rate).toFixed(2));
    }
  }

  const updated = await saveRmbRatesAsync({
    exchangeRate: rate,
    rm15RmbPrice: p15,
    rm18RmbPrice: p18,
    exchangeRateNote: exchangeRateNote !== undefined ? exchangeRateNote : undefined,
    wechatQrUrl,
    tngQrUrl,
    restaurantQrUrl,
    restaurantAQrUrl,
    restaurantBQrUrl,
    restaurantCQrUrl,
    customRestaurants
  });
  res.json(updated);
});

// Dedicated Restaurants Endpoints

// Get all custom restaurants
app.get('/api/restaurants', async (req, res) => {
  try {
    const firestore = getFirestoreDB();
    let restaurants: CustomRestaurant[] = [];

    if (firestore) {
      try {
        const snap = await getDocs(collection(firestore, 'restaurants'));
        if (!snap.empty) {
          snap.forEach(docSnap => {
            restaurants.push({ id: docSnap.id, ...docSnap.data() } as CustomRestaurant);
          });
        }
      } catch (e) {
        console.error('Error fetching restaurants collection from Firestore:', e);
      }
    }

    if (restaurants.length === 0) {
      const rates = await getRmbRatesAsync();
      restaurants = rates.customRestaurants || [];
    }

    if (!restaurants || !Array.isArray(restaurants) || restaurants.length === 0) {
      restaurants = [
        {
          id: 'A',
          name: 'Delicious Cuckoo',
          nameEn: 'Delicious Cuckoo',
          desc: '丰富主食与特色小吃/配菜',
          descEn: 'Variety of main dishes & sides/snacks',
          qrUrl: DEFAULT_RESTAURANT_A_QR_URL,
          mains: [
            { id: 'chicken_rice', name: '鸡饭', nameEn: 'Chicken Rice', price: 15, desc: '招牌香滑鸡饭 (RM15)' },
            { id: 'mixed_rice', name: '菜饭套餐', nameEn: 'Mixed Meals', price: 18, desc: '两荤两素一汤套餐 (RM18)' },
            { id: 'malay_meal', name: '马来餐', nameEn: 'Malay Food', price: 15, desc: '风味马来餐 (RM15)' },
            { id: 'chinese_muslim', name: '中式穆斯林餐', nameEn: 'Chinese Muslim Food', price: 15, desc: '清真中式餐 (RM15)' },
            { id: 'braised_pork_rice', name: '卤肉饭', nameEn: 'Braised pork rice', price: 15, desc: '香浓卤肉饭 (RM15)' },
            { id: 'zhajiang_noodles', name: '炸酱面', nameEn: 'Zha Jiang Noodle', price: 15, desc: '地道炸酱面 (RM15)' },
            { id: 'dumplings', name: '手工饺子', nameEn: 'Handmade Dumpling', price: 15, desc: '鲜美手工饺子 (RM15)' }
          ],
          sides: [
            { id: 'mantou_3pcs', name: '馒头 3个', nameEn: 'Mantou (3 pcs)', price: 0, priceAddon: 0 },
            { id: 'steamed_rice', name: '白饭', nameEn: 'Plain Rice', price: 0, priceAddon: 0 },
            { id: 'fried_rice', name: '炒饭 (+RM2)', nameEn: 'Fried Rice (+RM2)', price: 2, priceAddon: 2 },
            { id: 'fried_noodles', name: '炒面 (+RM2)', nameEn: 'Fried Noodle (+RM2)', price: 2, priceAddon: 2 },
            { id: 'cold_noodles', name: '凉拌面 (+RM2)', nameEn: 'Dry Cold Noodle (+RM2)', price: 2, priceAddon: 2 },
            { id: 'daily_soup', name: '例汤', nameEn: 'Daily Soup', price: 0, priceAddon: 0 },
            { id: 'sweet_bean_soup', name: '甜豆汤', nameEn: 'Bean Soup', price: 0, priceAddon: 0 },
            { id: 'chili_soy_sauce_large', name: '辣椒酱油 (大)', nameEn: 'Chili Soya (Large)', price: 0, priceAddon: 0 },
            { id: 'chili_soy_sauce_small', name: '辣椒酱油 (小)', nameEn: 'Chili Soya (Small)', price: 0, priceAddon: 0 }
          ]
        },
        {
          id: 'B',
          name: 'Fatty Feng',
          nameEn: 'Fatty Feng',
          desc: '精选经济菜饭',
          descEn: 'Selected Classic Mixed Meals',
          qrUrl: DEFAULT_RESTAURANT_B_QR_URL,
          mains: [
            { id: 'b_mixed_rice', name: '菜饭', nameEn: 'Mixed Meals', price: 15, desc: '经典经济菜饭 (RM15)' }
          ],
          sides: []
        },
        {
          id: 'C',
          name: '港式烧腊',
          nameEn: 'HK style roasted',
          desc: '特色港式烧腊 (需要 3 份以上起订)',
          descEn: 'Special HK style roasted (Min 3 orders required)',
          note: '需 3 份以上起订',
          minQuantity: 3,
          qrUrl: DEFAULT_RESTAURANT_C_QR_URL,
          mains: [
            { id: 'c_roasted_meat_rice', name: '烧腊饭', nameEn: 'HK style roasted rice', price: 15, desc: '港式香烤烧腊饭 (RM15)' }
          ],
          sides: []
        }
      ];
    }
    res.json(restaurants);
  } catch (err: any) {
    console.error('Error fetching restaurants:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update all custom restaurants
app.post('/api/restaurants', async (req, res) => {
  try {
    const list = Array.isArray(req.body) ? req.body : req.body.restaurants;
    if (!Array.isArray(list)) {
      return res.status(400).json({ error: 'Expected an array of restaurants' });
    }

    const firestore = getFirestoreDB();
    if (firestore) {
      try {
        for (const rest of list) {
          const cleanRest = sanitizeObjectForFirestore(rest);
          await setDoc(doc(firestore, 'restaurants', rest.id), cleanRest, { merge: true });
        }
      } catch (err) {
        console.error('Error saving individual restaurants to Firestore:', err);
      }
    }

    const currentRates = await getRmbRatesAsync();
    const aRest = list.find(r => r.id === 'A');
    const bRest = list.find(r => r.id === 'B');
    const cRest = list.find(r => r.id === 'C');

    const updated = await saveRmbRatesAsync({
      customRestaurants: list,
      restaurantAQrUrl: aRest?.qrUrl || currentRates.restaurantAQrUrl || currentRates.restaurantQrUrl,
      restaurantQrUrl: aRest?.qrUrl || currentRates.restaurantQrUrl || currentRates.restaurantAQrUrl,
      restaurantBQrUrl: bRest?.qrUrl || currentRates.restaurantBQrUrl,
      restaurantCQrUrl: cRest?.qrUrl || currentRates.restaurantCQrUrl,
    });

    res.json({ success: true, restaurants: updated.customRestaurants || list });
  } catch (err: any) {
    console.error('Error saving restaurants:', err);
    res.status(500).json({ error: err.message });
  }
});

// Dedicated fast endpoint to update single restaurant QR code
app.post('/api/restaurants/qr', async (req, res) => {
  try {
    const { restaurantId, qrUrl } = req.body;
    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required' });
    }

    const firestore = getFirestoreDB();
    if (firestore) {
      try {
        await setDoc(doc(firestore, 'restaurants', restaurantId), { qrUrl: qrUrl || '' }, { merge: true });
      } catch (e) {
        console.error('Error updating restaurant QR doc in Firestore:', e);
      }
    }

    const currentRates = await getRmbRatesAsync();
    let list = currentRates.customRestaurants;
    if (!list || !Array.isArray(list) || list.length === 0) {
      list = [
        {
          id: 'A',
          name: 'Delicious Cuckoo',
          nameEn: 'Delicious Cuckoo',
          desc: '丰富主食与特色小吃/配菜',
          qrUrl: DEFAULT_RESTAURANT_A_QR_URL,
          mains: [{ id: 'chicken_rice', name: '鸡饭', price: 15, desc: '招牌香滑鸡饭 (RM15)' }],
          sides: []
        },
        {
          id: 'B',
          name: 'Fatty Feng',
          nameEn: 'Fatty Feng',
          desc: '精选经济菜饭',
          qrUrl: DEFAULT_RESTAURANT_B_QR_URL,
          mains: [{ id: 'b_mixed_rice', name: '菜饭', price: 15, desc: '经典经济菜饭 (RM15)' }],
          sides: []
        },
        {
          id: 'C',
          name: '港式烧腊',
          nameEn: 'HK style roasted',
          desc: '特色港式烧腊 (需要 3 份以上起订)',
          minQuantity: 3,
          qrUrl: DEFAULT_RESTAURANT_C_QR_URL,
          mains: [{ id: 'c_roasted_meat_rice', name: '烧腊饭', price: 15, desc: '港式香烤烧腊饭 (RM15)' }],
          sides: []
        }
      ];
    }

    let found = false;
    list = list.map(r => {
      if (r.id === restaurantId) {
        found = true;
        return { ...r, qrUrl: qrUrl || '' };
      }
      return r;
    });

    if (!found) {
      list.push({
        id: restaurantId,
        name: `餐厅 ${restaurantId}`,
        desc: '特色套餐',
        qrUrl: qrUrl || '',
        mains: [{ id: `m_${Date.now()}`, name: '招牌套餐', price: 15, desc: 'RM15' }],
        sides: []
      });
    }

    const payload: Partial<RmbRates> = {
      customRestaurants: list
    };
    if (restaurantId === 'A') {
      payload.restaurantAQrUrl = qrUrl || '';
      payload.restaurantQrUrl = qrUrl || '';
    } else if (restaurantId === 'B') {
      payload.restaurantBQrUrl = qrUrl || '';
    } else if (restaurantId === 'C') {
      payload.restaurantCQrUrl = qrUrl || '';
    }

    const updated = await saveRmbRatesAsync(payload);
    res.json({ success: true, restaurantId, qrUrl, restaurants: updated.customRestaurants || list });
  } catch (err: any) {
    console.error('Error updating restaurant QR:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get database status to warn users if using ephemeral local fallback
app.get('/api/db-status', (req, res) => {
  const firestore = getFirestoreDB();
  let projectId = process.env.FIREBASE_PROJECT_ID || '';
  if (!projectId && fs.existsSync(path.join(process.cwd(), 'firebase-applet-config.json'))) {
    try {
      const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8'));
      projectId = cfg.projectId || '';
    } catch (e) {}
  }
  res.json({
    isCloud: !!firestore,
    projectId
  });
});

// System Capacity, Storage & Health Monitoring API
app.get('/api/system/health', async (req, res) => {
  const orders = await getOrdersAsync();
  const transfers = await getTransfersAsync();
  const firestore = getFirestoreDB();
  const totalOrdersCount = orders.length;
  const totalTransfersCount = transfers.length;
  const estimatedMemorySizeKb = Math.round((JSON.stringify(orders).length + JSON.stringify(transfers).length) / 1024);
  const usagePercentage = Math.min(100, Math.round((totalOrdersCount / maxOrdersLimit) * 100));

  res.json({
    storageMode: firestore ? 'Firebase Cloud Firestore (已连接云端数据库)' : 'Local JSON File (单机磁盘文件)',
    isCloud: !!firestore,
    projectId: process.env.FIREBASE_PROJECT_ID || 'data-airline-v98sv',
    totalOrdersCount,
    totalTransfersCount,
    estimatedMemorySizeKb,
    maxOrdersLimit,
    autoPruneEnabled,
    usagePercentage,
    isQuotaWarning: usagePercentage >= 80,
    recommendation: usagePercentage >= 80 ? '当前订餐总记录数已接近容量配额限制，系统开启了 FIFO 覆盖机制自动保护极早期数据。' : '系统数据库状态良好，数据具备云端实时冗余。'
  });
});

// Lightweight health endpoint for Cloudflare and uptime checks.  Keep this
// separate from /api/system/health because the latter intentionally exposes
// administrator-facing storage diagnostics.
app.get('/api/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true });
});

function getKualaLumpurDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: REMINDER_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function reminderOrderView(order: Order) {
  return {
    id: order.id,
    date: order.date,
    name: order.name,
    price: order.price,
    isPaid: !!order.isPaid,
    mealName: order.mealName || '',
    restaurantName: order.restaurantName || '',
    plant: order.plant || '',
  };
}

// Small read-only endpoint used by the Cloudflare Worker.  It deliberately
// excludes receiptUrl because receipts are base64 images and can make the
// normal order payload unnecessarily large.
app.get('/api/orders/reminder', async (req, res) => {
  try {
    if (process.env.REMINDER_API_SECRET) {
      const supplied = req.header('x-reminder-secret') || '';
      if (supplied !== process.env.REMINDER_API_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const requestedDate = typeof req.query.date === 'string' && req.query.date
      ? req.query.date
      : getKualaLumpurDate();
    if (!isValidIsoDate(requestedDate)) {
      return res.status(400).json({ error: 'date 必须是 YYYY-MM-DD 格式' });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'x-reminder-secret');
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');

    const orders = await getOrdersAsync();
    res.json(orders.filter(order => order.date === requestedDate).map(reminderOrderView));
  } catch (err: any) {
    console.error('Error reading reminder orders:', err);
    res.status(500).json({ error: '提醒订单读取失败' });
  }
});

app.options('/api/orders/reminder', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'x-reminder-secret');
  res.status(204).end();
});

// Update System Storage Settings & Pruning Thresholds
app.post('/api/system/settings', async (req, res) => {
  const { limit, autoPrune } = req.body;
  if (limit !== undefined && !isNaN(Number(limit))) {
    maxOrdersLimit = Math.max(100, Number(limit));
  }
  if (autoPrune !== undefined) {
    autoPruneEnabled = !!autoPrune;
  }

  // Trigger immediate check if new limit is smaller
  await enforcePruningIfOverCapacity();

  res.json({
    success: true,
    maxOrdersLimit,
    autoPruneEnabled,
    message: '系统容积预警与自动覆盖策略已成功更新！'
  });
});

// Get all orders
app.get('/api/orders', async (req, res) => {
  const orders = await getOrdersAsync();
  res.json(orders);
});

// Create or update order (if name matches for the same date, we update it)
app.post('/api/orders', async (req, res) => {
  const { id, name, mealType, isPaid, paymentPlatform, date, plant, receiptUrl, price, restaurantId, restaurantName, mealName, sideItems } = req.body;

  if (!name || !name.trim() || !date) {
    return res.status(400).json({ error: '姓名和日期是必填项' });
  }

  const trimmedName = name.trim();
  const targetDate = date; // YYYY-MM-DD
  const effectiveMealType = mealType || 'chicken_rice';
  const calculatedPrice = price !== undefined && !isNaN(Number(price)) 
    ? Number(price) 
    : (effectiveMealType === 'mixed_rice' ? 18 : 15);

  // Query/find if record already exists for the person on this date
  const orders = await getOrdersAsync();
  const existingOrder = id 
    ? orders.find(o => o.id === id)
    : orders.find(o => o.date === targetDate && o.name.trim().toLowerCase() === trimmedName.toLowerCase());

  const updatedOrder: Order = {
    id: existingOrder ? existingOrder.id : `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    date: targetDate,
    name: trimmedName,
    restaurantId: restaurantId || existingOrder?.restaurantId || 'A',
    restaurantName: restaurantName || existingOrder?.restaurantName || 'Delicious Cuckoo',
    mealType: effectiveMealType,
    mealName: mealName || existingOrder?.mealName || (effectiveMealType === 'mixed_rice' ? '菜饭套餐' : '鸡饭'),
    sideItems: sideItems !== undefined ? sideItems : (existingOrder?.sideItems || []),
    price: calculatedPrice,
    isPaid: isPaid !== undefined ? !!isPaid : (existingOrder ? !!existingOrder.isPaid : false),
    paymentPlatform: isPaid ? (paymentPlatform || 'Restaurant') : (existingOrder?.paymentPlatform || 'Restaurant'),
    receiptUrl: receiptUrl !== undefined ? receiptUrl : (existingOrder?.receiptUrl || ''),
    paymentTime: isPaid ? (existingOrder?.paymentTime || new Date().toISOString()) : (existingOrder?.paymentTime || ''),
    createdAt: existingOrder ? existingOrder.createdAt : new Date().toISOString(),
    plant: plant || (existingOrder ? existingOrder.plant : 'Plant2'),
    isAdminVerified: existingOrder ? !!existingOrder.isAdminVerified : false,
  };

  await saveOrderAsync(updatedOrder);
  res.json(updatedOrder);
});

// Update payment status, payment platform, and upload payment receipt image
app.post('/api/orders/:id/receipt', async (req, res) => {
  const { id } = req.params;
  const { isPaid, paymentPlatform, receiptUrl, paymentTime } = req.body;

  const orders = await getOrdersAsync();
  const existingOrder = orders.find(o => o.id === id);
  if (!existingOrder) {
    return res.status(404).json({ error: '未找到该订餐记录' });
  }

  existingOrder.isPaid = isPaid !== undefined ? !!isPaid : existingOrder.isPaid;
  if (paymentPlatform !== undefined) {
    existingOrder.paymentPlatform = paymentPlatform;
  }
  if (receiptUrl !== undefined) {
    existingOrder.receiptUrl = receiptUrl;
    // When employee uploads or replaces receipt image, record the upload/payment time
    if (receiptUrl && receiptUrl.trim() !== '') {
      existingOrder.paymentTime = paymentTime || new Date().toISOString();
      existingOrder.isPaid = true;
    }
  }
  if (paymentTime !== undefined) {
    existingOrder.paymentTime = paymentTime;
  } else if (existingOrder.isPaid && !existingOrder.paymentTime) {
    existingOrder.paymentTime = new Date().toISOString();
  }

  await saveOrderAsync(existingOrder);
  res.json(existingOrder);
});

// Delete an order
app.delete('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const success = await deleteOrderAsync(id);

  if (!success) {
    return res.status(404).json({ error: '未找到该订餐记录' });
  }

  res.json({ success: true, message: '订餐记录已删除' });
});

// Toggle admin verification for order payments
app.post('/api/orders/:id/verify', async (req, res) => {
  const { id } = req.params;
  const { isAdminVerified } = req.body;

  const orders = await getOrdersAsync();
  const existingOrder = orders.find(o => o.id === id);
  if (!existingOrder) {
    return res.status(404).json({ error: '未找到该订餐记录' });
  }

  existingOrder.isAdminVerified = !!isAdminVerified;
  await saveOrderAsync(existingOrder);
  res.json(existingOrder);
});

// Batch sync/restore orders from client local cache or backup
app.post('/api/orders/batch-sync', async (req, res) => {
  const { orders: incomingOrders } = req.body;
  if (!Array.isArray(incomingOrders) || incomingOrders.length === 0) {
    return res.status(400).json({ error: '无效的订单恢复列表数据' });
  }

  let restoredCount = 0;
  const existingOrders = await getOrdersAsync();
  
  for (const item of incomingOrders) {
    if (!item || !item.name || !item.date) continue;
    
    // Check if matching order already exists
    const match = existingOrders.find(
      o => (item.id && o.id === item.id) || (o.date === item.date && o.name.trim().toLowerCase() === item.name.trim().toLowerCase())
    );

    if (!match) {
      const orderToSave: Order = {
        id: item.id || `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: item.date,
        name: item.name.trim(),
        restaurantId: item.restaurantId || 'A',
        restaurantName: item.restaurantName || 'Delicious Cuckoo',
        mealType: item.mealType || 'chicken_rice',
        mealName: item.mealName || '鸡饭',
        sideItems: item.sideItems || [],
        price: Number(item.price) || 15,
        isPaid: !!item.isPaid,
        paymentPlatform: item.paymentPlatform || 'Restaurant',
        receiptUrl: item.receiptUrl || '',
        paymentTime: item.paymentTime || (item.isPaid ? new Date().toISOString() : ''),
        createdAt: item.createdAt || new Date().toISOString(),
        plant: item.plant || 'Plant2',
        isAdminVerified: !!item.isAdminVerified
      };
      await saveOrderAsync(orderToSave);
      restoredCount++;
    }
  }

  res.json({ success: true, restoredCount, message: `成功同步并恢复 ${restoredCount} 条订餐记录！` });
});

// Admin export full database backup
app.get('/api/admin/export-db', async (req, res) => {
  const orders = await getOrdersAsync();
  const transfers = await getTransfersAsync();
  const rates = await getRmbRatesAsync();
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="lunch_backup_${new Date().toISOString().slice(0,10)}.json"`);
  res.json({
    version: '1.0',
    exportTime: new Date().toISOString(),
    orders,
    transfers,
    rmbRates: rates
  });
});

// Admin import full database backup
app.post('/api/admin/import-db', async (req, res) => {
  const { orders: importedOrders, transfers: importedTransfers } = req.body;
  
  let restoredOrdersCount = 0;
  let restoredTransfersCount = 0;

  if (Array.isArray(importedOrders) && importedOrders.length > 0) {
    const currentOrders = await getOrdersAsync();
    for (const order of importedOrders) {
      if (!order || !order.name || !order.date) continue;
      const exists = currentOrders.some(
        o => (order.id && o.id === order.id) || (o.date === order.date && o.name.trim().toLowerCase() === order.name.trim().toLowerCase())
      );
      if (!exists) {
        await saveOrderAsync(order);
        restoredOrdersCount++;
      }
    }
  }

  if (Array.isArray(importedTransfers) && importedTransfers.length > 0) {
    const currentTransfers = await getTransfersAsync();
    for (const transfer of importedTransfers) {
      if (!transfer || !transfer.amount || !transfer.date) continue;
      const exists = currentTransfers.some(t => transfer.id && t.id === transfer.id);
      if (!exists) {
        await saveTransferAsync(transfer);
        restoredTransfersCount++;
      }
    }
  }

  res.json({ 
    success: true, 
    restoredOrdersCount, 
    restoredTransfersCount,
    message: `归档文件导入成功！恢复订餐 ${restoredOrdersCount} 条，划款记录 ${restoredTransfersCount} 条` 
  });
});

// Verify admin passcode
app.post('/api/admin/verify', async (req, res) => {
  const { passcode } = req.body;
  const actualPasscode = await getAdminPasscodeAsync();
  if (passcode === actualPasscode) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

// Change admin passcode
app.post('/api/admin/change-password', async (req, res) => {
  const { currentPasscode, newPasscode } = req.body;
  const actualPasscode = await getAdminPasscodeAsync();
  if (currentPasscode !== actualPasscode) {
    return res.status(400).json({ success: false, error: '原管理员密码输入错误' });
  }
  if (!newPasscode || newPasscode.trim().length < 4) {
    return res.status(400).json({ success: false, error: '新管理员密码长度不能少于4位' });
  }
  await saveAdminPasscodeAsync(newPasscode.trim());
  res.json({ success: true });
});

// Verify visitor / employee site passcode
app.post('/api/auth/verify-passcode', async (req, res) => {
  const { passcode } = req.body;
  const actualPasscode = await getVisitorPasscodeAsync();
  if (passcode && passcode.trim().toLowerCase() === actualPasscode.trim().toLowerCase()) {
    res.json({ success: true });
  } else {
    res.json({ success: false, error: '团队访问口令错误，请联系管理员获取最新口令' });
  }
});

// Get current visitor passcode (Admin only)
app.get('/api/admin/visitor-passcode', async (req, res) => {
  const actualPasscode = await getVisitorPasscodeAsync();
  res.json({ passcode: actualPasscode });
});

// Update visitor passcode (Admin only)
app.post('/api/admin/visitor-passcode', async (req, res) => {
  const { newPasscode } = req.body;
  if (!newPasscode || newPasscode.trim().length < 2) {
    return res.status(400).json({ success: false, error: '团队访问口令长度不能少于2位' });
  }
  await saveVisitorPasscodeAsync(newPasscode.trim());
  res.json({ success: true, passcode: newPasscode.trim() });
});

// Get corporate transfers
app.get('/api/transfers', async (req, res) => {
  const transfers = await getTransfersAsync();
  res.json(transfers);
});

// Create corporate transfer record
app.post('/api/transfers', async (req, res) => {
  const { amount, screenshotUrl, date } = req.body;

  if (amount === undefined || !screenshotUrl || !date) {
    return res.status(400).json({ error: '金额、转账截图和日期是必填项' });
  }

  const newTransfer: AdminTransfer = {
    id: `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    date,
    amount: Number(amount),
    screenshotUrl,
    createdAt: new Date().toISOString(),
  };

  await saveTransferAsync(newTransfer);
  res.json(newTransfer);
});

// Delete corporate transfer record
app.delete('/api/transfers/:id', async (req, res) => {
  const { id } = req.params;
  const success = await deleteTransferAsync(id);

  if (!success) {
    return res.status(404).json({ error: '未找到该转账记录' });
  }

  res.json({ success: true, message: '转账记录已删除' });
});

// Vite Integration
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Long-term cache static build assets (JS, CSS, images) with immutable headers
    app.use(express.static(distPath, {
      maxAge: '7d',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    }));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build in progress or index.html missing');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

