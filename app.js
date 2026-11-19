import {DEPARTMENTS} from './catalog.js';
import {LocalBackend} from './local-backend.js';
import {CloudBackend,isCloudConfigured} from './cloud-backend.js';
import {CLOUD_CONFIG} from './config.js';

const app=document.getElementById('app');
const backend=isCloudConfigured?new CloudBackend():new LocalBackend();
const tz='Europe/Belgrade';
// Formati fiks dd.MM.yyyy HH:mm (ora e Kosovës), pavarësisht gjuhës së shfletuesit.
const partsFmt=new Intl.DateTimeFormat('en-GB',{timeZone:tz,day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const parts=x=>Object.fromEntries(partsFmt.formatToParts(new Date(x)).map(p=>[p.type,p.value]));
const fmt={format:d=>{const p=parts(d);return `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}`;}};
const dateFmt={format:d=>{const p=parts(d);return `${p.day}.${p.month}.${p.year}`;}};
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>new Intl.NumberFormat('de-DE').format(Number(n)||0);
const time=x=>x?fmt.format(new Date(x)):'—';
const eur=n=>{const [i,d]=(Math.round((Number(n)||0)*100)/100).toFixed(2).split('.');return `${i.replace(/\B(?=(\d{3})+(?!\d))/g,'.')},${d} €`;};
const parseMoney=t=>{let x=String(t??'').replace(/[€\s]/g,'');if(!x)return null;if(x.lastIndexOf(',')>x.lastIndexOf('.'))x=x.replace(/\./g,'').replace(',','.');else x=x.replace(/,/g,'');const n=Number(x);return Number.isFinite(n)&&n>=0&&n<=1000000?Math.round(n*100)/100:NaN;};
const moneyInput=n=>n==null?'':Number(n).toFixed(2).replace('.',',');
const MONTHS=['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor'];
const date=x=>x?dateFmt.format(new Date(x)):'—';
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const statusNames={new:'E re',preparing:'Në përgatitje',partial:'Pjesërisht e realizuar',completed:'E përfunduar',cancelled:'E anuluar'};
const roleNames={agent:'Agjent',warehouse:'Fabrikë / magazinë',admin:'Administrator'};
const icons={dashboard:'▦',new:'✚',orders:'▤',catalog:'▧',prices:'€',reports:'▥',notifications:'🔔',team:'♙'};
const S={user:null,data:null,view:'dashboard',selectedOrder:null,modal:null,product:null,selectedShade:null,cart:{},clientId:'',note:'',searchProducts:'',searchOrders:'',ordersFilter:'all',catalogSearch:'',reportPeriod:'month',reportDate:'',reportYear:new Date().getFullYear(),reportMonth:new Date().getMonth()+1,reportSearch:'',reportSort:'qty',pricesSearch:'',pushState:null,mobileOpen:false,toast:null,loginError:null};
const canManage=()=>['warehouse','admin'].includes(S.user?.role);
const isAdmin=()=>S.user?.role==='admin';
const getData=()=>S.data||{clients:[],products:[],product_variants:[],product_prices:[],orders:[],order_items:[],shipments:[],shipment_items:[],order_events:[],profiles:[]};
const byId=(table,id)=>getData()[table].find(x=>x.id===id);
const products=()=>getData().products.filter(x=>x.active).sort((a,b)=>a.name.localeCompare(b.name));
const variants=pid=>getData().product_variants.filter(v=>v.product_id===pid&&v.active);
const orderItems=id=>getData().order_items.filter(x=>x.order_id===id);
const remainder=order=>orderItems(order.id).reduce((a,x)=>a+x.ordered_qty-x.fulfilled_qty,0);
const sent=order=>orderItems(order.id).reduce((a,x)=>a+x.fulfilled_qty,0);
const total=order=>orderItems(order.id).reduce((a,x)=>a+x.ordered_qty,0);
const priceOf=(productId,size)=>{const p=(getData().product_prices||[]).find(x=>x.product_id===productId&&x.size_label===size);return p?Number(p.price):null;};
const orderValue=order=>orderItems(order.id).reduce((a,x)=>a+(x.unit_price!=null?Number(x.unit_price)*x.ordered_qty:0),0);
const sentValue=order=>orderItems(order.id).reduce((a,x)=>a+(x.unit_price!=null?Number(x.unit_price)*x.fulfilled_qty:0),0);
const hasPrice=order=>orderItems(order.id).some(x=>x.unit_price!=null);
const missingPrice=order=>orderItems(order.id).some(x=>x.unit_price==null);
function shippedValueBetween(start,end){const d=getData();let v=0;for(const sh of d.shipments){const t=new Date(sh.dispatched_at);if(t<start||t>=end)continue;for(const si of d.shipment_items.filter(x=>x.shipment_id===sh.id)){const it=byId('order_items',si.order_item_id);if(it?.unit_price!=null)v+=Number(it.unit_price)*si.quantity;}}return v;}
function previousPeriodValue(){if(S.reportPeriod==='month'){const y=Number(S.reportYear),m=Number(S.reportMonth)-1;return shippedValueBetween(new Date(y,m-1,1),new Date(y,m,1));}if(S.reportPeriod==='year'){const y=Number(S.reportYear)-1;return shippedValueBetween(new Date(y,0,1),new Date(y+1,0,1));}return null;}
function trendText(now,prev){if(!prev)return 'periudha e kaluar: 0,00 €';const p=Math.round((now-prev)/prev*100);return `${p>=0?'▲':'▼'} ${Math.abs(p)}% nga periudha e kaluar (${eur(prev)})`;}
const status=order=>order.status==='completed'&&remainder(order)>0?'E mbyllur (me mbetje)':statusNames[order.status]||order.status;
const fmtId=o=>`#${String(o.order_no||0).padStart(5,'0')}`;
const itemFullName=item=>{const v=byId('product_variants',item.variant_id);const p=byId('products',v?.product_id);return [p?.name||'Produkt i panjohur',v?.shade_code||'',...(p?.department?.includes('pluhura')?[]:[v?.size_label||''])].filter(Boolean).join(' · ')};
const unitName=p=>p?.name?.includes('Waterproofing')?'komplete':p?.department?.includes('pluhura')?'thasë':'copë';
const coloredThumb=p=>p?.image_url?`<img src="${e(p.image_url)}" alt="${e(p.name)}" loading="lazy" referrerpolicy="no-referrer"/>`:`<span class="bucket" aria-hidden="true">${p?.department?.includes('pluhura')?'▰':'▥'}</span>`;
const badge=o=>`<span class="badge ${e(o.status)}">${e(status(o))}</span>`;
const notice=()=>backend.isDemo?`<div class="notice demo">🧪 <b>Modalitet demonstrues:</b> Të dhënat ruhen vetëm në këtë shfletues dhe nuk shfaqen në telefonat/kompjuterët e tjerë. Për punë reale, lidheni databazën Supabase.</div>`:'';
function toast(msg,error=false){S.toast={msg,error};document.querySelector('.toast')?.remove();let node=document.createElement('div');node.className='toast'+(error?' error':'');node.textContent=msg;document.body.append(node);setTimeout(()=>node.remove(),4800);}
function navItems(){return [{key:'dashboard',label:'Përmbledhja'},{key:'new',label:'Krijo porosi'},{key:'orders',label:canManage()?'Të gjitha porositë':'Porositë e mia'},{key:'catalog',label:'Katalogu i produkteve'},...(isAdmin()?[{key:'prices',label:'Çmimet'}]:[]),...(canManage()?[{key:'reports',label:'Shitjet dhe raportet'}]:[]),{key:'notifications',label:'Njoftimet'},...(isAdmin()?[{key:'team',label:'Stafi & qasja'}]:[])];}
function sidebar(){return `<div class="mobile-shadow ${S.mobileOpen?'open':''}" data-action="close-menu"></div><aside class="sidebar ${S.mobileOpen?'open':''}">
  <div class="logo"><div class="logo-mark">✦</div><div><div class="logo-name">REGINA<span> COLOR</span></div><span class="logo-sub">Menaxhimi i porosive</span></div></div>
  <div class="navlabel">Hapësira e punës</div><nav>${navItems().map(n=>`<button class="navbtn ${S.view===n.key?'active':''}" data-action="nav" data-id="${n.key}"><span style="font-size:19px;width:21px;text-align:center">${icons[n.key]}</span>${n.label}</button>`).join('')}</nav>
  <div class="sidebar-bottom"><div class="person"><div class="avatar">${e(S.user.full_name[0]||'R').toUpperCase()}</div><div><b>${e(S.user.full_name)}</b><span>${e(roleNames[S.user.role])}</span></div></div>
  ${backend.isDemo?`<label class="small" for="role-demo" style="color:#b7bfc9">Provo rolet (vetëm demo)</label><select id="role-demo" class="role-select">${[['demo-agent','Agjent'],['demo-warehouse','Fabrika'],['demo-admin','Administrator']].map(([id,label])=>`<option value="${id}" ${S.user.id===id?'selected':''}>${label}</option>`).join('')}</select>`:''}
  <button class="sidebar-footer" data-action="logout">${backend.isDemo?'Rivendos panelin':'Dil nga llogaria'}</button></div>
  </aside>`;}
function topbar(){return `<header class="topbar"><div class="top-left"><button class="mobile-menu" data-action="mobile-menu" aria-label="Hap menunë">☰</button><span class="top-title">${({dashboard:'Paneli kryesor',new:'Porosi e re',orders:'Porositë',catalog:'Katalogu',prices:'Çmimet',reports:'Shitjet',notifications:'Njoftimet',team:'Stafi'})[S.view]}</span></div><div class="top-meta"><span class="clock">${e(date(new Date()))}</span><span class="role-chip">● ${e(roleNames[S.user.role])}</span></div></header>`;}
function render(){if(!S.user){renderLogin();return;}if(!S.data){app.innerHTML='<div class="boot">REGINA <span>COLOR</span><small>Duke ngarkuar...</small></div>';return;}const pages={dashboard:dashboardView,new:newOrderView,orders:ordersView,catalog:catalogView,prices:pricesView,reports:reportsView,notifications:notificationsView,team:teamView};if(!navItems().some(n=>n.key===S.view))S.view='dashboard';app.innerHTML=`<div class="layout">${sidebar()}<main class="main">${topbar()}<div class="content">${notice()}${pages[S.view]?.()||dashboardView()}</div></main></div>${modalHtml()}`;}
function renderLogin(){if(backend.isDemo){app.innerHTML=`<div class="login-view"><section class="login-hero"><div class="logo"><div class="logo-mark">✦</div><div><div class="logo-name">REGINA <span>COLOR</span></div><span class="logo-sub">Sistemi privat i porosive</span></div></div><div><h1>Çdo porosi.<br/><em>Në një vend.</em></h1><p class="login-copy" style="margin-top:25px">Regjistrimi nga agjentët, realizimi në fabrikë dhe raportet e dërgesave, pa fletore dhe pa humbur të dhëna.</p></div><p class="small" style="color:#9a9da5">Projekt demonstrues · Të dhënat në këtë pajisje</p></section><section class="login-box"><div class="login-card"><div><div class="login-brand">REGINA <span>COLOR</span></div><div class="eyebrow">Provo aplikacionin</div><h1>Mirë se erdhe!</h1><p style="margin-top:10px">Zgjedh rolin me të cilin dëshiron ta provosh. Ky demonstrim nuk përdor llogari të vërteta.</p></div><div class="field"><label for="demo-start-role">Roli demonstrues</label><select class="select" id="demo-start-role"><option value="demo-admin">Administrator</option><option value="demo-agent">Agjent shitjeje</option><option value="demo-warehouse">Fabrika / magazina</option></select></div><button class="btn gold full" data-action="start-demo">Hap aplikacionin →</button><div class="notice demo">Për përdorim të përbashkët dhe qasje të sigurt kërkohet konfigurimi Supabase sipas udhëzuesit në paketë.</div></div></section></div>`;return;}
app.innerHTML=`<div class="login-view"><section class="login-hero"><div class="logo"><div class="logo-mark">✦</div><div><div class="logo-name">REGINA <span>COLOR</span></div><span class="logo-sub">Sistemi privat i porosive</span></div></div><h1>Porositë e fabrikës.<br/><em>Të organizuara.</em></h1><p class="login-copy">Qasje vetëm për stafin e autorizuar. Çdo veprim ruhet dhe mund të kontrollohet.</p></section><section class="login-box"><form class="login-card" id="login-form"><div><div class="eyebrow">Qasje e kufizuar</div><h1>Kyçu në sistem</h1><p style="margin-top:9px">Përdor llogarinë e krijuar nga administratori i Regina Color.</p></div>${S.loginError?`<div class="notice">${e(S.loginError)}</div>`:''}<div class="field"><label>Email</label><input type="email" class="input" name="email" required autocomplete="username" placeholder="emri@kompania.com"/></div><div class="field"><label>Fjalëkalimi</label><input type="password" class="input" name="password" required autocomplete="current-password"/></div><button class="btn gold full" type="submit">Kyçu →</button><p class="small muted">Vetëm përdoruesit e aktivizuar nga administratori mund të hyjnë.</p></form></section></div>`;}
function dashboardView(){const d=getData();const active=d.orders.filter(o=>!['completed','cancelled'].includes(o.status));const completed=d.orders.filter(o=>o.status==='completed');const start=new Date();start.setDate(start.getDate()-30);const last30=d.shipments.filter(s=>new Date(s.dispatched_at)>=start);const shipped=last30.reduce((a,s)=>a+d.shipment_items.filter(i=>i.shipment_id===s.id).reduce((b,i)=>b+i.quantity,0),0);const latest=[...d.orders].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,7);return `<div class="page-head"><div><div class="eyebrow">REGINA COLOR · PANELI I BRENDSHËM</div><h1>Mirë se erdhe, ${e((S.user.full_name||'').split(' ')[0])}!</h1><p>Gjendja e porosive dhe dërgesave të regjistruara.</p></div><button class="btn gold" data-action="nav" data-id="new">＋ Porosi e re</button></div>
  <div class="stats"><div class="panel stat"><span class="stat-label"><i class="dot"></i> Porosi aktive</span><span class="stat-value mono">${num(active.length)}</span><small>në proces</small></div><div class="panel stat"><span class="stat-label"><i class="dot blue"></i> Porosi të reja</span><span class="stat-value mono">${num(d.orders.filter(o=>o.status==='new').length)}</span><small>në pritje</small></div>${canManage()?monthSalesCard():`<div class="panel stat"><span class="stat-label"><i class="dot green"></i> Të përfunduara</span><span class="stat-value mono">${num(completed.length)}</span><small>në total</small></div>`}<div class="panel stat"><span class="stat-label"><i class="dot red"></i> Njësi të dërguara</span><span class="stat-value mono">${num(shipped)}</span><small>30 ditët e fundit · njësi ambalazhi</small></div></div>
  <div class="panel"><div class="pad sectiontitle"><h2>Porositë e fundit</h2><button class="btn outline sm" data-action="nav" data-id="orders">Shiko të gjitha →</button></div>${orderTable(latest)}</div>`;}
function orderTable(orders){return orders.length?`<div class="list-wrap"><table class="table"><thead><tr><th>Nr.</th><th>Klienti / lokacioni</th><th>Data e porosisë</th><th>Njësi</th><th>Vlera</th><th>Gjendja</th><th></th></tr></thead><tbody>${orders.map(o=>{const c=byId('clients',o.client_id);return `<tr class="clickable" data-action="open-order" data-id="${e(o.id)}"><td><b>${fmtId(o)}</b></td><td><b>${e(c?.name||'—')}</b><div class="muted small">${e(c?.location||'')}</div></td><td class="small">${e(time(o.created_at))}</td><td class="mono">${num(sent(o))} / ${num(total(o))}</td><td class="mono nowrap">${hasPrice(o)?eur(orderValue(o)):'<span class="muted">—</span>'}${hasPrice(o)&&missingPrice(o)?' <span class="badge cancelled" title="Disa rreshta pa çmim">!</span>':''}</td><td>${badge(o)}</td><td style="color:#a67c48;font-weight:800">Shiko →</td></tr>`}).join('')}</tbody></table></div>`:`<div class="empty"><div class="empty-icon">▤</div><strong>Nuk ka ende porosi</strong>Krijo porosinë e parë nga paneli i agjentit.</div>`;}
function ordersView(){if(S.selectedOrder){const o=byId('orders',S.selectedOrder);if(!o){S.selectedOrder=null;return ordersView();}return orderDetail(o);}const all=[...getData().orders].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));const q=S.searchOrders.trim().toLowerCase();const rows=all.filter(o=>(S.ordersFilter==='all'||o.status===S.ordersFilter)&&(!q||[fmtId(o),byId('clients',o.client_id)?.name,byId('clients',o.client_id)?.location,o.notes].some(t=>String(t||'').toLowerCase().includes(q))));return `<div class="page-head"><div><div class="eyebrow">LISTA E POROSIVE</div><h1>${canManage()?'Të gjitha porositë':'Porositë e mia'}</h1><p>Gjej porosi, kontrollo realizimin dhe historikun e tyre.</p></div><button class="btn gold" data-action="nav" data-id="new">＋ Porosi e re</button></div><div class="toolbar"><input id="orders-search" class="input" placeholder="Kërko klientin, lokacionin, numrin..." value="${e(S.searchOrders)}" style="flex:1;min-width:230px;max-width:360px"/><button class="btn outline" data-action="refresh">↻ Rifresko</button></div><div class="filters" style="margin-bottom:17px">${[['all','Të gjitha'],['new','Të reja'],['preparing','Në përgatitje'],['partial','Pjesërisht'],['completed','Të përfunduara'],['cancelled','Të anuluara']].map(([v,t])=>`<button class="filter ${S.ordersFilter===v?'on':''}" data-action="order-filter" data-id="${v}">${t}</button>`).join('')}</div><div class="panel">${orderTable(rows)}</div>`;}
function orderDetail(o){const c=byId('clients',o.client_id), agent=byId('profiles',o.agent_id);const its=orderItems(o.id);const shipments=getData().shipments.filter(s=>s.order_id===o.id).sort((a,b)=>new Date(b.dispatched_at)-new Date(a.dispatched_at));const events=getData().order_events.filter(x=>x.order_id===o.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));const closed=['completed','cancelled'].includes(o.status);return `<button class="back" data-action="back-orders">← Kthehu te porositë</button><div class="page-head"><div><div class="eyebrow">DETAJET E POROSISË</div><h1>Porosia ${fmtId(o)}</h1><p>${e(c?.name||'—')} · ${e(c?.location||'—')}</p></div><div class="row wrap">${badge(o)}<button class="btn outline sm" data-action="print">Shtyp</button></div></div>
  <div class="panel pad" style="margin-bottom:17px"><div class="detail-info"><div><span>Klienti</span><strong>${e(c?.name||'')}</strong></div><div><span>Lokacioni</span><strong>${e(c?.location||'')}</strong></div><div><span>Agjenti</span><strong>${e(agent?.full_name||'—')}</strong></div><div><span>Porositur më</span><strong>${e(time(o.created_at))}</strong></div><div><span>Totali i njësive</span><strong>${num(total(o))}</strong></div><div><span>Njësi të dërguara</span><strong>${num(sent(o))}</strong></div><div><span>Mbetur</span><strong>${num(remainder(o))}</strong></div><div><span>Vlera e porosisë</span><strong>${hasPrice(o)?eur(orderValue(o)):'—'}</strong></div><div><span>Vlera e dërguar</span><strong>${hasPrice(o)?eur(sentValue(o)):'—'}</strong></div><div><span>Përfunduar më</span><strong>${e(time(o.completed_at))}</strong></div></div>${o.notes?`<div class="summary"><b style="font-size:12px">Shënim nga agjenti:</b><p style="margin-top:5px">${e(o.notes)}</p></div>`:''}</div>
  <div class="two-col"><div><div class="panel"><div class="pad sectiontitle"><h2>Produktet dhe sasitë</h2><span class="small muted">${its.length} rreshta${isAdmin()&&missingPrice(o)?` · <button class="btn outline sm" data-action="fill-prices" data-id="${e(o.id)}">Plotëso çmimet nga lista</button>`:''}</span></div><div class="list-wrap"><table class="table" style="min-width:720px"><thead><tr><th>Produkti</th><th>Porositur</th><th>Dërguar</th><th>Mbetur</th><th>Çmimi / njësi</th><th>Vlera</th>${canManage()&&!closed?'<th>Tani</th>':''}</tr></thead><tbody>${its.map(it=>{const left=it.ordered_qty-it.fulfilled_qty;return `<tr><td><b>${e(itemFullName(it))}</b><div class="small muted">${e(unitName(byId('products',byId('product_variants',it.variant_id)?.product_id)))}</div>${isAdmin()&&!closed?`<div class="row" style="margin-top:9px"><input class="input" type="number" min="${it.fulfilled_qty||1}" max="1000000" value="${it.ordered_qty}" id="edit-${e(it.id)}" style="width:82px;min-height:30px;padding:4px 6px"/><button class="btn outline sm" data-action="adjust-item" data-id="${e(it.id)}">Korrigjo</button></div>`:''}</td><td><b class="mono">${num(it.ordered_qty)}</b></td><td class="mono" style="color:#26825f;font-weight:700">${num(it.fulfilled_qty)}</td><td class="mono">${num(left)}</td>${priceCells(it)}${canManage()&&!closed?`<td><input id="ship-${e(it.id)}" type="number" class="input shipinput" min="0" max="${left}" value="0" style="width:76px" ${left===0?'disabled':''}/></td>`:''}</tr>`}).join('')}</tbody></table></div>
  ${canManage()&&!closed?`<div class="pad" style="border-top:1px solid #edf0f1"><div class="row between wrap"><h3>Dërgesa e radhës</h3><button class="btn outline sm" data-action="fill-remaining">Mbush me sasitë e mbetura</button></div><div class="field" style="margin-top:13px"><label>Shënim për dërgesën (opsional)</label><input class="input" id="shipment-note" placeholder="P.sh. Dërgesa me automjetin..."/></div><label class="row" style="margin:16px 0;font-size:12px"><input type="checkbox" id="close-order"/> Mbylle porosinë pas kësaj dërgese, edhe nëse mbesin produkte pa u dërguar</label><button class="btn gold full" data-action="ship" data-id="${e(o.id)}">Regjistro dërgesën</button><p class="hint">Sasitë e dërguara ruhen në historik. Dërgesa merr automatikisht datën dhe orën e regjistrimit.</p></div>`:''}
  ${canManage()&&!closed?`<div class="pad" style="border-top:1px solid #edf0f1;display:flex;gap:9px;flex-wrap:wrap">${o.status==='new'?`<button class="btn outline sm" data-action="status" data-id="preparing">Kalo në përgatitje</button>`:''}${o.status==='new'||o.status==='preparing'?`<button class="btn danger sm" data-action="status" data-id="cancelled">Anulo porosinë</button>`:''}</div>`:''}
  ${isAdmin()&&o.status==='completed'&&remainder(o)>0?`<div class="pad" style="border-top:1px solid #edf0f1"><button class="btn outline sm" data-action="reopen" data-id="${e(o.id)}">Rihap për dërgesë tjetër</button></div>`:''}</div></div>
  <div><div class="panel pad"><div class="sectiontitle"><h2>Historiku i dërgesave</h2><span class="tag">${shipments.length} dërgesa</span></div>${shipments.length?shipments.map(sh=>{const lines=getData().shipment_items.filter(x=>x.shipment_id===sh.id);const actor=byId('profiles',sh.created_by);return `<div style="border-top:1px solid #eceeef;padding:13px 0"><div class="row between"><b>🚚 ${e(time(sh.dispatched_at))}</b><span class="badge completed">${num(lines.reduce((a,x)=>a+x.quantity,0))} njësi</span></div><p class="small muted" style="margin:8px 0">Nga: ${e(actor?.full_name||'—')}</p>${lines.map(x=>{const it=byId('order_items',x.order_item_id);return `<div class="row between" style="padding:3px 0;font-size:11px"><span>${e(itemFullName(it||{}))}</span><b>×${num(x.quantity)}</b></div>`}).join('')}${sh.note?`<p class="small muted" style="margin-top:6px">${e(sh.note)}</p>`:''}</div>`}).join(''):'<p class="muted small">Nuk ka ende dërgesa.</p>'}</div>
  <div class="panel pad" style="margin-top:16px"><h2 style="margin-bottom:18px">Regjistri i veprimeve</h2>${events.length?events.map(ev=>`<div class="log-entry"><b>${({created:'Porosia u krijua',shipment:'Dërgesë e regjistruar',closed:'Porosia u mbyll',status_changed:'Statusi u ndryshua',quantity_adjusted:'Sasia e porositur u korrigjua',reopened:'Porosia u rihap'})[ev.event_type]||e(ev.event_type)}</b><span class="muted">${e(time(ev.created_at))} · ${e(byId('profiles',ev.user_id)?.full_name||'—')}</span>${ev.event_type==='quantity_adjusted'?`<div class="hint">${num(ev.payload?.old)} → ${num(ev.payload?.new)}</div>`:''}</div>`).join(''):'<p class="small muted">Nuk ka regjistra.</p>'}</div></div></div>`;}
