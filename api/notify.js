// Vercel Serverless Function: POST /api/notify
// Thirret nga databaza (Supabase pg_net) pas çdo porosie të re ose dërgese.
// Dërgon: Telegram (porositë e reja) + Web Push (fabrika/admin për porosi të reja, agjenti për dërgesat e veta).
//
// Variablat (Vercel → Project → Settings → Environment Variables):
//   NOTIFY_SECRET              i njëjti sekret si në tabelën app_config (notify_secret)
//   SUPABASE_URL               https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  çelësi "service_role" / secret – VETËM këtu, kurrë në frontend
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (p.sh. mailto:info@kompania.com)  – për push
//   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (një ose më shumë, të ndara me presje)          – për Telegram
//   APP_URL                    p.sh. https://regina-porosite.vercel.app (për lidhjet në mesazhe)
import webpush from 'web-push';
import {timingSafeEqual} from 'node:crypto';

const env = (k) => (process.env[k] || '').trim();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeEqual(a, b) {
  const x = Buffer.from(a || ''), y = Buffer.from(b || '');
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

async function db(path, {method = 'GET', body} = {}) {
  const res = await fetch(`${env('SUPABASE_URL')}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: env('SUPABASE_SERVICE_ROLE_KEY'),
      Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : {body: JSON.stringify(body)}),
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

const tz = 'Europe/Belgrade';
const fmtTime = (x) => new Intl.DateTimeFormat('sq-AL', {timeZone: tz, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'}).format(new Date(x));
const money = (n) => {
  const [i, d] = (Math.round(Number(n) * 100) / 100).toFixed(2).split('.');
  return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${d} €`;
};
const orderNo = (o) => `#RG-${String(o.order_no || 0).padStart(4, '0')}`;
const html = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const isPowder = (p) => String(p?.department || '').includes('pluhura');
const unitName = (p) => (p?.name || '').includes('Waterproofing') ? 'komplete' : isPowder(p) ? 'thasë' : 'copë';
const itemName = (v) => [v?.product?.name || 'Produkt', v?.shade_code || '', ...(isPowder(v?.product) ? [] : [v?.size_label || ''])].filter(Boolean).join(' · ');

const ORDER_SELECT = 'id,order_no,notes,created_at,agent_id,client:clients(name,location),agent:profiles(full_name),'
  + 'items:order_items(ordered_qty,unit_price,variant:product_variants(size_label,shade_code,product:products(name,department)))';

async function sendTelegram(text) {
  const token = env('TELEGRAM_BOT_TOKEN');
  const chats = env('TELEGRAM_CHAT_ID').split(',').map((s) => s.trim()).filter(Boolean);
  if (!token || !chats.length) return 0;
  let sent = 0;
  for (const chat_id of chats) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({chat_id, text, parse_mode: 'HTML', disable_web_page_preview: true}),
    });
    if (res.ok) sent++;
    else console.warn('Telegram', chat_id, res.status, await res.text());
  }
  return sent;
}

async function sendPush(subs, message) {
  if (!subs.length || !env('VAPID_PUBLIC_KEY') || !env('VAPID_PRIVATE_KEY')) return 0;
  webpush.setVapidDetails(env('VAPID_SUBJECT') || 'mailto:admin@example.com', env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'));
  const payload = JSON.stringify(message);
  const dead = [];
  let sent = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({endpoint: s.endpoint, keys: {p256dh: s.p256dh, auth: s.auth}}, payload, {TTL: 86400, urgency: 'high'});
      sent++;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) dead.push(s.id);   // pajisja e çregjistruar
      else console.warn('Push', err.statusCode, err.body || err.message);
    }
  }));
  if (dead.length) await db(`push_subscriptions?id=in.(${dead.join(',')})`, {method: 'DELETE'});
  return sent;
}

async function onOrderCreated(orderId) {
  const [o] = await db(`orders?id=eq.${orderId}&select=${ORDER_SELECT}`);
  if (!o) return {skipped: 'order not found'};
  const items = o.items || [];
  const priced = items.filter((i) => i.unit_price != null);
  const total = priced.reduce((a, i) => a + Number(i.unit_price) * i.ordered_qty, 0);
  const link = env('APP_URL') ? `${env('APP_URL').replace(/\/$/, '')}/?order=${o.id}` : '';

  let text = `🧾 <b>Porosi e re ${orderNo(o)}</b>\n`
    + `🏢 <b>${html(o.client?.name)}</b> — ${html(o.client?.location)}\n`
    + `👤 ${html(o.agent?.full_name)} · ${html(fmtTime(o.created_at))}\n\n`
    + items.map((i) => `• ${html(itemName(i.variant))} — <b>${i.ordered_qty}</b> ${unitName(i.variant?.product)}`
      + (i.unit_price != null ? ` (${money(Number(i.unit_price) * i.ordered_qty)})` : '')).join('\n');
  if (priced.length) text += `\n\n💶 <b>Vlera: ${money(total)}</b>${priced.length < items.length ? ' (disa produkte pa çmim)' : ''}`;
  if (o.notes) text += `\n📝 ${html(o.notes)}`;
  if (link) text += `\n\n<a href="${html(link)}">Hap porosinë</a>`;

  const subs = await db('push_subscriptions?select=id,endpoint,p256dh,auth,user:profiles!inner(role,active)'
    + '&user.active=eq.true&user.role=in.(warehouse,admin)');
  const [telegram, push] = await Promise.all([
    sendTelegram(text),
    sendPush(subs, {
      title: `🧾 Porosi e re ${orderNo(o)}`,
      body: `${o.client?.name} — ${o.client?.location}\n${items.length} artikuj · ${o.agent?.full_name || ''}`,
      url: `/?order=${o.id}`,
      tag: `order-${o.order_no}`,
    }),
  ]);
  return {telegram, push};
}

async function onShipment(orderId) {
  const [o] = await db(`orders?id=eq.${orderId}&select=id,order_no,status,agent_id,client:clients(name,location)`);
  if (!o) return {skipped: 'order not found'};
  const [sh] = await db(`shipments?order_id=eq.${orderId}&order=dispatched_at.desc&limit=1`
    + '&select=dispatched_at,items:shipment_items(quantity)');
  const units = (sh?.items || []).reduce((a, x) => a + x.quantity, 0);
  const subs = await db(`push_subscriptions?select=id,endpoint,p256dh,auth&user_id=eq.${o.agent_id}`);
  const push = await sendPush(subs, {
    title: `🚚 Porosia ${orderNo(o)} u dërgua`,
    body: `${o.client?.name} — ${o.client?.location}\n${units} njësi${o.status === 'completed' ? ' · porosia u përfundua' : ''}`,
    url: `/?order=${o.id}`,
    tag: `shipment-${o.order_no}`,
  });
  return {push};
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error: 'POST only'});
  if (!safeEqual(req.headers.authorization || '', `Bearer ${env('NOTIFY_SECRET')}`) || !env('NOTIFY_SECRET')) {
    return res.status(401).json({error: 'unauthorized'});
  }
  if (!env('SUPABASE_URL') || !env('SUPABASE_SERVICE_ROLE_KEY')) {
    return res.status(500).json({error: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing'});
  }
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const {event, order_id: orderId} = body;
  if (!UUID.test(orderId || '')) return res.status(400).json({error: 'bad order_id'});
  try {
    if (event === 'order_created') return res.status(200).json(await onOrderCreated(orderId));
    if (event === 'shipment') return res.status(200).json(await onShipment(orderId));
    return res.status(400).json({error: 'unknown event'});
  } catch (err) {
    console.error(err);
    return res.status(500).json({error: 'notify failed'});
  }
}
