export interface Env {
  APP_BASE_URL: string;
  API_BASE_URL?: string;
  WXPUSHER_APP_TOKEN: string;
  WXPUSHER_TOPIC_ID: string;
  NOTIFICATION_SECRET?: string;
  ORDER_API_SECRET?: string;
  WXPUSHER_BINDINGS: KVNamespaceLike;
}

interface KVNamespaceLike {
  get(key: string, type?: 'text' | 'json'): Promise<any>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

// Kept local so the main Google AI Studio project can type-check without
// installing the Cloudflare Workers types just for this optional worker.
interface ScheduledController {
  cron: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface Order {
  id: string;
  date: string;
  name: string;
  price: number;
  isPaid: boolean;
  mealName?: string;
  restaurantName?: string;
  plant?: string;
}

const WXPUSHER_URL = 'https://wxpusher.zjiecode.com/api/send/message';
const TIME_ZONE = 'Asia/Kuala_Lumpur';
const BINDING_TTL_SECONDS = 15 * 60;

function localDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function htmlEscape(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function getOrders(env: Env, date: string): Promise<Order[]> {
  const baseUrl = (env.API_BASE_URL || env.APP_BASE_URL).replace(/\/$/, '');
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (env.ORDER_API_SECRET) headers['x-reminder-secret'] = env.ORDER_API_SECRET;
  let response = await fetch(`${baseUrl}/api/orders/reminder?date=${encodeURIComponent(date)}`, { headers });
  // Backward-compatible fallback while the Google AI Studio deployment is
  // being updated. Once /api/orders/reminder is live this avoids downloading
  // receipt images and keeps the Worker payload small.
  const contentType = response.headers.get('content-type') || '';
  if (response.status === 404 || !contentType.includes('application/json')) {
    response = await fetch(`${baseUrl}/api/orders`, { headers: { Accept: 'application/json' } });
  }
  if (!response.ok) {
    throw new Error(`ordering API returned HTTP ${response.status}`);
  }
  const data = await response.json() as unknown;
  if (!Array.isArray(data)) {
    throw new Error('ordering API did not return an order array');
  }
  return data as Order[];
}

function employeeKey(name: string): string {
  return `employee:${encodeURIComponent(name.trim().toLocaleLowerCase())}`;
}

function bindingKey(token: string): string {
  return `binding:${token}`;
}

function bindingResultKey(token: string): string {
  return `binding-result:${token}`;
}

async function getEmployeeUid(env: Env, name: string): Promise<string | null> {
  const uid = await env.WXPUSHER_BINDINGS.get(employeeKey(name));
  return typeof uid === 'string' && uid ? uid : null;
}

async function createBindingQr(env: Env, employeeName: string): Promise<Response> {
  const token = crypto.randomUUID();
  const expiresAt = Date.now() + BINDING_TTL_SECONDS * 1000;
  await env.WXPUSHER_BINDINGS.put(bindingKey(token), JSON.stringify({ employeeName, expiresAt }), {
    expirationTtl: BINDING_TTL_SECONDS,
  });

  const response = await fetch('https://wxpusher.zjiecode.com/api/fun/create/qrcode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appToken: env.WXPUSHER_APP_TOKEN, extra: token, validTime: BINDING_TTL_SECONDS }),
  });
  const result = await response.json() as { code?: number; msg?: string; data?: { url?: string; shortUrl?: string; code?: string; expires?: number } };
  const qrUrl = result.data?.url || result.data?.shortUrl;
  if (!response.ok || result.code !== 1000 || !qrUrl) {
    throw new Error(`无法创建绑定二维码：${result.msg || response.status}`);
  }
  return Response.json({ token, employeeName, qrUrl, expiresAt }, { headers: { 'Access-Control-Allow-Origin': '*' } });
}

async function handleWxPusherCallback(request: Request, env: Env): Promise<Response> {
  const payload = await request.json() as { action?: string; data?: { uid?: string; extra?: string } };
  if (payload.action !== 'app_subscribe' || !payload.data?.uid || !payload.data.extra) {
    return Response.json({ success: true, ignored: true });
  }
  const token = payload.data.extra;
  const raw = await env.WXPUSHER_BINDINGS.get(bindingKey(token));
  if (!raw) return Response.json({ success: false, error: 'binding expired' }, { status: 410 });
  const binding = JSON.parse(raw) as { employeeName: string; expiresAt: number };
  await env.WXPUSHER_BINDINGS.put(employeeKey(binding.employeeName), payload.data.uid);
  await env.WXPUSHER_BINDINGS.put(bindingResultKey(token), JSON.stringify({ uid: payload.data.uid, employeeName: binding.employeeName }), { expirationTtl: BINDING_TTL_SECONDS });
  return Response.json({ success: true });
}

function appLink(env: Env): string {
  return htmlEscape(env.APP_BASE_URL);
}

async function sendPersonal(env: Env, uid: string, content: string, summary: string): Promise<void> {
  if (!env.WXPUSHER_APP_TOKEN) throw new Error('WXPUSHER_APP_TOKEN is not configured');
  const response = await fetch(WXPUSHER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appToken: env.WXPUSHER_APP_TOKEN, content, summary, contentType: 2, uids: [uid], url: env.APP_BASE_URL, verifyPayType: 0 }),
  });
  const result = await response.json() as { code?: number; msg?: string };
  if (!response.ok || result.code !== 1000) throw new Error(`WxPusher rejected message: ${result.msg || response.status}`);
}

