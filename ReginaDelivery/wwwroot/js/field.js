// Field rep "New order" screen. Plain JS, no dependencies.
(() => {
  'use strict';
  const form = document.getElementById('order-form');
  if (!form) return;

  const $ = (id) => document.getElementById(id);
  const readJson = (id, fallback) => {
    try { return JSON.parse($(id).textContent); } catch { return fallback; }
  };

  const products = readJson('products-data', []);
  const T = readJson('field-strings', {});
  const byId = new Map(products.map((p) => [p.id, p]));
  const UNITS = (form.dataset.units || '').split('|').filter(Boolean);

  const panel = $('load-panel');
  const linesEl = $('load-lines');
  const emptyEl = $('load-empty');
  const countEl = $('load-count');
  const summaryEl = $('load-summary');
  const sendBtn = $('send-btn');
  const company = $('f-company');
  const locationEl = $('f-location');
  const gps = $('f-gps');
  const dialog = $('confirm-dialog');

  /** @type {{uid:number, productId:number, qty:string, unit:string, size:string, shade:string}[]} */
  let lines = [];
  let nextUid = 1;
  let submitting = false;
  let lastPos = null;

  const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const parseQty = (s) => {
    const n = Number(String(s).trim().replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  };
  const fmtQty = (n) => String(Math.round(n * 1000) / 1000);

  // ---------- Search ----------
  const cards = Array.from(document.querySelectorAll('.product-card'));
  cards.forEach((c) => {
    const p = byId.get(Number(c.dataset.id));
    c.dataset.search = norm(p ? `${p.name} ${p.brand} ${p.description} ${(p.sizes || []).join(' ')}` : c.textContent);
  });
  $('product-search').addEventListener('input', (e) => {
    const terms = norm(e.target.value).split(/\s+/).filter(Boolean);
    let any = false;
    document.querySelectorAll('.brand-group').forEach((g) => {
      let visible = 0;
      g.querySelectorAll('.product-card').forEach((c) => {
        const show = terms.every((t) => c.dataset.search.includes(t));
        c.hidden = !show;
        if (show) visible++;
      });
      g.hidden = visible === 0;
      if (visible) any = true;
    });
    $('no-results').hidden = any;
  });

  // ---------- Load (cart) ----------
  function addLine(p, init) {
    const simple = !(p.sizes && p.sizes.length > 1) && !p.shadePrefix;
    if (!init && simple) {
      const existing = lines.find((l) => l.productId === p.id);
      if (existing) {
        existing.qty = fmtQty((parseQty(existing.qty) || 0) + 1);
        render();
        return;
      }
    }
    lines.push({
      uid: nextUid++,
      productId: p.id,
      qty: init?.quantity || '1',
      unit: init?.unit || p.unit,
      size: init?.size || (p.sizes && p.sizes.length === 1 ? p.sizes[0] : ''),
      shade: init?.shade || '',
    });
    render();
  }

  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'text') n.textContent = v;
      else n.setAttribute(k, v === true ? '' : v);
    }
    (children || []).forEach((c) => c && n.appendChild(c));
    return n;
  }

  function lineValid(l) {
    const p = byId.get(l.productId);
    if (!p) return false;
    const q = parseQty(l.qty);
    if (!(q > 0)) return false;
    if (p.sizes && p.sizes.length > 0 && !p.sizes.includes(l.size)) return false;
    if (p.shadePrefix) {
      const s = Number(l.shade);
      if (!Number.isInteger(s) || s < p.shadeMin || s > p.shadeMax) return false;
    }
    return true;
  }

  function render() {
    linesEl.textContent = '';
    for (const l of lines) {
      const p = byId.get(l.productId);
      if (!p) continue;

      const controls = [];
      if (p.sizes && p.sizes.length > 1) {
        const sel = el('select', { 'data-f': 'size', 'aria-label': T.size, class: l.size ? '' : 'needs' },
          [el('option', { value: '', text: T.chooseSize })].concat(
            p.sizes.map((s) => el('option', { value: s, text: s, selected: s === l.size }))));
        controls.push(sel);
      }
      if (p.shadePrefix) {
        controls.push(el('label', { class: 'shade' }, [
          el('span', { text: p.shadePrefix }),
          el('input', {
            'data-f': 'shade', inputmode: 'numeric', pattern: '[0-9]*', value: l.shade,
            placeholder: `${p.shadeMin}–${p.shadeMax}`, 'aria-label': T.shade,
          }),
        ]));
      }
      controls.push(el('div', { class: 'stepper' }, [
        el('button', { type: 'button', 'data-act': 'dec', 'aria-label': '−', text: '−' }),
        el('input', { 'data-f': 'qty', inputmode: 'decimal', value: l.qty, 'aria-label': T.quantity }),
        el('button', { type: 'button', 'data-act': 'inc', 'aria-label': '+', text: '+' }),
      ]));
      controls.push(el('select', { 'data-f': 'unit', 'aria-label': T.unit },
        UNITS.map((u) => el('option', { value: u, text: u, selected: u === l.unit }))));

      const nameText = p.sizes && p.sizes.length === 1 ? `${p.name} · ${p.sizes[0]}` : p.name;
      linesEl.appendChild(el('div', { class: 'line' + (lineValid(l) ? '' : ' invalid'), 'data-uid': l.uid }, [
        el('div', { class: 'line-top' }, [
          el('div', { class: 'line-name' }, [el('b', { text: nameText }), el('small', { text: p.brand })]),
          el('button', { type: 'button', class: 'line-remove', 'data-act': 'remove', 'aria-label': T.remove, title: T.remove, text: '×' }),
        ]),
        el('div', { class: 'line-controls' }, controls),
      ]));
    }
    update();
  }

  function update() {
    const n = lines.length;
    countEl.textContent = String(n);
    emptyEl.hidden = n > 0;
    summaryEl.textContent = lines
      .map((l) => byId.get(l.productId)?.name)
      .filter(Boolean).slice(0, 3).join(', ') + (n > 3 ? ` +${n - 3}` : '');
    panel.classList.toggle('has-items', n > 0);
    linesEl.querySelectorAll('.line').forEach((row) => {
      const l = lines.find((x) => x.uid === Number(row.dataset.uid));
      if (l) row.classList.toggle('invalid', !lineValid(l));
    });
    sendBtn.setAttribute('aria-disabled', String(!formValid()));
    const total = estimatedTotal();
    $('load-total').hidden = !(total > 0);
    $('load-total-value').textContent = fmtMoney(total);
  }

  // ---------- Prices (display only; the server uses its own price list) ----------
  function priceOf(l) {
    const p = byId.get(l.productId);
    if (!p || !p.prices) return null;
    const v = p.prices[l.size || ''];
    return typeof v === 'number' ? v : null;
  }
  function estimatedTotal() {
    return lines.reduce((sum, l) => {
      const pr = priceOf(l);
      const q = parseQty(l.qty);
      return pr != null && q > 0 ? sum + pr * q : sum;
    }, 0);
  }
  function fmtMoney(n) {
    const [i, d] = (Math.round(n * 100) / 100).toFixed(2).split('.');
    return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${d} €`;
  }

  function formValid() {
    return lines.length > 0 && lines.every(lineValid)
      && company.value.trim() !== '' && locationEl.value.trim() !== '';
  }

  linesEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const row = btn.closest('.line');
    const l = lines.find((x) => x.uid === Number(row.dataset.uid));
    if (!l) return;
    const act = btn.dataset.act;
    if (act === 'remove') {
      lines = lines.filter((x) => x !== l);
      render();
      return;
    }
    const q = parseQty(l.qty) || 0;
    l.qty = fmtQty(act === 'inc' ? q + 1 : (q > 1 ? q - 1 : q));
    row.querySelector('[data-f="qty"]').value = l.qty;
    update();
  });

  linesEl.addEventListener('input', onField);
  linesEl.addEventListener('change', onField);
  function onField(e) {
    const f = e.target.dataset?.f;
    if (!f) return;
    const l = lines.find((x) => x.uid === Number(e.target.closest('.line').dataset.uid));
    if (!l) return;
    l[f] = e.target.value;
    if (f === 'size') e.target.classList.toggle('needs', !e.target.value);
    update();
  }

  [company, locationEl].forEach((i) => i.addEventListener('input', () => {
    i.classList.remove('needs');
    update();
  }));

  // ---------- Panel expand/collapse ----------
  const setOpen = (open) => {
    panel.classList.toggle('open', open);
    $('load-toggle').setAttribute('aria-expanded', String(open));
  };
  $('load-toggle').addEventListener('click', () => setOpen(!panel.classList.contains('open')));

  // ---------- Product tap ----------
  $('catalog').addEventListener('click', (e) => {
    const card = e.target.closest('.product-card');
    if (!card) return;
    const p = byId.get(Number(card.dataset.id));
    if (!p) return;
    addLine(p);
    card.classList.remove('added');
    void card.offsetWidth; // restart animation
    card.classList.add('added');
    if (navigator.vibrate) navigator.vibrate(15);
    warmGps();
    // Products needing a choice (size/shade): open the panel so the rep sees it.
    if ((p.sizes && p.sizes.length > 1) || p.shadePrefix) setOpen(true);
  });

  // ---------- GPS ----------
  function warmGps() {
    if (!gps.checked || lastPos || !navigator.geolocation || warmGps.started) return;
    warmGps.started = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => { lastPos = pos; },
      () => { /* denied/unavailable: submit without GPS */ },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 120000 });
  }

  function getPosition() {
    return new Promise((resolve) => {
      if (!gps.checked || !navigator.geolocation) return resolve(null);
      if (lastPos && Date.now() - lastPos.timestamp < 120000) return resolve(lastPos);
      navigator.geolocation.getCurrentPosition(resolve, () => resolve(lastPos),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 120000 });
    });
  }

  // ---------- Send → confirm → submit ----------
  function showProblems() {
    setOpen(true);
    linesEl.querySelectorAll('select.needs, .line.invalid input').forEach((x) => x.classList.add('needs'));
    if (!company.value.trim()) company.classList.add('needs');
    if (!locationEl.value.trim()) locationEl.classList.add('needs');
    const first = panel.querySelector('.line.invalid select, .line.invalid input, input.needs');
    if (first) first.focus();
  }

  sendBtn.addEventListener('click', () => {
    if (submitting) return;
    if (!formValid()) { showProblems(); return; }
    $('confirm-who').textContent = '';
    $('confirm-who').append(
      el('b', { text: company.value.trim() }), document.createElement('br'),
      el('span', { class: 'muted', text: locationEl.value.trim() }));
    const ul = $('confirm-items');
    ul.textContent = '';
    lines.forEach((l) => {
      const p = byId.get(l.productId);
      const label = [p.name, l.size, p.shadePrefix && l.shade ? `${p.shadePrefix} ${l.shade}` : '']
        .filter(Boolean).join(' ');
      ul.appendChild(el('li', {}, [el('span', { text: label }), el('b', { text: `×${fmtQty(parseQty(l.qty))} ${l.unit}` })]));
    });
    const total = estimatedTotal();
    $('confirm-total').hidden = !(total > 0);
    $('confirm-total').textContent = `${T.total}: ${fmtMoney(total)}`;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else if (confirm(ul.innerText)) doSubmit();
  });

  $('confirm-back').addEventListener('click', () => dialog.close());
  $('confirm-ok').addEventListener('click', doSubmit);

  async function doSubmit() {
    if (submitting) return;
    submitting = true;
    const ok = $('confirm-ok');
    ok.disabled = true;
    $('confirm-back').disabled = true;
    sendBtn.setAttribute('aria-disabled', 'true');
    ok.textContent = gps.checked ? T.locating : T.saving;

    const hidden = $('items-hidden');
    hidden.textContent = '';
    lines.forEach((l, i) => {
      const add = (name, value) => hidden.appendChild(el('input', { type: 'hidden', name: `Input.Items[${i}].${name}`, value: value ?? '' }));
      add('ProductId', l.productId);
      add('Quantity', String(parseQty(l.qty)));
      add('Unit', l.unit);
      add('Size', l.size);
      add('Shade', l.shade);
    });

    const pos = await getPosition();
    if (pos) {
      $('gps-lat').value = pos.coords.latitude.toFixed(6);
      $('gps-lng').value = pos.coords.longitude.toFixed(6);
    } else {
      $('gps-lat').value = '';
      $('gps-lng').value = '';
    }
    ok.textContent = T.saving;
    HTMLFormElement.prototype.submit.call(form);
  }

  // Enter key in a field must not bypass the confirm step.
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    sendBtn.click();
  });

  // Restore lines after a server-side validation error.
  readJson('initial-items', []).forEach((it) => {
    const p = byId.get(it.productId);
    if (p) addLine(p, it);
  });
  if (lines.length) setOpen(true);
  render();
})();
