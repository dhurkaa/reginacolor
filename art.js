// Ikonat, logoja dhe ilustrimet e produkteve (SVG inline, pa skedarë të jashtëm).

const ICONS = {
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>',
  plusCircle: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>',
  clipboard: '<rect x="5" y="4.5" width="14" height="16" rx="2"/><path d="M9 4.5V3.8c0-.4.3-.8.8-.8h4.4c.5 0 .8.4.8.8v.7M8.5 10h7M8.5 13.5h7M8.5 17h4"/>',
  bag: '<path d="M5.5 8h13l-1 12.5h-11z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  bell: '<path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  euro: '<path d="M17 6.5A6.5 6.5 0 1 0 17 17.5"/><path d="M5 10.5h8M5 13.5h8"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
  users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 5.2a3.5 3.5 0 0 1 0 6.6M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  logout: '<path d="M14 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H14"/><path d="M10 12h10M16.5 8.5 20 12l-3.5 3.5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  filter: '<path d="M4 5h16l-6.2 7.5V19l-3.6 1.5v-8z"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronUp: '<path d="m6 15 6-6 6 6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  arrowRight: '<path d="M4.5 12h15M14 6.5l5.5 5.5-5.5 5.5"/>',
  arrowLeft: '<path d="M19.5 12h-15M10 6.5 4.5 12l5.5 5.5"/>',
  refresh: '<path d="M19.5 12a7.5 7.5 0 0 1-13.3 4.8M4.5 12A7.5 7.5 0 0 1 17.8 7.2"/><path d="M18.5 3.5v4h-4M5.5 20.5v-4h4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  cart: '<path d="M3 4h2.2l2.3 11h10.3l2-8H6.3"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="16.5" cy="19" r="1.4"/>',
  layers: '<path d="m12 3.5 8.5 4.5-8.5 4.5L3.5 8z"/><path d="m3.5 12 8.5 4.5 8.5-4.5M3.5 16l8.5 4.5 8.5-4.5"/>',
  note: '<path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14.5 3.5V8H19"/>',
  box: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
  boxes: '<path d="m8 3.5 4 2.2v4.5L8 12.4 4 10.2V5.7z"/><path d="m16 3.5 4 2.2v4.5l-4 2.2-4-2.2V5.7zM12 11.6l4 2.2v4.5l-4 2.2-4-2.2v-4.5"/>',
  doc: '<rect x="5.5" y="3.5" width="13" height="17" rx="2"/><path d="M9 8.5h6M9 12h6M9 15.5h4"/>',
  checkCircle: '<circle cx="12" cy="12" r="8.5"/><path d="m8.3 12.2 2.5 2.5 5-5"/>',
  truck: '<path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7z"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  phone: '<rect x="7" y="2.8" width="10" height="18.4" rx="2.2"/><path d="M11 18h2"/>',
  home: '<path d="M4 11.5 12 4.5l8 7"/><path d="M6 10v10h12V10"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
  printer: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="7" rx="1.6"/><path d="M7 14h10v6H7z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  tag: '<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3-8.7 8.7z"/><circle cx="8" cy="8" r="1.3"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M4.5 19.5h15"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
};