async function sendPersonalOrders(env: Env, orders: Order[], title: string, bodyText: string): Promise<void> {
  const grouped = new Map<string, Order[]>();
  for (const order of orders) {
    const uid = await getEmployeeUid(env, order.name);
    if (!uid) continue;
    const current = grouped.get(uid) || [];
    current.push(order);
    grouped.set(uid, current);
  }
  for (const [uid, personalOrders] of grouped) {
    const rows = personalOrders.map(order => `<li>${htmlEscape(order.mealName || '午餐')} · RM ${Number(order.price || 0).toFixed(2)}</li>`).join('');
    const total = personalOrders.reduce((sum, order) => sum + Number(order.price || 0), 0);
    const content = [`<h2>${title}</h2>`, `<p>${bodyText}</p>`, `<ul>${rows}</ul>`, `<p>合计：<b>RM ${total.toFixed(2)}</b></p>`, `<p><a href="${appLink(env)}">打开订餐系统</a></p>`].join('');
    await sendPersonal(env, uid, content, title);
  }
}

async function orderReminder(env: Env): Promise<void> {
  const today = localDate();
  const orders = await getOrders(env, today);
  await sendPersonalOrders(env, orders, `🍱 ${today} 午餐订餐提醒`, '请确认你的午餐订单和支付状态。');
}

async function paymentReminder(env: Env, secondReminder = false): Promise<void> {
  const today = localDate();
  const unpaid = (await getOrders(env, today)).filter(order => !order.isPaid);
  if (unpaid.length === 0) return;

  await sendPersonalOrders(env, unpaid, `💳 ${today} ${secondReminder ? '第2次' : '第1次'}午餐支付提醒`, '你的订单尚未标记为已支付，请完成转账并上传凭证：');
}

async function run(cron: string, env: Env): Promise<void> {
  if (cron === '30 1 * * *') {
    await orderReminder(env);
  } else if (cron === '0 7 * * *') {
    await paymentReminder(env, false);
  } else if (cron === '0 9 * * *') {
    await paymentReminder(env, true);
  } else {
    // Useful when testing a manually-invoked Worker without a Cron Trigger.
    await orderReminder(env);
    await paymentReminder(env);
  }
}

export default {
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(run(controller.cron, env));
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/wxpusher/callback' && request.method === 'POST') {
      try { return await handleWxPusherCallback(request, env); } catch (error) {
        console.error(error);
        return Response.json({ success: false, error: 'callback failed' }, { status: 500 });
      }
    }
    if (url.pathname === '/binding/start' && request.method === 'POST') {
      try {
        const body = await request.json() as { employeeName?: string };
        const employeeName = body.employeeName?.trim() || '';
        if (!employeeName) return Response.json({ error: 'employeeName is required' }, { status: 400 });
        return await createBindingQr(env, employeeName);
      } catch (error) {
        console.error(error);
        return Response.json({ error: 'unable to create binding QR' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
      }
    }
    if (url.pathname === '/binding/status' && request.method === 'GET') {
      const token = url.searchParams.get('token') || '';
      if (!token) return Response.json({ error: 'token is required' }, { status: 400 });
      const result = await env.WXPUSHER_BINDINGS.get(bindingResultKey(token), 'json');
      return Response.json(result || { status: 'pending' }, { headers: { 'Access-Control-Allow-Origin': '*' } });
    }
    if (url.pathname !== '/run' || request.method !== 'POST') {
      return new Response('WxPusher reminder worker is running', { status: 200 });
    }
    if (env.NOTIFICATION_SECRET && request.headers.get('Authorization') !== `Bearer ${env.NOTIFICATION_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }
    try {
      await run('manual', env);
      return Response.json({ success: true, date: localDate() });
    } catch (error) {
      console.error(error);
      return Response.json({ success: false, error: String(error) }, { status: 500 });
    }
  },
};