function newOrderView(){const d=getData();const q=S.searchProducts.toLowerCase().trim();const matches=products().filter(p=>!q||p.name.toLowerCase().includes(q)).slice(0,70);const cartEntries=Object.entries(S.cart).map(([id,qty])=>({id,qty,v:byId('product_variants',id)})).filter(x=>x.qty>0&&x.v);const count=cartEntries.reduce((a,x)=>a+x.qty,0);return `<div class="page-head"><div><div class="eyebrow">POROSI E RE</div><h1>Krijo një porosi</h1><p>Zgjedh klientin, produktet, paketimet dhe sasitë.</p></div><span class="tag">Pa çmime</span></div><div class="order-layout"><div><div class="panel pad" style="margin-bottom:17px"><div class="sectiontitle"><h2>1. Klienti dhe lokacioni</h2><button class="btn outline sm" data-action="modal-client">＋ Shto klient</button></div><div class="field"><label>Zgjedh klientin *</label><select id="new-client" class="select"><option value="">— Zgjedh klientin —</option>${[...d.clients].filter(c=>c.active).sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${e(c.id)}" ${S.clientId===c.id?'selected':''}>${e(c.name)} — ${e(c.location)}</option>`).join('')}</select></div></div>
  <div class="panel pad"><div class="sectiontitle"><h2>2. Produktet</h2><span class="small muted">${d.products.filter(p=>p.active).length} produkte</span></div><input class="input" id="product-search" placeholder="Kërko: BP 950, Fasadex, Recasa..." value="${e(S.searchProducts)}"/><p class="hint" style="margin:10px 0 15px">Të gjitha produktet në një vend – nuk ke nevojë të zgjedhësh repartin.</p><div class="product-grid">${matches.map(p=>`<button class="product-card" data-action="choose-product" data-id="${e(p.id)}"><div class="product-thumb">${coloredThumb(p)}</div><div class="prod-info"><span class="prod-name">${e(p.name)}</span><span class="prod-more">Zgjedh paketimin →</span></div></button>`).join('')||'<p class="muted">Nuk u gjet produkt.</p>'}</div></div></div>
  <div class="sticky-cart"><div class="panel pad"><div class="sectiontitle"><h2>3. Porosia</h2><span class="tag">${cartEntries.length} artikuj</span></div>${cartEntries.length?cartEntries.map(x=>{const p=byId('products',x.v.product_id);const pr=priceOf(x.v.product_id,x.v.size_label);return `<div class="cart-item"><div class="row between"><div><b>${e(p?.name)}</b><div class="small muted">${e([x.v.shade_code, x.v.size_label].filter(Boolean).join(' · '))}</div></div><button class="btn ghost sm" data-action="cart-remove" data-id="${e(x.id)}" title="Hiq">✕</button></div><div class="row between" style="margin-top:10px"><span class="small muted">${e(unitName(p))}${pr!=null?' · '+eur(pr):''}</span><div class="quantity"><button class="qty-btn" data-action="cart-minus" data-id="${e(x.id)}">−</button><input type="number" class="qty-direct" min="1" max="1000000" data-quantity-id="${e(x.id)}" value="${x.qty}" aria-label="Sasia"/><button class="qty-btn" data-action="cart-plus" data-id="${e(x.id)}">＋</button></div></div></div>`}).join(''):`<div class="empty" style="padding:34px 12px"><div class="empty-icon">▧</div><strong>Shporta është bosh</strong>Shto një produkt nga katalogu.</div>`}
  <div class="field" style="margin-top:18px"><label>Shënime për fabrikën (opsionale)</label><textarea class="textarea" id="order-note" placeholder="P.sh. Klienti i kërkon për nesër...">${e(S.note)}</textarea></div><div class="summary"><div class="row between"><span>Artikuj të ndryshëm</span><b>${num(cartEntries.length)}</b></div><div class="row between" style="margin-top:8px"><span>Njësi ambalazhi gjithsej</span><b>${num(count)}</b></div>${cartValueRow(cartEntries)}</div><button class="btn gold full" style="margin-top:15px" data-action="submit-order" ${!cartEntries.length||!S.clientId?'disabled':''}>Dërgo porosinë →</button><p class="hint">Data dhe ora e porosisë regjistrohen automatikisht.</p></div></div></div>`;}
function catalogView(){const list=products().filter(p=>p.name.toLowerCase().includes(S.catalogSearch.trim().toLowerCase()));return `<div class="page-head"><div><div class="eyebrow">KATALOGU I PËRBASHKËT</div><h1>Produktet Regina Color</h1><p>${getData().products.filter(p=>p.active).length} grupe produktesh · ${getData().product_variants.filter(v=>v.active).length} variante/nuanca</p></div>${isAdmin()?`<button class="btn gold" data-action="modal-product">＋ Shto produkt</button>`:''}</div><div class="toolbar"><input class="input" id="catalog-search" value="${e(S.catalogSearch)}" placeholder="Kërko produktin..."/></div><div class="product-grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">${list.map(p=>`<button class="product-card" data-action="choose-product" data-id="${e(p.id)}"><div class="product-thumb">${coloredThumb(p)}</div><div class="prod-info"><span class="prod-name">${e(p.name)}</span><span class="small muted">${variants(p.id).length} variante</span><span class="prod-more">Shiko variantet →</span></div></button>`).join('')}</div>${isAdmin()?`<p class="hint" style="margin-top:22px">Administratori mund t'i caktojë fotografitë e produkteve përmes butonit në detajet e produktit.</p>`:''}`;}
// ---------- Çmimet ----------
function priceCells(it){
  const value=it.unit_price!=null?eur(Number(it.unit_price)*it.ordered_qty):'<span class="muted">—</span>';
  const price=isAdmin()
    ?`<div class="row price-edit"><input class="input price-input" inputmode="decimal" id="price-${e(it.id)}" value="${e(moneyInput(it.unit_price))}" placeholder="pa çmim" aria-label="Çmimi për njësi"/><button class="btn outline sm" data-action="set-item-price" data-id="${e(it.id)}" title="Ruaj çmimin">✓</button></div>`
    :(it.unit_price!=null?eur(it.unit_price):'<span class="muted">—</span>');
  return `<td>${price}</td><td class="mono nowrap">${value}</td>`;
}
function cartValueRow(entries){
  const v=entries.reduce((a,x)=>{const pr=priceOf(x.v.product_id,x.v.size_label);return a+(pr!=null?pr*x.qty:0);},0);
  return v?`<div class="row between" style="margin-top:8px"><span>Vlera sipas listës</span><b>${eur(v)}</b></div>`:'';
}
function monthSalesCard(){
  const n=new Date();const v=shippedValueBetween(new Date(n.getFullYear(),n.getMonth(),1),new Date(n.getFullYear(),n.getMonth()+1,1));
  return `<div class="panel stat stat-money"><span class="stat-label"><i class="dot green"></i> Shitjet këtë muaj</span><span class="stat-value mono">${eur(v)}</span><small>${e(MONTHS[n.getMonth()])} · vetëm sasitë e dërguara</small></div>`;
}
function pricesView(){
  if(!isAdmin())return dashboardView();
  const q=S.pricesSearch.trim().toLowerCase();
  const list=products().filter(p=>!q||p.name.toLowerCase().includes(q));
  const groups=Object.keys(DEPARTMENTS).map(dep=>[dep,list.filter(p=>p.department===dep)]).filter(([,ps])=>ps.length);
  const keys=[...new Set(getData().product_variants.filter(v=>v.active).map(v=>v.product_id+'|'+v.size_label))];
  const priced=keys.filter(k=>{const i=k.indexOf('|');return priceOf(k.slice(0,i),k.slice(i+1))!=null;}).length;
  return `<div class="page-head"><div><div class="eyebrow">LISTA E ÇMIMEVE</div><h1>Çmimet e produkteve</h1><p>Çmimi në € për një njësi (kovë / thes / komplet) për çdo paketim. ${num(priced)} nga ${num(keys.length)} paketime kanë çmim.</p></div><button class="btn gold" data-action="save-prices">Ruaj ndryshimet</button></div>
  <div class="notice">Porosia e re e merr çmimin automatikisht nga kjo listë. Ndryshimet këtu <b>nuk</b> i ndryshojnë porositë e vjetra; për to ndryshoni çmimin te detajet e porosisë. Nuancat RG/MX kanë të njëjtin çmim për paketim.</div>
  <div class="toolbar"><input class="input" id="prices-search" value="${e(S.pricesSearch)}" placeholder="Kërko produktin..." style="max-width:360px"/></div>
  ${groups.map(([dep,ps])=>`<div class="panel" style="margin-bottom:16px"><div class="pad sectiontitle"><h2>${e(DEPARTMENTS[dep])}</h2><span class="small muted">${ps.length} produkte</span></div><div class="list-wrap"><table class="table price-table"><thead><tr><th>Produkti</th><th>Paketimet dhe çmimet (€ për njësi)</th></tr></thead><tbody>${ps.map(p=>{const sizes=[...new Set(variants(p.id).map(v=>v.size_label))];return `<tr><td><b>${e(p.name)}</b><div class="small muted">${e(unitName(p))}</div></td><td><div class="price-cells">${sizes.map(sz=>{const cur=priceOf(p.id,sz);return `<label class="price-cell"><span>${e(sz)}</span><input class="input price-input" inputmode="decimal" data-price-product="${e(p.id)}" data-price-size="${e(sz)}" data-orig="${e(moneyInput(cur))}" value="${e(moneyInput(cur))}" placeholder="—"/></label>`;}).join('')}</div></td></tr>`;}).join('')}</tbody></table></div></div>`).join('')||'<div class="empty">Nuk u gjet produkt.</div>'}
  <div class="save-bar"><button class="btn gold" data-action="save-prices">Ruaj ndryshimet</button></div>`;
}

// ---------- Raportet (sipas dërgesave reale) ----------
function reportRows(){
  const d=getData();const list=[];
  for(const sh of d.shipments){
    const dd=new Date(sh.dispatched_at);
    if(S.reportPeriod==='month'&&(dd.getFullYear()!==Number(S.reportYear)||dd.getMonth()+1!==Number(S.reportMonth)))continue;
    if(S.reportPeriod==='year'&&dd.getFullYear()!==Number(S.reportYear))continue;
    const order=byId('orders',sh.order_id);const client=byId('clients',order?.client_id);
    for(const si of d.shipment_items.filter(si=>si.shipment_id===sh.id)){
      const it=byId('order_items',si.order_item_id);const variant=byId('product_variants',it?.variant_id);const product=byId('products',variant?.product_id);
      const price=it?.unit_price!=null?Number(it.unit_price):null;
      list.push({shipment_id:sh.id,order_no:order?fmtId(order):'',time:sh.dispatched_at,client:client?.name||'',location:client?.location||'',product:product?.name||'',size:variant?.size_label||'',shade:variant?.shade_code||'',agent:byId('profiles',order?.agent_id)?.full_name||'',quantity:si.quantity,price,value:price!=null?price*si.quantity:0});
    }
  }
  return list;
}
function reportsView(){
  const rows=reportRows();
  const totalUnits=rows.reduce((a,x)=>a+x.quantity,0);
  const totalValue=rows.reduce((a,x)=>a+x.value,0);
  const unpriced=rows.filter(x=>x.price==null).length;
  const add=(map,key,x)=>{const c=map.get(key)||{q:0,v:0};c.q+=x.quantity;c.v+=x.value;map.set(key,c);};
  const byProduct=new Map(),byClient=new Map(),byAgent=new Map();
  for(const x of rows){add(byProduct,[x.product,x.shade,x.size].filter(Boolean).join(' · '),x);add(byClient,[x.client,x.location].filter(Boolean).join(' — '),x);add(byAgent,x.agent||'—',x);}
  const k=S.reportSort==='value'?'v':'q';
  const ranked=[...byProduct].sort((a,b)=>b[1][k]-a[1][k]);
  const byValue=(a,b)=>b[1].v-a[1].v||b[1].q-a[1].q;
  const clients=[...byClient].sort(byValue), agents=[...byAgent].sort(byValue);
  const max=ranked[0]?.[1][k]||1;
  const prev=previousPeriodValue();
  const rankRow=([name,c])=>`<div class="row between rank-row"><span>${e(name)}</span><span class="mono"><b>${eur(c.v)}</b> <span class="muted">· ${num(c.q)} njësi</span></span></div>`;
  return `<div class="page-head"><div><div class="eyebrow">ANALITIKA E FABRIKËS</div><h1>Shitjet dhe dërgesat</h1><p>Llogariten sipas sasive realisht të dërguara dhe datës së dërgesës, me çmimin e secilës porosi.</p></div><button class="btn outline" data-action="export-csv">↓ Eksporto CSV</button></div>
  <div class="toolbar"><select id="report-period" class="select" style="width:auto"><option value="month" ${S.reportPeriod==='month'?'selected':''}>Muaji</option><option value="year" ${S.reportPeriod==='year'?'selected':''}>Viti</option><option value="all" ${S.reportPeriod==='all'?'selected':''}>Gjithë periudha</option></select>${S.reportPeriod!=='all'?`<select id="report-year" class="select" style="width:auto">${Array.from({length:8},(_,i)=>new Date().getFullYear()-i).map(y=>`<option value="${y}" ${Number(S.reportYear)===y?'selected':''}>${y}</option>`).join('')}</select>`:''}${S.reportPeriod==='month'?`<select id="report-month" class="select" style="width:auto">${MONTHS.map((m,i)=>`<option value="${i+1}" ${Number(S.reportMonth)===i+1?'selected':''}>${m}</option>`).join('')}</select>`:''}</div>
  <div class="stats"><div class="panel stat stat-money"><span class="stat-label"><i class="dot green"></i> Shitjet (të dërguara)</span><span class="stat-value mono">${eur(totalValue)}</span><small>${prev!=null?trendText(totalValue,prev):'për gjithë periudhën'}</small></div><div class="panel stat"><span class="stat-label">Njësi të dërguara</span><span class="stat-value">${num(totalUnits)}</span><small>kova / thasë / komplete, së bashku</small></div><div class="panel stat"><span class="stat-label">Dërgesa të regjistruara</span><span class="stat-value">${num(new Set(rows.map(x=>x.shipment_id)).size)}</span><small>për periudhën</small></div><div class="panel stat"><span class="stat-label">Klientë aktivë</span><span class="stat-value">${num(byClient.size)}</span><small>me të paktën një dërgesë</small></div></div>
  ${unpriced?`<div class="notice">⚠️ ${num(unpriced)} rreshta dërgese nuk kanë çmim dhe nuk llogariten në shitje. ${isAdmin()?'Vendosni çmimet te <b>Çmimet</b>, pastaj te porositë përkatëse shtypni “Plotëso çmimet nga lista”.':'Administratori duhet t’i vendosë çmimet.'}</div>`:''}
  <div class="two-col"><div class="panel pad"><div class="sectiontitle"><h2>Produktet më të shitura</h2><div class="filters"><button class="filter ${k==='q'?'on':''}" data-action="report-sort" data-id="qty">Sipas sasisë</button><button class="filter ${k==='v'?'on':''}" data-action="report-sort" data-id="value">Sipas vlerës</button></div></div>${ranked.length?ranked.slice(0,25).map(([name,c])=>`<div class="chartline"><div class="captionrow"><span>${e(name)}</span><b class="mono">${num(c.q)} · ${eur(c.v)}</b></div><div class="bar"><div style="width:${100*c[k]/max}%"></div></div></div>`).join(''):'<div class="empty">Nuk ka dërgesa për periudhën e zgjedhur.</div>'}</div>
  <div><div class="panel pad"><div class="sectiontitle"><h2>Agjentët sipas shitjeve</h2></div>${agents.length?agents.map(rankRow).join(''):'<p class="muted small">Nuk ka të dhëna.</p>'}</div><div class="panel pad" style="margin-top:16px"><div class="sectiontitle"><h2>Klientët kryesorë</h2></div>${clients.length?clients.slice(0,20).map(rankRow).join(''):'<p class="muted small">Nuk ka të dhëna.</p>'}</div></div></div>
  <div class="notice" style="margin-top:18px">Njësitë totale përfshijnë ambalazhe të ndryshme (kova, thasë, komplete). Vlera llogaritet me çmimin e ruajtur në secilën porosi; ndryshimi i listës së çmimeve nuk i ndryshon porositë e vjetra.</div>`;
}
function csvExport(){
  const list=reportRows();
  const n2=x=>x==null?'':Number(x).toFixed(2).replace('.',',');
  const cell=val=>{let v=String(val??'');if(/^[=+\-@]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';};
  const rows=[['Data e dërgesës','Porosia','Klienti','Lokacioni','Produkti','Nuanca','Paketimi','Sasia e dërguar','Çmimi për njësi (EUR)','Vlera (EUR)','Agjenti'],
    ...list.map(x=>[time(x.time),x.order_no,x.client,x.location,x.product,x.shade,x.size,x.quantity,n2(x.price),x.price!=null?n2(x.value):'',x.agent])];
  const csv='﻿'+rows.map(r=>r.map(cell).join(';')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`Regina_Color_Shitjet_${S.reportPeriod}_${today()}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);toast('Raporti CSV u përgatit.');
}

