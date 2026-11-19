// Test i funksionit api/notify.js pa internet: Supabase dhe Telegram simulohen me një fetch të rremë.
import assert from 'node:assert/strict';
import {createECDH, randomBytes} from 'node:crypto';
import webpush from 'web-push';

const vapid = webpush.generateVAPIDKeys();
Object.assign(process.env, {
  NOTIFY_SECRET: 'test-secret-123',
  SUPABASE_URL: 'https://demo.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  TELEGRAM_BOT_TOKEN: '123:abc',
  TELEGRAM_CHAT_ID: '-1001,-1002',
  VAPID_PUBLIC_KEY: vapid.publicKey,
  VAPID_PRIVATE_KEY: vapid.privateKey,
  VAPID_SUBJECT: 'mailto:test@example.com',
  APP_URL: 'https://regina.example.com',
});

// Një pajisje e vërtetë (çelësa të vlefshëm) që web-push ta enkriptojë mesazhin.
const ecdh = createECDH('prime256v1'); ecdh.generateKeys();
const sub = {id: 'sub-1', endpoint: 'https://push.example.com/abc', p256dh: ecdh.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url')};

const ORDER = '11111111-2222-3333-4444-555555555555';
const calls = [];
globalThis.fetch = async (url, opts = {}) => {
  calls.push({url: String(url), opts});
  const json = (x) => new Response(JSON.stringify(x), {status: 200, headers: {'Content-Type': 'application/json'}});
  if (String(url).includes('/rest/v1/orders?')) return json([{
    id: ORDER, order_no: 7, notes: 'Për nesër <urgjent>', created_at: '2026-11-19T13:00:00Z', agent_id: 'agent-1',
    status: 'partial', client: {name: 'Termo Projekt', location: 'Istog'}, agent: {full_name: 'Arben'},
    items: [
      {ordered_qty: 27, unit_price: '24.50', variant: {size_label: '25 kg', shade_code: null, product: {name: 'Bau Fassade Full A 1.5mm', department: 'bau-ngjyra'}}},
      {ordered_qty: 10, unit_price: null, variant: {size_label: '25 kg', shade_code: null, product: {name: 'BP 950', department: 'bau-pluhura'}}},
    ],
  }]);
  if (String(url).includes('/rest/v1/push_subscriptions')) return json([sub]);
  if (String(url).includes('/rest/v1/shipments')) return json([{dispatched_at: '2026-11-19T14:00:00Z', items: [{quantity: 25}, {quantity: 10}]}]);
  if (String(url).startsWith('https://api.telegram.org/')) return json({ok: true});
  throw new Error('Unexpected fetch ' + url);
};
// Push-i nuk dërgohet realisht; kontrollojmë që mesazhi enkriptohet dhe shkon te pajisja e duhur.
const pushed = [];
webpush.sendNotification = async (subscription, payload, options) => {
  webpush.generateRequestDetails(subscription, payload, options);   // hedh gabim nëse çelësat/enkriptimi janë gabim
  pushed.push({subscription, payload: JSON.parse(payload)});
  return {statusCode: 201};
};

const {default: handler} = await import('../api/notify.js');
const call = async (headers, body, method = 'POST') => {
  const res = {code: 0, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; }};
  await handler({method, headers, body}, res);
  return res;
};
const auth = {authorization: 'Bearer test-secret-123'};

assert.equal((await call({}, {event: 'order_created', order_id: ORDER})).code, 401, 'pa sekret');
assert.equal((await call({authorization: 'Bearer wrong'}, {event: 'order_created', order_id: ORDER})).code, 401, 'sekret i gabuar');
assert.equal((await call(auth, {event: 'order_created', order_id: 'x'})).code, 400, 'id e pavlefshme');
assert.equal((await call(auth, {}, 'GET')).code, 405);

let r = await call(auth, {event: 'order_created', order_id: ORDER});
assert.equal(r.code, 200, JSON.stringify(r.body));
assert.deepEqual(r.body, {telegram: 2, push: 1});
const tg = calls.filter((c) => c.url.startsWith('https://api.telegram.org/bot123:abc/sendMessage'));
assert.equal(tg.length, 2);
const text = JSON.parse(tg[0].opts.body).text;
assert.match(text, /Porosi e re #00007/);
assert.match(text, /Termo Projekt<\/b> — Istog/);
assert.match(text, /Bau Fassade Full A 1\.5mm · 25 kg — <b>27<\/b> copë \(661,50 €\)/);
assert.match(text, /BP 950 — <b>10<\/b> thasë/);            // pluhurat pa peshë, pa çmim
assert.match(text, /Vlera: 661,50 €<\/b> \(disa produkte pa çmim\)/);
assert.match(text, /Për nesër &lt;urgjent&gt;/);           // HTML i escape-uar
assert.match(text, /https:\/\/regina\.example\.com\/\?order=/);
assert.equal(pushed[0].payload.title, '🧾 Porosi e re #00007');
assert.equal(pushed[0].payload.url, `/?order=${ORDER}`);
const subsQuery = calls.find((c) => c.url.includes('push_subscriptions')).url;
assert.match(subsQuery, /user\.role=in\.\(warehouse,admin\)/);   // vetëm fabrika/admin
assert.ok(calls.every((c) => !c.url.includes('supabase') || c.opts.headers.apikey === 'service-key'));

calls.length = 0; pushed.length = 0;
r = await call(auth, {event: 'shipment', order_id: ORDER});
assert.equal(r.code, 200, JSON.stringify(r.body));
assert.deepEqual(r.body, {push: 1});
assert.match(calls.find((c) => c.url.includes('push_subscriptions')).url, /user_id=eq\.agent-1/);   // agjenti i porosisë
assert.equal(pushed[0].payload.title, '🚚 Porosia #00007 u dërgua');
assert.match(pushed[0].payload.body, /35 njësi/);
assert.ok(!calls.some((c) => c.url.includes('telegram')), 'dërgesat nuk shkojnë në Telegram');

// Pajisja e çregjistruar (410) fshihet nga databaza.
calls.length = 0;
webpush.sendNotification = async () => { const e = new Error('gone'); e.statusCode = 410; throw e; };
r = await call(auth, {event: 'shipment', order_id: ORDER});
assert.deepEqual(r.body, {push: 0});
const del = calls.find((c) => c.opts.method === 'DELETE');
assert.ok(del && del.url.includes('push_subscriptions?id=in.(sub-1)'));

console.log('✓ api/notify: autorizimi, Telegram (2 grupe), push për fabrikën dhe agjentin, pastrimi i pajisjeve të vjetra');