export function icon(name, size = 20, cls = '') {
  return `<svg class="ico ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

export const crown = (size = 34) => `<svg class="crown" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true">
  <path d="M5 27 3 11l8.5 7L20 4l8.5 14 8.5-7-2 16z" fill="#E7A93D"/>
  <path d="M5 29.5h30v5.5H5z" fill="#E7A93D"/>
  <path d="M11.5 18 20 4l8.5 14-8.5 9z" fill="#F6C766" opacity=".55"/>
</svg>`;

export function logo() {
  return `<div class="brand">
    <div class="brand-row">${crown(36)}<div class="brand-words"><span class="brand-name">REGINA<sup>®</sup></span><span class="brand-sub">colori<i></i></span></div></div>
    <div class="brand-tag">MENAXHIMI I POROSIVE</div>
  </div>`;
}

// ---------- Ngjyrat e linjave të produkteve ----------
const REGINA_BANDS = [
  [/acrilex|acrilin/i, '#17A34A'],
  [/armonia/i, '#C2187E'],
  [/urbano/i, '#2F6FD6'],
  [/bianca/i, '#B9C2CC'],
  [/prima(fas|bet)/i, '#E07B25'],
  [/fortecril/i, '#0E8C8E'],
  [/recril/i, '#D23B3B'],
  [/quarzo/i, '#3B8FD9'],
  [/recasa/i, '#B8663A'],
  [/marmo/i, '#8D5A3B'],
];
const BAU_SWOOSH = [
  [/classic|acryl|star/i, '#27A844'],
  [/fasadex|fassade/i, '#F26A21'],
  [/beton|grund|putzgrund|tiefgrund|teifgrund/i, '#2E63E6'],
];

export function productColor(p) {
  const n = p?.name || '';
  const dep = p?.department || '';
  if (dep === 'regina-ngjyra') return (REGINA_BANDS.find(([r]) => r.test(n)) || [0, '#C99B55'])[1];
  if (dep === 'bau-ngjyra') return (BAU_SWOOSH.find(([r]) => r.test(n)) || [0, '#27A844'])[1];
  if (dep === 'bau-pluhura') return /970|900|950/.test(n) ? '#2E63E6' : '#F26A21';
  if (dep === 'regina-pluhura') return /waterproof/i.test(n) ? '#1E88C8' : /bianco/i.test(n) ? '#D9D4C7' : '#8B8F96';
  return '#C99B55';
}

const short = (s) => String(s || '').replace(/^(Bau Fassade|Recasa|Quarzo|Armonia)\s*/i, '').toUpperCase().slice(0, 18);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

// Kova Regina colori: e zezë me “kështjellën” me ngjyrën e linjës.
function reginaBucket(p, c) {
  const label = esc((p.name || '').split(' ')[0].toUpperCase());
  return `<path d="M24 30h72l-6 70a6 6 0 0 1-6 5H36a6 6 0 0 1-6-5z" fill="#151515"/>
  <path d="M28 74h9v-7h8v7h9v-9h12v9h9v-7h8v7h9l-3 26a6 6 0 0 1-6 5H36a6 6 0 0 1-6-5z" fill="${c}"/>
  <ellipse cx="60" cy="30" rx="37" ry="7" fill="#232323"/><ellipse cx="60" cy="29" rx="33" ry="5" fill="#2E2E2E"/>
  <path d="M27 33c4 14 62 14 66 0" fill="none" stroke="#3A3A3A" stroke-width="2"/>
  <path d="M52 44l3 4 5-6 5 6 3-4-2 9H54z" fill="#E7A93D"/>
  <text x="60" y="62" text-anchor="middle" font-size="9.5" font-weight="800" fill="#fff" letter-spacing=".6">REGINA</text>
  <text x="60" y="68.5" text-anchor="middle" font-size="4.6" fill="#E7A93D">colori</text>
  <text x="60" y="93" text-anchor="middle" font-size="5.4" font-weight="800" fill="#fff" letter-spacing=".3">${label}</text>`;
}
// Kova BAU Farbe: e bardhë me shirit të zi dhe valë me ngjyrë.
function bauBucket(p, c) {
  return `<path d="M24 30h72l-6 70a6 6 0 0 1-6 5H36a6 6 0 0 1-6-5z" fill="#F4F3EF"/>
  <path d="M25.5 44h69l-1 10H26.5z" fill="#171717"/>
  <path d="M29.5 88c18-2 36-14 63-24l-2.6 36a6 6 0 0 1-6 5H36a6 6 0 0 1-6-5z" fill="${c}"/>
  <path d="M30 96c20-4 38-14 61-22l-.6 8C70 88 52 97 30.5 101z" fill="#171717" opacity=".9"/>
  <ellipse cx="60" cy="30" rx="37" ry="7" fill="#1B1B1B"/><ellipse cx="60" cy="29" rx="33" ry="5" fill="#2A2A2A"/>
  <text x="60" y="70" text-anchor="middle" font-size="15" font-weight="900" fill="#171717" letter-spacing="-.5">BAU</text>
  <text x="60" y="78" text-anchor="middle" font-size="5.6" font-weight="800" fill="#171717" letter-spacing="1.6">FARBE</text>
  <rect x="38" y="81" width="44" height="7" rx="1.5" fill="${c}"/>
  <text x="60" y="86.3" text-anchor="middle" font-size="4.2" font-weight="800" fill="#fff">${esc(short(p.name))}</text>`;
}
// Thes pluhuri (BAU Putz / Regina).
function bag(p, c, regina) {
  const base = regina ? '#1A1A1A' : '#ECEBE6';
  const ink = regina ? '#fff' : '#171717';
  return `<path d="M30 26h60l4 76a5 5 0 0 1-5 5H31a5 5 0 0 1-5-5z" fill="${base}"/>
  <path d="M30 26h60l.6 8H29.4z" fill="${regina ? '#2B2B2B' : '#D8D6CF'}"/>
  <path d="M30 27l3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3" fill="none" stroke="${regina ? '#3A3A3A' : '#C9C6BD'}" stroke-width="1.4"/>
  <path d="M27 78h66l1 19H26z" fill="${c}"/>
  ${regina ? '<path d="M53 42l3 4 4-5 4 5 3-4-2 8h-10z" fill="#E7A93D"/>' : ''}
  <text x="60" y="${regina ? 62 : 58}" text-anchor="middle" font-size="${regina ? 9.5 : 14}" font-weight="900" fill="${ink}" letter-spacing="${regina ? '.6' : '-.4'}">${regina ? 'REGINA' : 'BAU'}</text>
  <text x="60" y="${regina ? 69 : 66}" text-anchor="middle" font-size="5" font-weight="800" fill="${regina ? '#E7A93D' : '#171717'}" letter-spacing="1.4">${regina ? 'polvere' : 'PUTZ'}</text>
  <text x="60" y="90" text-anchor="middle" font-size="6" font-weight="800" fill="#fff">${esc(short(p.name))}</text>`;
}

export function productArt(p, extraClass = '') {
  if (p?.image_url) return `<img class="prod-img ${extraClass}" src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy" referrerpolicy="no-referrer"/>`;
  const c = productColor(p);
  const dep = p?.department || '';
  const body = dep === 'bau-ngjyra' ? bauBucket(p, c)
    : dep === 'bau-pluhura' ? bag(p, c, false)
    : dep === 'regina-pluhura' ? bag(p, c, true)
    : reginaBucket(p, c);
  const handle = dep.includes('pluhura') ? '' : '<path d="M24 34c-6-22 78-22 72 0" fill="none" stroke="#6B6B6B" stroke-width="2.2"/>';
  return `<svg class="prod-art ${extraClass}" viewBox="0 0 120 112" role="img" aria-label="${esc(p?.name)}">
    <ellipse cx="60" cy="106" rx="34" ry="4" fill="#000" opacity=".12"/>${handle}${body}</svg>`;
}

export const swatch = (p) => `<span class="swatch" style="--sw:${productColor(p)}"></span>`;