// ---------- Njoftimet ----------
function notificationsView(){
  const st=S.pushState||{};const supported='Notification' in window&&'serviceWorker' in navigator;
  const perm=supported?Notification.permission:'unsupported';
  const iOS=/iPhone|iPad|iPod/.test(navigator.userAgent);const standalone=window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone;
  const pushReady=!backend.isDemo&&Boolean(CLOUD_CONFIG.vapidPublicKey);
  const who=canManage()?'për çdo <b>porosi të re</b>':'kur fabrika <b>dërgon</b> porositë tuaja';
  const status=st.subscribed?'✅ Njoftimet push janë aktive në këtë pajisje.':perm==='denied'?'⛔ Njoftimet janë bllokuar në shfletues. Lejojini te cilësimet e faqes (ikona 🔒 pranë adresës) dhe provoni përsëri.':'🔕 Njoftimet push nuk janë aktive në këtë pajisje.';
  return `<div class="page-head"><div><div class="eyebrow">NJOFTIMET</div><h1>Njoftimet në telefon</h1><p>Merrni njoftim ${who}.</p></div></div>
  <div class="two-col"><div class="panel pad"><h2>Kjo pajisje</h2><div class="notif-status ${st.subscribed?'on':''}">${status}</div>
  ${!supported?`<div class="notice">Ky shfletues nuk i mbështet njoftimet. Në Android përdorni Chrome.${iOS?' Në iPhone: Share → “Add to Home Screen”, pastaj hapeni aplikacionin nga ikona (iOS 16.4+).':''}</div>`:iOS&&!standalone?`<div class="notice">Në iPhone njoftimet punojnë vetëm kur aplikacioni është shtuar në ekran: Share → <b>Add to Home Screen</b>, hapeni nga ikona dhe kthehuni këtu.</div>`:''}
  <div class="row wrap" style="margin-top:16px;gap:9px">${st.subscribed?`<button class="btn outline" data-action="push-disable">Çaktivizo në këtë pajisje</button>`:`<button class="btn gold" data-action="push-enable" ${pushReady&&supported?'':'disabled'}>🔔 Aktivizo njoftimet</button>`}<button class="btn outline" data-action="notif-test">Provo njoftimin</button></div>
  ${pushReady?'':`<p class="hint">${backend.isDemo?'Në modalitetin demo njoftimet push nuk dërgohen; mund të provoni vetëm njoftimin lokal dhe zilen.':'Mungon <code>vapidPublicKey</code> në config.js – shihni README.'}</p>`}
  <p class="hint" style="margin-top:14px">Këshillë: në Chrome hapni menynë ⋮ → <b>Add to Home screen</b> që aplikacioni të hapet si app.</p></div>
  <div class="panel pad"><h2>Si funksionon</h2><ul class="howto"><li><b>Push në telefon</b> – vjen edhe kur aplikacioni është i mbyllur, pasi ta aktivizoni në secilin telefon.</li>${canManage()?'<li><b>Njoftim në aplikacion</b> – kur aplikacioni është i hapur, kontrollon çdo 30 sekonda dhe bie një zile kur vjen porosi e re.</li><li><b>Telegram</b> – çdo porosi e re dërgohet edhe në grupin Telegram të fabrikës (nëse është konfiguruar).</li>':'<li>Njoftoheni sa herë që fabrika regjistron dërgesë për porositë tuaja.</li>'}</ul></div></div>`;
}
function urlB64(b){const p='='.repeat((4-b.length%4)%4);const raw=atob((b+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));}
async function swReg(){if(!('serviceWorker' in navigator))return null;try{return await navigator.serviceWorker.register('sw.js');}catch(err){console.warn('Service worker:',err.message);return null;}}
async function refreshPushState(){let subscribed=false;try{const reg=await navigator.serviceWorker?.getRegistration();const sub=await reg?.pushManager?.getSubscription();subscribed=Boolean(sub)&&!backend.isDemo;}catch{}S.pushState={subscribed};if(S.view==='notifications')render();}
async function enablePush(){
  if(backend.isDemo)throw Error('Njoftimet push punojnë vetëm në versionin online.');
  if(!CLOUD_CONFIG.vapidPublicKey)throw Error('Mungon vapidPublicKey në config.js.');
  if(!('serviceWorker' in navigator)||!('PushManager' in window))throw Error('Ky shfletues nuk i mbështet njoftimet push.');
  if(await Notification.requestPermission()!=='granted')throw Error('Leja për njoftime nuk u dha.');
  if(!await swReg())throw Error('Service worker nuk u regjistrua.');
  const reg=await navigator.serviceWorker.ready;
  const sub=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlB64(CLOUD_CONFIG.vapidPublicKey)});
  await backend.savePushSubscription(sub);
}
async function disablePush(){const reg=await navigator.serviceWorker?.getRegistration();const sub=await reg?.pushManager?.getSubscription();if(sub){await backend.deletePushSubscription(sub.endpoint).catch(()=>{});await sub.unsubscribe();}}
function beep(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const ctx=new C();[0,0.18].forEach((t,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=i?1175:880;g.gain.setValueAtTime(0.0001,ctx.currentTime+t);g.gain.exponentialRampToValueAtTime(0.25,ctx.currentTime+t+0.02);g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+t+0.16);o.connect(g).connect(ctx.destination);o.start(ctx.currentTime+t);o.stop(ctx.currentTime+t+0.17);});setTimeout(()=>ctx.close(),800);}catch{}}
async function showLocalNotification(title,body,url,tag){
  if(!('Notification' in window)||Notification.permission!=='granted')return false;
  try{const reg=await navigator.serviceWorker?.getRegistration();const opts={body,tag,data:{url},icon:'assets/icon-192.png',badge:'assets/icon-192.png'};if(reg){await reg.showNotification(title,opts);return true;}new Notification(title,opts);return true;}catch{return false;}
}
const seenKey=()=>'regina-last-order-'+(S.user?.id||'x');
let alertTimer=null;
function startAlerts(){if(alertTimer||!S.user)return;alertTimer=setInterval(checkNewOrders,30000);checkNewOrders();}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&alertTimer)checkNewOrders();});
async function checkNewOrders(){
  if(!S.user||!canManage())return;
  try{
    const list=await backend.latestOrders();
    const max=list.reduce((a,o)=>Math.max(a,Number(o.order_no)||0),0);
    const last=Number(localStorage.getItem(seenKey())||0);
    localStorage.setItem(seenKey(),String(Math.max(max,last)));
    if(!last||max<=last)return;   // herën e parë vetëm mbajmë mend numrin
    const fresh=list.filter(o=>Number(o.order_no)>last&&o.agent_id!==S.user.id);
    if(!fresh.length)return;
    S.data=await backend.load();
    if(!S.modal&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))render();
    beep();
    for(const o of fresh.slice(0,3)){
      const c=byId('clients',o.client_id);const title='🧾 Porosi e re '+fmtId(o);const body=[c?.name,c?.location].filter(Boolean).join(' — ');
      if(document.hidden)await showLocalNotification(title,body,'./?order='+o.id,'order-'+o.order_no);
      toast(title+(body?' · '+body:''));
    }
  }catch(err){console.warn('Kontrolli i porosive të reja:',err.message);}
}
function openOrderById(id){if(byId('orders',id)){S.view='orders';S.selectedOrder=id;S.modal=null;S.mobileOpen=false;render();window.scrollTo(0,0);return true;}return false;}
function openDeepLink(){const id=new URLSearchParams(location.search).get('order');if(!id)return;history.replaceState(null,'',location.pathname);if(byId('orders',id)){S.view='orders';S.selectedOrder=id;}}
navigator.serviceWorker?.addEventListener('message',async ev=>{
  if(ev.data?.type!=='open'||!S.user)return;
  const id=new URL(ev.data.url,location.href).searchParams.get('order');if(!id)return;
  if(!openOrderById(id)){try{S.data=await backend.load();openOrderById(id);}catch{}}
});
document.addEventListener('error',ev=>{if(ev.target?.tagName==='IMG')ev.target.hidden=true;},true);

function teamView(){if(!isAdmin())return dashboardView();const list=getData().profiles;return `<div class="page-head"><div><div class="eyebrow">KONTROLLI I QASJES</div><h1>Stafi dhe lejet</h1><p>Vetëm administratori cakton kush mund të shohë, krijojë dhe realizojë porosi.</p></div></div><div class="notice">Llogaritë e reja krijohen te <b>Supabase → Authentication → Users</b>. Më pas aktivizohen këtu. Mos shpërndani fjalëkalime mes punëtorëve. ${backend.isDemo?'Në demo shfaqen vetëm rolet e testimit.':''}</div><div class="panel"><div class="list-wrap"><table class="table"><thead><tr><th>Emri</th><th>Roli</th><th>Aktiv</th><th></th></tr></thead><tbody>${list.map(p=>`<tr><td><b>${e(p.full_name)}</b><div class="small muted">${e(p.id.substring(0,12))}</div></td><td><select class="select" id="role-${e(p.id)}" style="width:175px">${Object.entries(roleNames).map(([id,label])=>`<option value="${id}" ${id===p.role?'selected':''}>${e(label)}</option>`).join('')}</select></td><td><input type="checkbox" id="active-${e(p.id)}" ${p.active?'checked':''}/></td><td><button class="btn outline sm" data-action="save-profile" data-id="${e(p.id)}">Ruaj</button></td></tr>`).join('')}</tbody></table></div></div>`;}
function modalHtml(){if(!S.modal)return '';if(S.modal==='client')return `<div class="modal-wrap" data-action="overlay"><form class="modal" id="client-form"><div class="modalhead"><h2>Shto klient të ri</h2><button type="button" class="close" data-action="modal-close">×</button></div><div class="modalbody"><div class="field"><label>Emri i klientit *</label><input class="input" name="name" required minlength="2" maxlength="150" placeholder="P.sh. Termo Projekt"/></div><div class="field" style="margin-top:14px"><label>Lokacioni *</label><input class="input" name="location" required minlength="2" maxlength="150" placeholder="P.sh. Istog"/></div></div><div class="modalfoot"><button class="btn outline" type="button" data-action="modal-close">Anulo</button><button class="btn gold" type="submit">Ruaj klientin</button></div></form></div>`;
if(S.modal==='product')return `<div class="modal-wrap" data-action="overlay"><form class="modal" id="product-form"><div class="modalhead"><h2>Shto produkt</h2><button type="button" class="close" data-action="modal-close">×</button></div><div class="modalbody"><div class="field"><label>Emri i produktit</label><input class="input" name="name" required minlength="2"/></div><div class="field" style="margin-top:12px"><label>Reparti (vetëm për administrim)</label><select class="select" name="department">${Object.entries(DEPARTMENTS).map(([v,l])=>`<option value="${v}">${e(l)}</option>`).join('')}</select></div><div class="field" style="margin-top:12px"><label>Paketimi i parë</label><input class="input" name="size" placeholder="P.sh. 25 kg" required/></div><p class="hint">Mund të shtosh produkt të ri me një paketim. Për shtimin e më shumë varianteve përdoret katalogu/SQL.</p></div><div class="modalfoot"><button type="button" class="btn outline" data-action="modal-close">Anulo</button><button class="btn gold" type="submit">Shto produktin</button></div></form></div>`;
if(S.modal==='image'&&S.product){const p=byId('products',S.product);return `<div class="modal-wrap" data-action="overlay"><form class="modal" id="image-form"><div class="modalhead"><h2>Fotografia e produktit</h2><button type="button" class="close" data-action="modal-close">×</button></div><div class="modalbody"><p>${e(p?.name)}</p><div class="field" style="margin-top:13px"><label>URL HTTPS e fotografisë</label><input class="input" name="url" type="url" placeholder="https://.../produkti.jpg" value="${e(p?.image_url||'')}"/></div><p class="hint">Përdor një lidhje të drejtpërdrejtë te fotografia, jo URL e faqes së produktit.</p></div><div class="modalfoot"><button type="button" class="btn outline" data-action="modal-close">Anulo</button><button class="btn gold" type="submit">Ruaj fotografinë</button></div></form></div>`;}
if(S.modal==='variants'&&S.product){const p=byId('products',S.product);const vars=variants(p.id);const isShaded=vars.some(v=>v.shade_code);const shades=[...new Set(vars.map(v=>v.shade_code).filter(Boolean))];const chosen=S.selectedShade||shades[0];const current=isShaded?vars.filter(v=>v.shade_code===chosen):vars;return `<div class="modal-wrap" data-action="overlay"><div class="modal"><div class="modalhead"><h2>${e(p.name)}</h2><button class="close" data-action="modal-close">×</button></div><div class="modalbody"><div class="modalproduct"><div class="product-thumb" style="width:80px;height:70px;border-radius:9px;flex-shrink:0">${coloredThumb(p)}</div><div><b>${e(p.name)}</b><div class="muted small">${e(DEPARTMENTS[p.department]||'Produkt Regina Color')}</div></div></div>${isShaded?`<label class="field-label">Zgjedh nuancën</label><div style="max-height:215px;overflow:auto;padding:9px 2px"><div class="shade-grid">${shades.map(sh=>`<button class="shade-btn ${chosen===sh?'chosen':''}" data-action="select-shade" data-id="${e(sh)}">${e(sh)}</button>`).join('')}</div></div>`:''}<label class="field-label" style="display:block;margin:14px 0">Paketimi dhe sasia</label><div class="variant-list">${current.map(v=>`<div class="variant-option"><div><strong>${e(v.size_label)}</strong>${v.shade_code?`<div class="small muted">${e(v.shade_code)}</div>`:''}<div class="small muted">${e(unitName(p))}${priceOf(p.id,v.size_label)!=null?' · <b>'+eur(priceOf(p.id,v.size_label))+'</b>':''}</div></div><div class="quantity"><button class="qty-btn" data-action="cart-minus" data-id="${e(v.id)}">−</button><input type="number" class="qty-direct" min="0" max="1000000" data-quantity-id="${e(v.id)}" value="${S.cart[v.id]||0}" aria-label="Sasia"/><button class="qty-btn" data-action="cart-plus" data-id="${e(v.id)}">＋</button></div></div>`).join('')}</div>${isAdmin()?`<button class="btn outline sm" style="margin-top:20px" data-action="modal-image">Cakto fotografinë</button>`:''}</div><div class="modalfoot"><button class="btn gold" data-action="modal-close">${S.view==='new'?'Vazhdo me porosinë':'Mbyll'}</button></div></div></div>`;}
return '';}
function reloadAndRender(){return backend.load().then(d=>{S.data=d;render();});}
function mutateCart(id,delta){const v=byId('product_variants',id);if(!v)return;S.cart[id]=Math.max(0,(S.cart[id]||0)+delta);if(!S.cart[id])delete S.cart[id];render();}
function focusAgain(id){const input=document.getElementById(id);if(input){input.focus();input.setSelectionRange?.(input.value.length,input.value.length);}}
async function action(id,el){
  const key=el.dataset.id;
  if(id==='start-demo'){S.user=await backend.switchRole(document.getElementById('demo-start-role').value);S.data=await backend.load();render();startAlerts();return;}
  if(id==='mobile-menu'){S.mobileOpen=!S.mobileOpen;render();return;}
  if(id==='close-menu'){S.mobileOpen=false;render();return;}
  if(id==='nav'){S.view=key;S.mobileOpen=false;S.selectedOrder=null;S.modal=null;render();if(key==='notifications')refreshPushState();return;}
  if(id==='logout'){if(!backend.isDemo)await disablePush().catch(()=>{});clearInterval(alertTimer);alertTimer=null;await backend.logout();S.user=null;S.data=null;S.selectedOrder=null;S.cart={};S.modal=null;render();return;}
  if(id==='refresh'){await reloadAndRender();toast('Të dhënat u rifreskuan.');return;}
  if(id==='order-filter'){S.ordersFilter=key;render();return;}
  if(id==='open-order'){S.selectedOrder=key;S.view='orders';render();window.scrollTo(0,0);return;}
  if(id==='back-orders'){S.selectedOrder=null;render();return;}
  if(id==='print'){window.print();return;}
  if(id==='modal-client'){S.modal='client';render();return;}
  if(id==='modal-product'){S.modal='product';render();return;}
  if(id==='modal-image'){S.modal='image';render();return;}
  if(id==='modal-close'){S.modal=null;S.product=null;S.selectedShade=null;render();return;}
  if(id==='choose-product'){S.product=key;S.selectedShade=null;S.modal='variants';render();return;}
  if(id==='select-shade'){S.selectedShade=key;render();return;}
  if(id==='cart-plus'){mutateCart(key,1);return;}
  if(id==='cart-minus'){mutateCart(key,-1);return;}
  if(id==='cart-remove'){delete S.cart[key];render();return;}
  if(id==='submit-order'){
    const items=Object.entries(S.cart).filter(([_,qty])=>qty>0).map(([variant_id,qty])=>({variant_id,qty}));
    if(!S.clientId||!items.length)throw Error('Zgjedh klientin dhe së paku një produkt.');
    if(!confirm('Ta dërgojmë porosinë në fabrikë?'))return;
    const created=await backend.createOrder(S.clientId,items,S.note);
    S.cart={};S.clientId='';S.note='';S.searchProducts='';S.selectedOrder=created;S.view='orders';
    await reloadAndRender();toast('Porosia u regjistrua me sukses.');window.scrollTo(0,0);return;
  }
  if(id==='status'){
    const o=byId('orders',S.selectedOrder);if(!o)throw Error('Porosia nuk ekziston');
    if(key==='cancelled'&&!confirm('A dëshiron ta anulosh këtë porosi?'))return;
    await backend.setOrderStatus(o.id,key);await reloadAndRender();toast('Statusi u ndryshua.');return;
  }
  if(id==='fill-remaining'){
    for(const i of orderItems(S.selectedOrder)){const input=document.getElementById('ship-'+i.id);if(input)input.value=String(i.ordered_qty-i.fulfilled_qty);}return;
  }
  if(id==='ship'){
    const o=byId('orders',key);if(!o)throw Error('Porosia nuk ekziston');
    const close=Boolean(document.getElementById('close-order')?.checked);
    const note=document.getElementById('shipment-note')?.value||'';
    const lines=[];for(const it of orderItems(key)){
      const raw=document.getElementById('ship-'+it.id)?.value??'0';const qty=Number(raw);
      if(!Number.isSafeInteger(qty)||qty<0||qty>it.ordered_qty-it.fulfilled_qty)throw Error('Kontrollo sasitë e dërgesës.');
      if(qty>0)lines.push({order_item_id:it.id,qty});
    }
    if(!lines.length&&!close)throw Error('Cakto të paktën një njësi për dërgesën.');
    if(close&&remainder(o)-lines.reduce((a,x)=>a+x.qty,0)>0&&!confirm('Disa njësi mbesin pa u dërguar. Ta mbyllim porosinë me mbetje?'))return;
    await backend.registerShipment(key,lines,close,note);await reloadAndRender();toast('Dërgesa u regjistrua me datë dhe orë.');return;
  }
  if(id==='adjust-item'){
    const value=Number(document.getElementById('edit-'+key)?.value);
    if(!Number.isSafeInteger(value)||value<1)throw Error('Sasia duhet të jetë numër i plotë pozitiv.');
    if(!confirm(`Ta ndryshojmë sasinë e porositur në ${value}? Ndryshimi ruhet në historik.`))return;
    await backend.adjustOrderItem(key,value);await reloadAndRender();toast('Sasia e porosisë u korrigjua.');return;
  }
  if(id==='reopen'){if(!confirm('Ta rihapim porosinë për një dërgesë tjetër?'))return;await backend.reopenOrder(key);await reloadAndRender();toast('Porosia u rihap.');return;}
  if(id==='export-csv'){csvExport();return;}
  if(id==='report-sort'){S.reportSort=key;render();return;}
  if(id==='set-item-price'){
    const v=parseMoney(document.getElementById('price-'+key)?.value);
    if(Number.isNaN(v))throw Error('Çmimi nuk është i vlefshëm (p.sh. 12,50).');
    await backend.setItemPrice(key,v);await reloadAndRender();toast(v==null?'Çmimi u hoq.':'Çmimi u ruajt: '+eur(v));return;
  }
  if(id==='fill-prices'){const n=Number(await backend.fillMissingPrices(key))||0;await reloadAndRender();toast(n?`U plotësuan ${n} çmime nga lista.`:'Lista nuk ka çmime për këto produkte. Vendosini te “Çmimet”.',!n);return;}
  if(id==='save-prices'){
    const inputs=[...document.querySelectorAll('[data-price-product]')].filter(i=>i.value.trim()!==i.dataset.orig);
    if(!inputs.length){toast('Nuk ka ndryshime për t’u ruajtur.');return;}
    for(const i of inputs){if(Number.isNaN(parseMoney(i.value))){i.focus();throw Error(`Çmim i pavlefshëm te ${i.dataset.priceSize} (p.sh. 12,50).`);}}
    for(const i of inputs)await backend.setProductPrice(i.dataset.priceProduct,i.dataset.priceSize,parseMoney(i.value));
    await reloadAndRender();toast(`U ruajtën ${inputs.length} çmime.`);return;
  }
  if(id==='push-enable'){await enablePush();await refreshPushState();toast('Njoftimet u aktivizuan në këtë pajisje.');return;}
  if(id==='push-disable'){await disablePush();await refreshPushState();toast('Njoftimet u çaktivizuan në këtë pajisje.');return;}
  if(id==='notif-test'){
    if('Notification' in window&&Notification.permission==='default')await Notification.requestPermission();
    await swReg();beep();
    const ok=await showLocalNotification('🔔 Regina Color','Njoftimet funksionojnë në këtë pajisje.','./','test');
    toast(ok?'Njoftimi provë u shfaq.':'Zilja u dëgjua, por njoftimet e sistemit nuk janë lejuar në këtë shfletues.',!ok);return;
  }
  if(id==='save-profile'){
    const role=document.getElementById('role-'+key)?.value;
    const active=document.getElementById('active-'+key)?.checked;
    if(key===S.user.id&&(!active||role!=='admin')&&!confirm('Kujdes: po ndryshon qasjen tënde si administrator. Vazhdo?'))return;
    await backend.updateProfile(key,role,active);await reloadAndRender();toast('Lejet e stafit u ruajtën.');return;
  }
}
async function onSubmit(event){
  if(event.target.id==='login-form'){
    event.preventDefault();const fd=new FormData(event.target);
    try{S.loginError=null;S.user=await backend.login(String(fd.get('email')),String(fd.get('password')));S.data=await backend.load();openDeepLink();render();startAlerts();toast('U kyçe me sukses.');}
    catch(err){S.loginError=err.message;S.user=null;render();}return;
  }
  if(event.target.id==='client-form'){
    event.preventDefault();const f=new FormData(event.target);try{const c=await backend.addClient(String(f.get('name')),String(f.get('location')));S.clientId=c.id;S.modal=null;await reloadAndRender();toast('Klienti u shtua me sukses.');}catch(err){toast(err.message,true);}return;
  }
  if(event.target.id==='product-form'){
    event.preventDefault();const f=new FormData(event.target);try{await backend.addProduct(String(f.get('name')).trim(),String(f.get('department')),String(f.get('size')).trim());S.modal=null;await reloadAndRender();toast('Produkti u shtua.');}catch(err){toast(err.message,true);}return;
  }
  if(event.target.id==='image-form'){
    event.preventDefault();const f=new FormData(event.target);const url=String(f.get('url')).trim();if(url&&!/^https:\/\//i.test(url)){toast('Fotografia duhet të ketë URL HTTPS.',true);return;}
    try{await backend.setProductImage(S.product,url);S.modal=null;S.product=null;await reloadAndRender();toast('Fotografia u ruajt.');}catch(err){toast(err.message,true);}return;
  }
}
app.addEventListener('click',async evt=>{
  const el=evt.target.closest('[data-action]');if(!el)return;
  if(el.dataset.action==='overlay'&&evt.target!==el)return;
  evt.preventDefault();if(el.disabled)return;
  try{await action(el.dataset.action,el);}catch(err){console.error(err);toast(err.message||'Ndodhi një gabim.',true);}
});
app.addEventListener('submit',onSubmit);
app.addEventListener('change',async evt=>{
  const id=evt.target.id;
  if(evt.target.dataset.quantityId){const qty=Number(evt.target.value);if(!Number.isSafeInteger(qty)||qty<0||qty>1000000){toast('Sasi e pavlefshme.',true);render();return;}if(qty===0)delete S.cart[evt.target.dataset.quantityId];else S.cart[evt.target.dataset.quantityId]=qty;render();return;}
  if(id==='role-demo'){try{S.user=await backend.switchRole(evt.target.value);S.data=await backend.load();S.selectedOrder=null;S.view='dashboard';render();}catch(err){toast(err.message,true);}return;}
  if(id==='new-client'){S.clientId=evt.target.value;render();return;}
  if(id==='report-period'){S.reportPeriod=evt.target.value;render();return;}
  if(id==='report-year'){S.reportYear=Number(evt.target.value);render();return;}
  if(id==='report-month'){S.reportMonth=Number(evt.target.value);render();return;}
});
app.addEventListener('input',evt=>{
  const id=evt.target.id;
  if(id==='order-note'){S.note=evt.target.value;return;}
  const targets={'prices-search':['pricesSearch','prices-search'],'product-search':['searchProducts','product-search'],'orders-search':['searchOrders','orders-search'],'catalog-search':['catalogSearch','catalog-search']};
  if(targets[id]){const [key,target]=targets[id];S[key]=evt.target.value;render();focusAgain(target);}
});
async function boot(){render();swReg();try{S.user=await backend.init();if(S.user){S.data=await backend.load();openDeepLink();render();startAlerts();}else render();}catch(err){S.user=null;S.data=null;S.loginError=err.message;render();}}
boot();
setInterval(async()=>{if(!S.user||backend.isDemo||S.modal||!['dashboard','orders','reports'].includes(S.view)||S.selectedOrder||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;try{await reloadAndRender();}catch(err){console.warn('Rifreskimi automatik:',err.message);}},30000);
