import {DEPARTMENTS} from './catalog.js';
import {LocalBackend} from './local-backend.js';
import {CloudBackend,isCloudConfigured} from './cloud-backend.js';
import {CLOUD_CONFIG} from './config.js';
import {icon,logo,crown,productArt,swatch} from './art.js';

const app=document.getElementById('app');
const backend=isCloudConfigured?new CloudBackend():new LocalBackend();

// ====================================================================
// Formatimi
// ====================================================================
const tz='Europe/Belgrade';
// Formati fiks dd.MM.yyyy HH:mm (ora e Kosovës), pavarësisht gjuhës së shfletuesit.
const partsFmt=new Intl.DateTimeFormat('en-GB',{timeZone:tz,day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const parts=x=>Object.fromEntries(partsFmt.formatToParts(new Date(x)).map(p=>[p.type,p.value]));
const time=x=>{if(!x)return '—';const p=parts(x);return `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}`;};
const date=x=>{if(!x)return '—';const p=parts(x);return `${p.day}.${p.month}.${p.year}`;};
const clock=x=>{const p=parts(x);return `${p.hour}:${p.minute}`;};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>new Intl.NumberFormat('de-DE').format(Number(n)||0);
const eur=n=>{const [i,d]=(Math.round((Number(n)||0)*100)/100).toFixed(2).split('.');return `${i.replace(/\B(?=(\d{3})+(?!\d))/g,'.')},${d} €`;};
const parseMoney=t=>{let x=String(t??'').replace(/[€\s]/g,'');if(!x)return null;if(x.lastIndexOf(',')>x.lastIndexOf('.'))x=x.replace(/\./g,'').replace(',','.');else x=x.replace(/,/g,'');const n=Number(x);return Number.isFinite(n)&&n>=0&&n<=1000000?Math.round(n*100)/100:NaN;};
const moneyInput=n=>n==null?'':Number(n).toFixed(2).replace('.',',');
const MONTHS=['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor'];

const statusNames={new:'E re',preparing:'Në përgatitje',partial:'Pjesërisht',completed:'E përfunduar',cancelled:'E anuluar'};
const roleNames={agent:'Agjent',warehouse:'Fabrikë / magazinë',admin:'Administrator'};
const roleShort={agent:'Agjent',warehouse:'Fabrika',admin:'Admin'};
// Grupet e katalogut (si në website): Regina colori përfshin edhe pluhurat Regina.
const CATALOG_GROUPS=[['all','Të gjitha',()=>true],['regina','Regina colori',p=>p.department.startsWith('regina')],['bau-farbe','BAU Farbe',p=>p.department==='bau-ngjyra'],['bau-putz','BAU Putz',p=>p.department==='bau-pluhura']];

// ====================================================================
// Gjendja dhe të dhënat
// ====================================================================
const S={user:null,data:null,view:'dashboard',selectedOrder:null,modal:null,product:null,selectedShade:null,
  cart:{},clientName:'',clientLocation:'',note:'',rowSel:{},searchProducts:'',searchOrders:'',ordersFilter:'all',expanded:{},
  dashSearch:'',dashFilter:'all',catalogSearch:'',catalogGroup:'all',reportPeriod:'month',reportYear:new Date().getFullYear(),
  reportMonth:new Date().getMonth()+1,reportSort:'qty',pricesSearch:'',pushState:null,mobileOpen:false,loginError:null};
const canManage=()=>['warehouse','admin'].includes(S.user?.role);
const isAdmin=()=>S.user?.role==='admin';
const getData=()=>S.data||{clients:[],products:[],product_variants:[],product_prices:[],orders:[],order_items:[],shipments:[],shipment_items:[],order_events:[],profiles:[]};
const byId=(table,id)=>getData()[table].find(x=>x.id===id);
const products=()=>getData().products.filter(x=>x.active).sort((a,b)=>a.name.localeCompare(b.name));
const variants=pid=>getData().product_variants.filter(v=>v.product_id===pid&&v.active);
const sizesOf=pid=>[...new Set(variants(pid).map(v=>v.size_label))];
const shadesOf=pid=>[...new Set(variants(pid).map(v=>v.shade_code).filter(Boolean))];
const orderItems=id=>getData().order_items.filter(x=>x.order_id===id);
const remainder=o=>orderItems(o.id).reduce((a,x)=>a+x.ordered_qty-x.fulfilled_qty,0);
const sent=o=>orderItems(o.id).reduce((a,x)=>a+x.fulfilled_qty,0);
const total=o=>orderItems(o.id).reduce((a,x)=>a+x.ordered_qty,0);
const P=CLOUD_CONFIG.showPrices!==false; // false = çmimet dhe vlerat në € fshihen kudo (të dhënat në databazë mbeten)
const priceOf=(productId,size)=>{if(!P)return null;const p=(getData().product_prices||[]).find(x=>x.product_id===productId&&x.size_label===size);return p?Number(p.price):null;};
const orderValue=o=>orderItems(o.id).reduce((a,x)=>a+(x.unit_price!=null?Number(x.unit_price)*x.ordered_qty:0),0);
const sentValue=o=>orderItems(o.id).reduce((a,x)=>a+(x.unit_price!=null?Number(x.unit_price)*x.fulfilled_qty:0),0);
const hasPrice=o=>P&&orderItems(o.id).some(x=>x.unit_price!=null);
const missingPrice=o=>P&&orderItems(o.id).some(x=>x.unit_price==null);
const statusText=o=>o.status==='completed'&&remainder(o)>0?'E mbyllur me mbetje':statusNames[o.status]||o.status;
const badge=o=>`<span class="badge ${e(o.status)}">${e(statusText(o))}</span>`;
const fmtId=o=>`#RG-${String(o.order_no||0).padStart(4,'0')}`;
const productOfItem=it=>byId('products',byId('product_variants',it?.variant_id)?.product_id);
const itemFullName=item=>{const v=byId('product_variants',item.variant_id);const p=byId('products',v?.product_id);return [p?.name||'Produkt i panjohur',v?.shade_code||'',...(p?.department?.includes('pluhura')?[]:[v?.size_label||''])].filter(Boolean).join(' · ');};
const unitName=p=>p?.name?.includes('Waterproofing')?'komplete':p?.department?.includes('pluhura')?'thasë':'copë';
const clientOf=o=>byId('clients',o.client_id);
const pct=o=>{const t=total(o);return t?Math.round(sent(o)/t*100):0;};
function shippedValueBetween(start,end){const d=getData();let v=0;for(const sh of d.shipments){const t=new Date(sh.dispatched_at);if(t<start||t>=end)continue;for(const si of d.shipment_items.filter(x=>x.shipment_id===sh.id)){const it=byId('order_items',si.order_item_id);if(it?.unit_price!=null)v+=Number(it.unit_price)*si.quantity;}}return v;}
function previousPeriodValue(){if(S.reportPeriod==='month'){const y=Number(S.reportYear),m=Number(S.reportMonth)-1;return shippedValueBetween(new Date(y,m-1,1),new Date(y,m,1));}if(S.reportPeriod==='year'){const y=Number(S.reportYear)-1;return shippedValueBetween(new Date(y,0,1),new Date(y+1,0,1));}return null;}
function trendText(now,prev){if(!prev)return 'periudha e kaluar: 0,00 €';const p=Math.round((now-prev)/prev*100);return `${p>=0?'▲':'▼'} ${Math.abs(p)}% nga periudha e kaluar`;}
const sortedOrders=()=>[...getData().orders].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
const orderMatches=(o,q)=>!q||[fmtId(o),clientOf(o)?.name,clientOf(o)?.location,o.notes,...orderItems(o.id).map(itemFullName)].some(t=>String(t||'').toLowerCase().includes(q));

function toast(msg,error=false){document.querySelector('.toast')?.remove();const node=document.createElement('div');node.className='toast'+(error?' error':'');node.setAttribute('role','status');node.textContent=msg;document.body.append(node);setTimeout(()=>node.remove(),4800);}
const notice=()=>backend.isDemo?`<div class="notice demo"><b>Modalitet demonstrues:</b> të dhënat ruhen vetëm në këtë shfletues. Për punë reale lidheni databazën Supabase (shih README).</div>`:'';

// ====================================================================
// Struktura: sidebar + topbar
// ====================================================================
function navItems(){return [
  {key:'dashboard',label:'Përmbledhja',icon:'grid'},
  {key:'new',label:'Krijo porosi',icon:'plusCircle'},
  {key:'orders',label:canManage()?'Porositë':'Porositë e mia',icon:'clipboard'},
  {key:'catalog',label:'Katalogu i produkteve',icon:'bag'},
  ...(isAdmin()&&P?[{key:'prices',label:'Çmimet',icon:'tag'}]:[]),
  ...(canManage()?[{key:'reports',label:P?'Shitjet dhe raportet':'Raportet',icon:'chart'}]:[]),
  {key:'notifications',label:'Njoftimet',icon:'bell'},
  ...(isAdmin()?[{key:'team',label:'Stafi & qasja',icon:'users'}]:[]),
];}
const titles={dashboard:'Paneli kryesor',new:'Porosi e re',orders:'Porositë',catalog:'Katalogu',prices:'Çmimet',reports:'Shitjet',notifications:'Njoftimet',team:'Stafi'};
function sidebar(){
  const newCount=canManage()?getData().orders.filter(o=>o.status==='new').length:0;
  return `<div class="mobile-shadow ${S.mobileOpen?'open':''}" data-action="close-menu"></div>
  <aside class="sidebar ${S.mobileOpen?'open':''}">
    ${logo()}
    <div class="navlabel">Hapësira e punës</div>
    <nav>${navItems().map(n=>`<button class="navbtn ${S.view===n.key?'active':''}" data-action="nav" data-id="${n.key}">${icon(n.icon,21)}<span>${n.label}</span>${n.key==='orders'&&newCount?`<span class="count">${newCount}</span>`:''}</button>`).join('')}</nav>
    <div class="sidebar-bottom">
      <div class="person"><div class="avatar">${e((S.user.full_name||'R')[0]).toUpperCase()}</div><div><b>${e(S.user.full_name)}</b><span>${e(roleNames[S.user.role])}</span></div></div>
      ${backend.isDemo?`<label class="demo-label" for="role-demo">Provo rolet (vetëm demo)</label><select id="role-demo" class="role-select">${[['demo-agent','Agjent'],['demo-warehouse','Fabrika'],['demo-admin','Administrator']].map(([id,label])=>`<option value="${id}" ${S.user.id===id?'selected':''}>${label}</option>`).join('')}</select>`:''}
      <button class="logout-btn" data-action="logout">${icon('logout',19)}${backend.isDemo?'Rivendos panelin':'Dil nga llogaria'}</button>
    </div>
  </aside>`;
}
function topbar(){return `<header class="topbar"><div class="top-left"><button class="mobile-menu" data-action="mobile-menu" aria-label="Hap menunë">${icon('menu',24)}</button><span class="top-title">${titles[S.view]||''}</span></div>
  <div class="top-meta"><span class="date">${e(date(new Date()))}</span><span class="top-sep"></span><span class="role-chip">${icon('user',16)}${e(roleShort[S.user.role])}</span></div></header>`;}

function render(){
  if(!S.user){renderLogin();return;}
  if(!S.data){app.innerHTML=`<div class="boot"><img class="boot-logo" src="assets/brand/regina-colori.png" alt="Regina Colori" width="176" height="44"/><small>Duke ngarkuar…</small></div>`;return;}
  const pages={dashboard:dashboardView,new:newOrderView,orders:ordersView,catalog:catalogView,prices:pricesView,reports:reportsView,notifications:notificationsView,team:teamView};
  if(!navItems().some(n=>n.key===S.view))S.view='dashboard';
  app.innerHTML=`<div class="layout">${sidebar()}<main class="main">${topbar()}<div class="content">${notice()}${pages[S.view]()}</div></main></div>${modalHtml()}`;
}

// ====================================================================
// Hyrja
// ====================================================================
function loginHero(){return `<section class="login-hero">${logo()}<div><h1>Çdo porosi.<br/><em>Në një vend.</em></h1><p>Porositë nga agjentët në terren, realizimi në fabrikë dhe njoftimet, pa fletore dhe pa humbur të dhëna.</p></div><img class="hero-products" src="assets/brand/hero-products.webp" alt="" aria-hidden="true"/></section>`;}
// Hyrja: zgjidh rolin (config.js → loginAccounts), pastaj vetëm fjalëkalimi. Email-at nuk janë sekret.
const LOGIN_ACCOUNTS=Array.isArray(CLOUD_CONFIG.loginAccounts)?CLOUD_CONFIG.loginAccounts:[];
const loginIcons={admin:'checkCircle',agent:'user',warehouse:'home'};
function loginRoleSaved(){try{return localStorage.getItem('regina-login-role')||'';}catch{return '';}}
function loginForm(){
  if(S.loginRole===undefined){const saved=loginRoleSaved();S.loginRole=LOGIN_ACCOUNTS.some(a=>a.key===saved)?saved:(LOGIN_ACCOUNTS.length?'':'other');}
  const acc=LOGIN_ACCOUNTS.find(a=>a.key===S.loginRole);const other=S.loginRole==='other';const chosen=Boolean(acc)||other;
  return `<form class="login-card" id="login-form"><div><div class="eyebrow">Qasje e kufizuar</div><h1>Kyçu në sistem</h1><p style="margin-top:9px">${chosen?'Shkruaj fjalëkalimin për të vazhduar.':'Zgjidh si dëshiron të hysh.'}</p></div>
  ${S.loginError?`<div class="notice" role="alert">${e(S.loginError)}</div>`:''}
  ${LOGIN_ACCOUNTS.length&&!other?`<div class="role-pick" role="group" aria-label="Hyr si">${LOGIN_ACCOUNTS.map(a=>`<button type="button" class="role-card ${S.loginRole===a.key?'on':''}" data-action="login-role" data-id="${e(a.key)}" aria-pressed="${S.loginRole===a.key}"><span class="role-ico">${icon(loginIcons[a.key]||'user',24)}</span><span><b>${e(a.label)}</b><small>${e(a.hint||'')}</small></span></button>`).join('')}</div>`:''}
  ${acc?`<input type="email" name="email" value="${e(acc.email)}" autocomplete="username" class="sr-only" tabindex="-1" aria-hidden="true" readonly/>`:''}
  ${other?`<div class="field"><label for="login-email">Email</label><input id="login-email" type="email" class="input" name="email" required autocomplete="username" placeholder="emri@kompania.com"/></div>`:''}
  ${chosen?`<div class="field"><label for="login-password">Fjalëkalimi${acc?` për <b>${e(acc.label)}</b>`:''}</label><input id="login-password" type="password" class="input" name="password" required autocomplete="current-password"/></div><button class="btn gold lg full" type="submit">${acc?`Kyçu si ${e(acc.label)}`:'Kyçu'} ${icon('arrowRight',20)}</button>`:''}
  ${LOGIN_ACCOUNTS.length?`<button type="button" class="link" style="justify-self:start" data-action="login-role" data-id="${other?'':'other'}">${other?'← Zgjidh rolin':'Llogari tjetër? Hyr me email'}</button>`:''}
  <p class="hint">Vetëm përdoruesit e aktivizuar nga administratori mund të hyjnë.</p></form>`;
}
function renderLogin(){
  if(backend.isDemo){app.innerHTML=`<div class="login-view">${loginHero()}<section class="login-box"><div class="login-card"><div><div class="eyebrow">Provo aplikacionin</div><h1>Mirë se erdhe!</h1><p style="margin-top:10px">Zgjedh rolin me të cilin dëshiron ta provosh. Demonstrimi nuk përdor llogari të vërteta.</p></div><div class="field"><label for="demo-start-role">Roli demonstrues</label><select class="select" id="demo-start-role"><option value="demo-agent">Agjent shitjeje</option><option value="demo-warehouse">Fabrika / magazina</option><option value="demo-admin">Administrator</option></select></div><button class="btn gold lg full" data-action="start-demo">Hap aplikacionin ${icon('arrowRight',20)}</button><div class="notice demo">Për përdorim të përbashkët kërkohet konfigurimi Supabase sipas README.</div></div></section></div>`;return;}
  app.innerHTML=`<div class="login-view">${loginHero()}<section class="login-box">${loginForm()}</section></div>`;
}
function fan(){
  const tones=[['#F3E6CF','#EAD7B6','#E2C99E'],['#EBD4AE','#E1C08C','#D5AC6F'],['#E7C177','#DDAA4B','#C98F2A'],['#D9C978','#C2B25A','#9E9443'],['#AFC79A','#8FAE7C','#6B8F5C'],['#9CC3C4','#6FA4AA','#3F7F88'],['#9DB7D3','#6E95BE','#46709E'],['#7F94B8','#566F9A','#2F4775']];
  return `<div class="fan" aria-hidden="true">${tones.map((t,i)=>`<i style="--c1:${t[0]};--c2:${t[1]};--c3:${t[2]};transform:translateX(-50%) rotate(${-62+i*15}deg)"></i>`).join('')}</div>`;
}

// ====================================================================
// Përmbledhja
// ====================================================================
function statCard(dot,label,value,sub,ico,cls=''){return `<div class="panel stat ${cls}"><div style="min-width:0"><span class="stat-label"><i class="dot ${dot}"></i>${label}</span><span class="stat-value mono">${value}</span><small>${sub}</small></div><div class="stat-ico">${icon(ico,26)}</div></div>`;}
function dashboardView(){
  const d=getData();
  const active=d.orders.filter(o=>!['completed','cancelled'].includes(o.status));
  const start=new Date();start.setDate(start.getDate()-30);
  const shipped=d.shipments.filter(s=>new Date(s.dispatched_at)>=start).reduce((a,s)=>a+d.shipment_items.filter(i=>i.shipment_id===s.id).reduce((b,i)=>b+i.quantity,0),0);
  const q=S.dashSearch.trim().toLowerCase();
  const latest=sortedOrders().filter(o=>(S.dashFilter==='all'||o.status===S.dashFilter)&&orderMatches(o,q)).slice(0,8);
  const n=new Date();
  const third=canManage()&&P
    ?statCard('green','Shitjet këtë muaj',eur(shippedValueBetween(new Date(n.getFullYear(),n.getMonth(),1),new Date(n.getFullYear(),n.getMonth()+1,1))),e(MONTHS[n.getMonth()])+' · të dërguara','euro','stat-money')
    :statCard('green','Të përfunduara',num(d.orders.filter(o=>o.status==='completed').length),'në total','checkCircle');
  return `<div class="page-head"><h1>Përmbledhja e porosive</h1><button class="btn gold lg" data-action="nav" data-id="new">${icon('plus',20)}Porosi e re</button></div>
  <div class="stats">${statCard('','Porosi aktive',num(active.length),'në proces','box')}${statCard('blue','Porosi të reja',num(d.orders.filter(o=>o.status==='new').length),'në pritje','doc')}${third}${statCard('purple','Njësi të dërguara',num(shipped),'30 ditët e fundit','truck')}</div>
  <section class="panel pad dash-orders"><div class="section-title"><h2>Porositë e fundit</h2><div class="toolbar" style="margin:0;flex:1;justify-content:flex-end">
    <label class="search" style="max-width:440px">${icon('search',20)}<input class="input" id="dash-search" value="${e(S.dashSearch)}" placeholder="Kërko porosi, klient ose produkt…" aria-label="Kërko"/></label>
    <label class="filter-select">${icon('filter',18)}<select class="select" id="dash-filter" aria-label="Filtro sipas statusit"><option value="all">Filtro</option>${Object.entries(statusNames).map(([k,v])=>`<option value="${k}" ${S.dashFilter===k?'selected':''}>${v}</option>`).join('')}</select></label>
  </div></div>
  ${latest.length?`<div class="table-wrap"><table class="table cards"><thead><tr><th>Porosia</th><th>Klienti</th><th>Produkti</th><th>Data</th><th>Statusi</th></tr></thead><tbody>${latest.map(o=>{const its=orderItems(o.id);const p=productOfItem(its[0]);return `<tr class="clickable" data-action="open-order" data-id="${e(o.id)}"><td class="order-no card-title">${fmtId(o)}</td><td data-label="Klienti">${e(clientOf(o)?.name||'—')}</td><td data-label="Produkti"><div class="prod-cell">${p?swatch(p):''}<span>${e(p?.name||'—')}${its.length>1?` <span class="muted">+${its.length-1}</span>`:''}</span></div></td><td data-label="Data" class="mono">${e(date(o.created_at))}</td><td data-label="Statusi">${badge(o)}</td></tr>`;}).join('')}</tbody></table></div>`
    :`<div class="empty">${icon('clipboard',40)}<strong>${q||S.dashFilter!=='all'?'Asnjë porosi nuk përputhet':'Nuk ka ende porosi'}</strong>${q||S.dashFilter!=='all'?'Ndryshoni kërkimin ose filtrin.':'Krijo porosinë e parë me butonin “Porosi e re”.'}</div>`}
  </section>
  <section class="catalog-banner"><div class="banner-copy"><h2>Katalogu i produkteve</h2><button class="btn gold lg" data-action="nav" data-id="catalog">Hap katalogun ${icon('arrowRight',20)}</button></div>${fan()}</section>`;
}

// ====================================================================
// Krijo porosi
// ====================================================================
function rowSel(p){
  const sizes=sizesOf(p.id),shades=shadesOf(p.id);
  const s=S.rowSel[p.id]||{};
  return {size:sizes.includes(s.size)?s.size:sizes[0],shade:shades.includes(s.shade)?s.shade:(shades[0]||''),qty:s.qty>0?s.qty:1,sizes,shades};
}
// Klienti: shkruhet lirshëm ose zgjidhet nga lista; nëse kombinimi klient + lokacion nuk ekziston, krijohet kur dërgohet porosia.
const activeClients=()=>getData().clients.filter(c=>c.active);
const norm=s=>String(s||'').trim().toLowerCase();
function resolveClient(){
  const n=norm(S.clientName),l=norm(S.clientLocation);
  if(!n)return null;
  const same=activeClients().filter(c=>norm(c.name)===n);
  if(l)return same.find(c=>norm(c.location)===l)||null;
  return same.length===1?same[0]:null;
}
const clientReady=()=>Boolean(resolveClient())||(S.clientName.trim().length>=2&&S.clientLocation.trim().length>=2);
function clientHint(){
  const c=resolveClient();
  if(c)return `${icon('checkCircle',16)} Klient ekzistues: ${e(c.name)} — ${e(c.location)}`;
  if(!S.clientName.trim())return 'Shkruaj emrin ose zgjedh nga lista.';
  if(S.clientLocation.trim().length<2)return 'Shkruaj ose zgjedh lokacionin.';
  return `${icon('plusCircle',16)} Klient i ri – ruhet kur dërgohet porosia.`;
}
function syncClientUi(){
  const h=document.getElementById('client-hint');if(h)h.innerHTML=clientHint();
  const btn=document.querySelector('[data-action="submit-order"]');if(btn)btn.disabled=!(cartEntries().length&&clientReady());
}
function clientPicker(){
  const clients=activeClients();
  const names=[...new Set(clients.map(c=>c.name))].sort((a,b)=>a.localeCompare(b));
  const same=clients.filter(c=>norm(c.name)===norm(S.clientName));
  const locs=[...new Set((same.length?same:clients).map(c=>c.location))].sort((a,b)=>a.localeCompare(b));
  return `<div class="grid2">
    <div class="field"><label for="client-name">Klienti *</label><input class="input combo" id="client-name" list="client-names" autocomplete="off" maxlength="150" placeholder="Shkruaj ose zgjedh klientin…" value="${e(S.clientName)}"/><datalist id="client-names">${names.map(n=>`<option value="${e(n)}"></option>`).join('')}</datalist></div>
    <div class="field"><label for="client-location">Lokacioni *</label><input class="input combo" id="client-location" list="client-locations" autocomplete="off" maxlength="150" placeholder="${same.length>1?'Zgjedh lokacionin…':'P.sh. Istog'}" value="${e(S.clientLocation)}"/><datalist id="client-locations">${locs.map(n=>`<option value="${e(n)}"></option>`).join('')}</datalist></div>
  </div><p class="hint" id="client-hint" style="display:flex;gap:6px;align-items:center">${clientHint()}</p>`;
}
function productRow(p){
  const s=rowSel(p);const shaded=s.shades.length>0;
  const pr=priceOf(p.id,s.size);
  const choice=shaded
    ?`<label><span class="mini-label">Nuanca</span><select class="select" data-row-shade="${e(p.id)}">${s.shades.map(x=>`<option ${x===s.shade?'selected':''}>${e(x)}</option>`).join('')}</select></label>`
    :`<label><span class="mini-label">Paketimi</span><select class="select" data-row-size="${e(p.id)}" ${s.sizes.length<2?'disabled':''}>${s.sizes.map(x=>`<option ${x===s.size?'selected':''}>${e(x)}</option>`).join('')}</select></label>`;
  return `<div class="prod-row">
    <div class="thumb">${productArt(p)}</div>
    <div class="name">${e(p.name)}<small>${shaded?e(s.size)+' · ':''}${e(unitName(p))}${pr!=null?' · '+eur(pr):''}</small></div>
    <div class="ctl">
      ${choice}
      <div><span class="mini-label">Sasia</span><div class="stepper"><button type="button" data-action="row-minus" data-id="${e(p.id)}" aria-label="Më pak">${icon('minus',16)}</button><input type="number" min="1" max="1000000" data-row-qty="${e(p.id)}" value="${s.qty}" aria-label="Sasia për ${e(p.name)}"/><button type="button" data-action="row-plus" data-id="${e(p.id)}" aria-label="Më shumë">${icon('plus',16)}</button></div></div>
      <div class="add-cell"><span class="mini-label">&nbsp;</span><button class="btn gold-outline" data-action="row-add" data-id="${e(p.id)}">${icon('plus',16)}Shto</button></div>
    </div>
  </div>`;
}
function cartEntries(){return Object.entries(S.cart).map(([id,qty])=>({id,qty,v:byId('product_variants',id)})).filter(x=>x.qty>0&&x.v);}
function newOrderView(){
  const q=S.searchProducts.toLowerCase().trim();
  const list=products().filter(p=>!q||p.name.toLowerCase().includes(q));
  const entries=cartEntries();
  const count=entries.reduce((a,x)=>a+x.qty,0);
  const value=entries.reduce((a,x)=>{const pr=priceOf(x.v.product_id,x.v.size_label);return a+(pr!=null?pr*x.qty:0);},0);
  const ready=entries.length&&clientReady();
  return `<div class="page-head"><h1>Krijo një porosi</h1></div>
  <div class="order-layout">
    <div>
      <section class="panel pad" style="margin-bottom:20px"><div class="section-title"><h2>${icon('user',24)}Klienti dhe lokacioni</h2><button class="btn gold-outline sm" data-action="modal-client">${icon('plus',15)}Shto klient</button></div>${clientPicker()}</section>
      <section class="panel pad"><div class="section-title" style="margin-bottom:12px"><h2>${icon('layers',24)}Produktet</h2><span class="muted">${num(getData().products.filter(p=>p.active).length)} produkte</span></div>
        <label class="search">${icon('search',20)}<input class="input" id="product-search" placeholder="Kërko produkt…" value="${e(S.searchProducts)}" aria-label="Kërko produkt"/></label>
        <div class="prod-rows">${list.map(productRow).join('')||`<div class="empty">${icon('search',36)}<strong>Nuk u gjet produkt</strong>Provoni p.sh. “BP 950”, “Fasadex” ose “Recasa”.</div>`}</div>
      </section>
    </div>
    <aside class="sticky-summary" id="summary"><section class="panel pad">
      <div class="section-title"><h2>${icon('cart',26)}Përmbledhja e porosisë</h2></div>
      ${entries.length?entries.map(x=>{const p=byId('products',x.v.product_id);const pr=priceOf(x.v.product_id,x.v.size_label);return `<div class="cart-line"><div class="thumb">${productArt(p)}</div><div style="min-width:0"><b>${e(p?.name)}</b><div class="cart-meta">${x.v.shade_code?`<span>${e(x.v.shade_code)}</span><span class="sep"></span>`:''}<span>${e(x.v.size_label)}</span><span class="sep"></span><span>${num(x.qty)} ${e(unitName(p))}</span>${pr!=null?`<span class="sep"></span><span>${eur(pr*x.qty)}</span>`:''}</div><div class="stepper sm" style="margin-top:8px"><button type="button" data-action="cart-minus" data-id="${e(x.id)}" aria-label="Më pak">${icon('minus',14)}</button><input type="number" min="0" max="1000000" data-quantity-id="${e(x.id)}" value="${x.qty}" aria-label="Sasia"/><button type="button" data-action="cart-plus" data-id="${e(x.id)}" aria-label="Më shumë">${icon('plus',14)}</button></div></div><button class="icon-btn" data-action="cart-remove" data-id="${e(x.id)}" aria-label="Hiq ${e(p?.name)}">${icon('x',16)}</button></div>`;}).join('')
        :`<div class="empty" style="padding:30px 10px">${icon('cart',38)}<strong>Porosia është bosh</strong>Zgjedh paketimin dhe sasinë, pastaj shtyp “Shto”.</div>`}
      <div class="field" style="margin-top:20px"><label for="order-note" class="card-h" style="font-size:17px;color:var(--ink)">${icon('note',22)}Shënime për fabrikën</label><textarea class="textarea" id="order-note" placeholder="P.sh. Klienti i kërkon për nesër…">${e(S.note)}</textarea></div>
      <div class="summary-box"><div class="row between"><span class="row">${icon('box',22)}Artikuj të ndryshëm</span><b>${num(entries.length)}</b></div><div class="row between"><span class="row">${icon('boxes',22)}Njësi ambalazhi gjithsej</span><b>${num(count)}</b></div>${value?`<div class="row between"><span class="row">${icon('euro',22)}Vlera sipas listës</span><b>${eur(value)}</b></div>`:''}</div>
      <button class="btn gold xl full" data-action="submit-order" ${ready?'':'disabled'}>Dërgo porosinë ${icon('arrowRight',22)}</button>
      <p class="hint" style="text-align:center">${!clientReady()?'Shkruaj klientin dhe lokacionin.':!entries.length?'Shto të paktën një produkt.':'Data dhe ora regjistrohen automatikisht.'}</p>
    </section></aside>
  </div>
  ${entries.length?`<div class="mobile-cartbar"><span><b>${num(entries.length)}</b> artikuj · ${num(count)} njësi</span><button class="btn gold sm" data-action="scroll-summary">Porosia ${icon('arrowRight',16)}</button></div>`:''}`;
}

// ====================================================================
// Porositë
// ====================================================================
function progressCard(o){
  const t=total(o),s=sent(o),left=t-s,p=pct(o);
  const agent=byId('profiles',o.agent_id);
  return `<div class="progress-card">
    <div><b>Realizimi i porosisë</b><div class="muted">${num(s)} nga ${num(t)} njësi të dërguara</div></div>
    <div class="progress-wrap row" style="gap:14px"><div class="progress" style="flex:1"><i style="width:${p}%"></i></div><span class="mono">${p}%</span></div>
    <span class="vsep"></span>
    <div class="muted">${o.status==='cancelled'?'Porosia u anulua':left?`${num(left)} njësi në pritje`:'Asgjë në pritje'}${hasPrice(o)?`<br/><b style="color:var(--ink);font-size:14px">${eur(orderValue(o))}</b>`:''}${canManage()&&agent?`<br/><span class="small">${e(agent.full_name)}</span>`:''}</div>
    <button class="link" data-action="open-order" data-id="${e(o.id)}">Shiko historikun ${icon('arrowRight',18)}</button>
  </div>`;
}
function ordersView(){
  if(S.selectedOrder){const o=byId('orders',S.selectedOrder);if(o)return orderDetail(o);S.selectedOrder=null;}
  const all=sortedOrders();const q=S.searchOrders.trim().toLowerCase();
  const tabs=[['all','Të gjitha'],['new','Të reja'],['preparing','Në përgatitje'],['partial','Pjesërisht'],['completed','Të përfunduara'],['cancelled','Të anuluara']];
  const rows=all.filter(o=>(S.ordersFilter==='all'||o.status===S.ordersFilter)&&orderMatches(o,q));
  return `<div class="page-head"><div><h1>${canManage()?'Porositë':'Porositë e mia'}</h1><p>Gjej porosi, kontrollo realizimin dhe historikun e tyre.</p></div><button class="btn gold lg" data-action="nav" data-id="new">${icon('plus',20)}Porosi e re</button></div>
  <section class="panel pad">
    <div class="toolbar"><label class="search" style="max-width:560px">${icon('search',20)}<input id="orders-search" class="input" placeholder="Kërko sipas klientit, lokacionit ose numrit" value="${e(S.searchOrders)}" aria-label="Kërko porosi"/></label><button class="btn outline" data-action="refresh">${icon('refresh',18)}Rifresko</button></div>
    <div class="tabs" role="tablist">${tabs.map(([v,t])=>{const c=v==='all'?all.length:all.filter(o=>o.status===v).length;return `<button class="tab ${S.ordersFilter===v?'on':''}" role="tab" aria-selected="${S.ordersFilter===v}" data-action="order-filter" data-id="${v}">${t}${c?`<span class="n">${c}</span>`:''}</button>`;}).join('')}</div>
    ${rows.length?`<div class="table-wrap"><table class="table cards"><thead><tr><th>Porosia</th><th>Klienti</th><th>Lokacioni</th><th>Data</th><th>Statusi</th><th>Njësi të dërguara</th><th><span class="sr-only">Hap</span></th></tr></thead><tbody>${rows.map(o=>{const open=Boolean(S.expanded[o.id]);const c=clientOf(o);return `<tr class="clickable" data-action="toggle-row" data-id="${e(o.id)}"><td class="order-no card-title">${fmtId(o)}</td><td data-label="Klienti">${e(c?.name||'—')}</td><td data-label="Lokacioni">${e(c?.location||'—')}</td><td data-label="Data" class="mono">${e(date(o.created_at))}</td><td data-label="Statusi">${badge(o)}</td><td data-label="Njësi të dërguara" class="mono">${num(sent(o))} / ${num(total(o))}</td><td class="card-chev" style="text-align:right"><span class="expand-btn" aria-label="${open?'Mbyll':'Hap'}">${icon(open?'chevronUp':'chevronDown',22)}</span></td></tr>${open?`<tr class="expand-row"><td colspan="7">${progressCard(o)}</td></tr>`:''}`;}).join('')}</tbody></table></div>`
    :`<div class="empty">${icon('clipboard',40)}<strong>${all.length?'Asnjë porosi nuk përputhet':'Nuk ka ende porosi'}</strong>${all.length?'Ndryshoni kërkimin ose skedën.':'Krijo porosinë e parë me butonin “Porosi e re”.'}</div>`}
  </section>`;
}
function orderDetail(o){
  const c=clientOf(o),agent=byId('profiles',o.agent_id);const its=orderItems(o.id);
  const shipments=getData().shipments.filter(s=>s.order_id===o.id).sort((a,b)=>new Date(b.dispatched_at)-new Date(a.dispatched_at));
  const events=getData().order_events.filter(x=>x.order_id===o.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  const closed=['completed','cancelled'].includes(o.status);const ship=canManage()&&!closed;
  const eventNames={created:'Porosia u krijua',shipment:'Dërgesë e regjistruar',closed:'Porosia u mbyll',status_changed:'Statusi u ndryshua',quantity_adjusted:'Sasia e porositur u korrigjua',reopened:'Porosia u rihap',price_adjusted:'Çmimi u ndryshua',prices_filled:'Çmimet u plotësuan nga lista'};
  return `<button class="back" data-action="back-orders">${icon('arrowLeft',18)}Kthehu te porositë</button>
  <div class="page-head"><div><h1>Porosia ${fmtId(o)}</h1><p>${e(c?.name||'—')} · ${e(c?.location||'—')}</p></div><div class="row wrap">${badge(o)}<button class="btn outline sm" data-action="print">${icon('printer',16)}Shtyp</button></div></div>
  <section class="panel pad" style="margin-bottom:20px"><div class="detail-info">
    <div><span>Klienti</span><strong>${e(c?.name||'')}</strong></div><div><span>Lokacioni</span><strong>${e(c?.location||'')}</strong></div><div><span>Agjenti</span><strong>${e(agent?.full_name||'—')}</strong></div><div><span>Porositur më</span><strong>${e(time(o.created_at))}</strong></div><div><span>Përfunduar më</span><strong>${e(time(o.completed_at))}</strong></div>
    <div><span>Totali i njësive</span><strong>${num(total(o))}</strong></div><div><span>Njësi të dërguara</span><strong>${num(sent(o))}</strong></div><div><span>Mbetur</span><strong>${num(remainder(o))}</strong></div>${P?`<div><span>Vlera e porosisë</span><strong>${hasPrice(o)?eur(orderValue(o)):'—'}</strong></div><div><span>Vlera e dërguar</span><strong>${hasPrice(o)?eur(sentValue(o)):'—'}</strong></div>`:''}
  </div>
  <div class="row" style="margin-top:18px;gap:14px"><div class="progress" style="flex:1"><i style="width:${pct(o)}%"></i></div><b class="mono">${pct(o)}%</b></div>
  ${o.notes?`<div class="notice" style="margin:16px 0 0"><b>Shënim nga agjenti:</b> ${e(o.notes)}</div>`:''}</section>
  <div class="two-col"><div><section class="panel">
    <div class="pad section-title" style="margin:0;padding-bottom:12px"><h2>${icon('layers',22)}Produktet dhe sasitë</h2><span class="row small muted">${its.length} rreshta${isAdmin()&&missingPrice(o)?`<button class="btn gold-outline sm" data-action="fill-prices" data-id="${e(o.id)}">Plotëso çmimet nga lista</button>`:''}</span></div>
    <div class="table-wrap" style="padding:0 12px 8px"><table class="table" style="min-width:${ship?680:560}px"><thead><tr><th>Produkti</th><th>Porositur</th><th>Dërguar</th><th>Mbetur</th>${P?'<th>Çmimi / njësi</th><th>Vlera</th>':''}${ship?'<th>Dërgo tani</th>':''}</tr></thead><tbody>${its.map(it=>{const left=it.ordered_qty-it.fulfilled_qty;const p=productOfItem(it);return `<tr><td><div class="prod-cell">${p?swatch(p):''}<div><b>${e(itemFullName(it))}</b><div class="small muted">${e(unitName(p))}</div>${isAdmin()&&!closed?`<div class="row" style="margin-top:8px;gap:6px"><input class="input qty-input" type="number" min="${it.fulfilled_qty||1}" max="1000000" value="${it.ordered_qty}" id="edit-${e(it.id)}" aria-label="Sasia e porositur"/><button class="btn outline sm" data-action="adjust-item" data-id="${e(it.id)}">Korrigjo</button></div>`:''}</div></div></td><td class="mono"><b>${num(it.ordered_qty)}</b></td><td class="mono" style="color:var(--green);font-weight:700">${num(it.fulfilled_qty)}</td><td class="mono">${num(left)}</td>${P?priceCells(it):''}${ship?`<td><input id="ship-${e(it.id)}" type="number" class="input qty-input shipinput" min="0" max="${left}" value="0" ${left===0?'disabled':''} aria-label="Sasia për dërgesë"/></td>`:''}</tr>`;}).join('')}</tbody></table></div>
    ${ship?`<div class="ship-box"><div class="row between wrap"><h3>${icon('truck',20)}Dërgesa e radhës</h3><button class="btn outline sm" data-action="fill-remaining">Mbush me sasitë e mbetura</button></div><div class="field"><label for="shipment-note">Shënim për dërgesën (opsional)</label><input class="input" id="shipment-note" placeholder="P.sh. Dërgesa me automjetin…"/></div><label class="check"><input type="checkbox" id="close-order"/>Mbylle porosinë pas kësaj dërgese, edhe nëse mbesin produkte pa u dërguar</label><button class="btn gold lg full" data-action="ship" data-id="${e(o.id)}">Regjistro dërgesën</button><p class="hint" style="margin:0">Dërgesa merr automatikisht datën dhe orën. Agjenti njoftohet në telefon.</p>
      <div class="row wrap">${o.status==='new'?`<button class="btn outline sm" data-action="status" data-id="preparing">Kalo në përgatitje</button>`:''}${o.status==='new'||o.status==='preparing'?`<button class="btn danger sm" data-action="status" data-id="cancelled">Anulo porosinë</button>`:''}</div></div>`:''}
    ${isAdmin()&&o.status==='completed'&&remainder(o)>0?`<div class="ship-box"><button class="btn outline sm" data-action="reopen" data-id="${e(o.id)}">Rihap për dërgesë tjetër</button></div>`:''}
  </section></div>
  <div><section class="panel pad"><div class="section-title"><h2>${icon('truck',22)}Historiku i dërgesave</h2><span class="tag">${shipments.length} dërgesa</span></div>${shipments.length?shipments.map(sh=>{const lines=getData().shipment_items.filter(x=>x.shipment_id===sh.id);return `<div class="ship-entry"><div class="row between"><b>${e(time(sh.dispatched_at))}</b><span class="badge completed">${num(lines.reduce((a,x)=>a+x.quantity,0))} njësi</span></div><p class="small muted" style="margin:6px 0">Nga: ${e(byId('profiles',sh.created_by)?.full_name||'—')}</p>${lines.map(x=>{const it=byId('order_items',x.order_item_id);return `<div class="row between small" style="padding:2px 0"><span>${e(itemFullName(it||{}))}</span><b>×${num(x.quantity)}</b></div>`;}).join('')}${sh.note?`<p class="small muted" style="margin-top:6px">${e(sh.note)}</p>`:''}</div>`;}).join(''):'<p class="muted small">Nuk ka ende dërgesa.</p>'}</section>
  <section class="panel pad" style="margin-top:18px"><h2 style="margin-bottom:16px">Regjistri i veprimeve</h2>${events.length?events.map(ev=>`<div class="log-entry"><b>${eventNames[ev.event_type]||e(ev.event_type)}</b><span class="muted">${e(time(ev.created_at))} · ${e(byId('profiles',ev.user_id)?.full_name||'—')}</span>${ev.event_type==='quantity_adjusted'?`<div class="hint" style="margin:2px 0 0">${num(ev.payload?.old)} → ${num(ev.payload?.new)}</div>`:''}${ev.event_type==='price_adjusted'?`<div class="hint" style="margin:2px 0 0">${ev.payload?.old!=null?eur(ev.payload.old):'pa çmim'} → ${ev.payload?.new!=null?eur(ev.payload.new):'pa çmim'}</div>`:''}</div>`).join(''):'<p class="small muted">Nuk ka regjistra.</p>'}</section></div></div>`;
}
function priceCells(it){
  const value=it.unit_price!=null?eur(Number(it.unit_price)*it.ordered_qty):'<span class="muted">—</span>';
  const price=isAdmin()
    ?`<div class="row price-edit"><input class="input price-input" inputmode="decimal" id="price-${e(it.id)}" value="${e(moneyInput(it.unit_price))}" placeholder="pa çmim" aria-label="Çmimi për njësi"/><button class="btn outline sm" data-action="set-item-price" data-id="${e(it.id)}" aria-label="Ruaj çmimin">✓</button></div>`
    :(it.unit_price!=null?eur(it.unit_price):'<span class="muted">—</span>');
  return `<td>${price}</td><td class="mono nowrap">${value}</td>`;
}

// ====================================================================
// Katalogu
// ====================================================================
function catalogView(){
  const q=S.catalogSearch.trim().toLowerCase();
  const group=CATALOG_GROUPS.find(g=>g[0]===S.catalogGroup)||CATALOG_GROUPS[0];
  const list=products().filter(p=>group[2](p)&&(!q||p.name.toLowerCase().includes(q)));
  const d=getData();
  return `<div class="page-head"><div><h1>Katalogu i produkteve</h1><p>${num(d.products.filter(p=>p.active).length)} grupe produktesh · ${num(d.product_variants.filter(v=>v.active).length)} variante/nuanca</p></div>${isAdmin()?`<button class="btn gold" data-action="modal-product">${icon('plus',18)}Shto produkt</button>`:''}</div>
  <div class="toolbar"><label class="search" style="max-width:540px">${icon('search',20)}<input class="input" id="catalog-search" value="${e(S.catalogSearch)}" placeholder="Kërko produktin…" aria-label="Kërko produktin"/></label>
    <div class="segmented" role="tablist">${CATALOG_GROUPS.map(([k,l])=>`<button class="seg ${S.catalogGroup===k?'on':''}" data-action="catalog-group" data-id="${k}" role="tab" aria-selected="${S.catalogGroup===k}">${l}</button>`).join('')}</div></div>
  ${list.length?`<div class="catalog-grid">${list.map(p=>{const n=variants(p.id).length;return `<button class="cat-card" data-action="choose-product" data-id="${e(p.id)}"><div class="thumb">${productArt(p)}</div><div class="cat-body"><div><b>${e(p.name)}</b><span>${n} ${n===1?'variant':'variante'}</span></div>${icon('arrowRight',22)}</div></button>`;}).join('')}</div>`
    :`<div class="panel empty">${icon('search',36)}<strong>Nuk u gjet produkt</strong>Provoni një emër tjetër ose zgjidhni “Të gjitha”.</div>`}
  ${isAdmin()?`<p class="hint" style="margin-top:20px">Administratori mund të vendosë fotografinë reale të produktit te detajet e produktit (butoni “Cakto fotografinë”).</p>`:''}`;
}

// ====================================================================
// Çmimet (admin)
// ====================================================================
function pricesView(){
  if(!isAdmin())return dashboardView();
  const q=S.pricesSearch.trim().toLowerCase();
  const list=products().filter(p=>!q||p.name.toLowerCase().includes(q));
  const groups=Object.keys(DEPARTMENTS).map(dep=>[dep,list.filter(p=>p.department===dep)]).filter(([,ps])=>ps.length);
  const keys=[...new Set(getData().product_variants.filter(v=>v.active).map(v=>v.product_id+'|'+v.size_label))];
  const priced=keys.filter(k=>{const i=k.indexOf('|');return priceOf(k.slice(0,i),k.slice(i+1))!=null;}).length;
  return `<div class="page-head"><div><h1>Çmimet e produkteve</h1><p>Çmimi në € për një njësi (kovë / thes / komplet). ${num(priced)} nga ${num(keys.length)} paketime kanë çmim.</p></div><button class="btn gold" data-action="save-prices">Ruaj ndryshimet</button></div>
  <div class="notice">Porosia e re e merr çmimin automatikisht nga kjo listë. Ndryshimet këtu <b>nuk</b> i ndryshojnë porositë e vjetra; për to ndryshoni çmimin te detajet e porosisë. Nuancat RG/MX kanë të njëjtin çmim për paketim.</div>
  <div class="toolbar"><label class="search" style="max-width:420px">${icon('search',20)}<input class="input" id="prices-search" value="${e(S.pricesSearch)}" placeholder="Kërko produktin…" aria-label="Kërko produktin"/></label></div>
  ${groups.map(([dep,ps])=>`<section class="panel" style="margin-bottom:18px"><div class="pad section-title" style="margin:0;padding-bottom:10px"><h2>${e(DEPARTMENTS[dep])}</h2><span class="muted">${ps.length} produkte</span></div><div class="table-wrap" style="padding:0 12px 10px"><table class="table price-table"><thead><tr><th>Produkti</th><th>Paketimet dhe çmimet (€ për njësi)</th></tr></thead><tbody>${ps.map(p=>`<tr><td><div class="prod-cell">${swatch(p)}<div><b>${e(p.name)}</b><div class="small muted">${e(unitName(p))}</div></div></div></td><td><div class="price-cells">${sizesOf(p.id).map(sz=>{const cur=priceOf(p.id,sz);return `<label class="price-cell"><span>${e(sz)}</span><input class="input price-input" inputmode="decimal" data-price-product="${e(p.id)}" data-price-size="${e(sz)}" data-orig="${e(moneyInput(cur))}" value="${e(moneyInput(cur))}" placeholder="—"/></label>`;}).join('')}</div></td></tr>`).join('')}</tbody></table></div></section>`).join('')||`<div class="panel empty">Nuk u gjet produkt.</div>`}
  <div class="save-bar"><button class="btn gold lg" data-action="save-prices">Ruaj ndryshimet</button></div>`;
}

// ====================================================================
// Shitjet dhe raportet (sipas dërgesave reale)
// ====================================================================
function reportRows(){
  const d=getData();const list=[];
  for(const sh of d.shipments){
    const dd=new Date(sh.dispatched_at);
    if(S.reportPeriod==='month'&&(dd.getFullYear()!==Number(S.reportYear)||dd.getMonth()+1!==Number(S.reportMonth)))continue;
    if(S.reportPeriod==='year'&&dd.getFullYear()!==Number(S.reportYear))continue;
    const order=byId('orders',sh.order_id);const client=byId('clients',order?.client_id);
    for(const si of d.shipment_items.filter(x=>x.shipment_id===sh.id)){
      const it=byId('order_items',si.order_item_id);const variant=byId('product_variants',it?.variant_id);const product=byId('products',variant?.product_id);
      const price=it?.unit_price!=null?Number(it.unit_price):null;
      list.push({shipment_id:sh.id,order_no:order?fmtId(order):'',time:sh.dispatched_at,client:client?.name||'',location:client?.location||'',product:product?.name||'',size:variant?.size_label||'',shade:variant?.shade_code||'',agent:byId('profiles',order?.agent_id)?.full_name||'',quantity:si.quantity,price,value:price!=null?price*si.quantity:0});
    }
  }
  return list;
}
function reportsView(){
  const rows=reportRows();
  const totalUnits=rows.reduce((a,x)=>a+x.quantity,0),totalValue=rows.reduce((a,x)=>a+x.value,0),unpriced=rows.filter(x=>x.price==null).length;
  const add=(map,key,x)=>{const c=map.get(key)||{q:0,v:0};c.q+=x.quantity;c.v+=x.value;map.set(key,c);};
  const byProduct=new Map(),byClient=new Map(),byAgent=new Map();
  for(const x of rows){add(byProduct,[x.product,x.shade,x.size].filter(Boolean).join(' · '),x);add(byClient,[x.client,x.location].filter(Boolean).join(' — '),x);add(byAgent,x.agent||'—',x);}
  const k=P&&S.reportSort==='value'?'v':'q';
  const ranked=[...byProduct].sort((a,b)=>b[1][k]-a[1][k]);
  const byValue=(a,b)=>(P?b[1].v-a[1].v:0)||b[1].q-a[1].q;
  const clients=[...byClient].sort(byValue),agents=[...byAgent].sort(byValue);
  const max=ranked[0]?.[1][k]||1;const prev=previousPeriodValue();
  const rankRow=([name,c])=>`<div class="row between rank-row"><span>${e(name)}</span><span class="mono nowrap">${P?`<b>${eur(c.v)}</b> <span class="muted">· ${num(c.q)}</span>`:`<b>${num(c.q)}</b> <span class="muted">njësi</span>`}</span></div>`;
  return `<div class="page-head"><div><h1>${P?'Shitjet dhe dërgesat':'Dërgesat'}</h1><p>Sipas sasive realisht të dërguara dhe datës së dërgesës${P?', me çmimin e secilës porosi':''}.</p></div><button class="btn outline" data-action="export-csv">${icon('download',18)}Eksporto CSV</button></div>
  <div class="toolbar"><select id="report-period" class="select" style="width:auto" aria-label="Periudha"><option value="month" ${S.reportPeriod==='month'?'selected':''}>Muaji</option><option value="year" ${S.reportPeriod==='year'?'selected':''}>Viti</option><option value="all" ${S.reportPeriod==='all'?'selected':''}>Gjithë periudha</option></select>${S.reportPeriod!=='all'?`<select id="report-year" class="select" style="width:auto" aria-label="Viti">${Array.from({length:8},(_,i)=>new Date().getFullYear()-i).map(y=>`<option value="${y}" ${Number(S.reportYear)===y?'selected':''}>${y}</option>`).join('')}</select>`:''}${S.reportPeriod==='month'?`<select id="report-month" class="select" style="width:auto" aria-label="Muaji">${MONTHS.map((m,i)=>`<option value="${i+1}" ${Number(S.reportMonth)===i+1?'selected':''}>${m}</option>`).join('')}</select>`:''}</div>
  <div class="stats">${P?statCard('green','Shitjet (të dërguara)',eur(totalValue),prev!=null?trendText(totalValue,prev):'për gjithë periudhën','euro','stat-money'):statCard('green','Produkte të ndryshme',num(byProduct.size),'produkt · nuancë · paketim','layers')}${statCard('purple','Njësi të dërguara',num(totalUnits),'kova, thasë, komplete','truck')}${statCard('blue','Dërgesa',num(new Set(rows.map(x=>x.shipment_id)).size),'për periudhën','doc')}${statCard('','Klientë aktivë',num(byClient.size),'me të paktën një dërgesë','users')}</div>
  ${P&&unpriced?`<div class="notice">${num(unpriced)} rreshta dërgese nuk kanë çmim dhe nuk llogariten në shitje. ${isAdmin()?'Vendosni çmimet te <b>Çmimet</b>, pastaj te porositë përkatëse shtypni “Plotëso çmimet nga lista”.':'Administratori duhet t’i vendosë çmimet.'}</div>`:''}
  <div class="two-col"><section class="panel pad"><div class="section-title"><h2>Produktet më të shitura</h2>${P?`<div class="chips"><button class="chip ${k==='q'?'on':''}" data-action="report-sort" data-id="qty">Sipas sasisë</button><button class="chip ${k==='v'?'on':''}" data-action="report-sort" data-id="value">Sipas vlerës</button></div>`:''}</div>${ranked.length?ranked.slice(0,25).map(([name,c])=>`<div class="chartline"><div class="captionrow"><span>${e(name)}</span><b class="mono nowrap">${num(c.q)}${P?' · '+eur(c.v):''}</b></div><div class="bar"><div style="width:${100*c[k]/max}%"></div></div></div>`).join(''):`<div class="empty">${icon('chart',36)}<strong>Nuk ka dërgesa</strong>për periudhën e zgjedhur.</div>`}</section>
  <div><section class="panel pad"><div class="section-title"><h2>Agjentët sipas ${P?'shitjeve':'dërgesave'}</h2></div>${agents.length?agents.map(rankRow).join(''):'<p class="muted small">Nuk ka të dhëna.</p>'}</section><section class="panel pad" style="margin-top:18px"><div class="section-title"><h2>Klientët kryesorë</h2></div>${clients.length?clients.slice(0,20).map(rankRow).join(''):'<p class="muted small">Nuk ka të dhëna.</p>'}</section></div></div>
  ${P?'<p class="hint" style="margin-top:18px">Vlera llogaritet me çmimin e ruajtur në secilën porosi; ndryshimi i listës së çmimeve nuk i ndryshon porositë e vjetra.</p>':''}`;
}
function csvExport(){
  const list=reportRows();
  const n2=x=>x==null?'':Number(x).toFixed(2).replace('.',',');
  const cell=val=>{let v=String(val??'');if(/^[=+\-@]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';};
  const rows=[['Data e dërgesës','Porosia','Klienti','Lokacioni','Produkti','Nuanca','Paketimi','Sasia e dërguar',...(P?['Çmimi për njësi (EUR)','Vlera (EUR)']:[]),'Agjenti'],
    ...list.map(x=>[time(x.time),x.order_no,x.client,x.location,x.product,x.shade,x.size,x.quantity,...(P?[n2(x.price),x.price!=null?n2(x.value):'']:[]),x.agent])];
  const csv='﻿'+rows.map(r=>r.map(cell).join(';')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`Regina_Color_${P?'Shitjet':'Dergesat'}_${S.reportPeriod}_${today()}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);toast('Raporti CSV u përgatit.');
}

// ====================================================================
// Njoftimet
// ====================================================================
function notificationsView(){
  const st=S.pushState||{};const supported='Notification' in window&&'serviceWorker' in navigator;
  const perm=supported?Notification.permission:'unsupported';
  const pushReady=!backend.isDemo&&Boolean(CLOUD_CONFIG.vapidPublicKey);
  const [pillCls,pillText]=st.subscribed?['on','Aktive']:perm==='denied'?['off','E bllokuar']:!supported?['off','Nuk mbështetet']:['','Joaktive'];
  const lead=canManage()?'Merr njoftim sa herë që një agjent dërgon porosi të re.':'Merr njoftim kur fabrika regjistron një dërgesë për porosinë tënde.';
  const help=st.subscribed?'Ky telefon do të marrë njoftime edhe kur aplikacioni është i mbyllur.'
    :perm==='denied'?'Njoftimet janë bllokuar. Lejojini te cilësimet e faqes (🔒 pranë adresës), pastaj provoni përsëri.'
    :!supported?'Ky shfletues nuk i mbështet njoftimet. Në Android përdorni Chrome; në iPhone shtoni aplikacionin në ekranin kryesor.'
    :'Aktivizo njoftimet në këtë pajisje dhe lejoji kur të pyet shfletuesi.';
  const example=canManage()
    ?{t:'Porosi e re',b:`Termo Projekt — Istog · 3 artikuj (#RG-0012)`}
    :{t:'Dërgesë e re',b:'Fabrika ka regjistruar një dërgesë për porosinë #RG-1046.'};
  return `<div class="page-head"><div><h1>Njoftimet në telefon</h1><p>${lead}</p></div></div>
  <div class="notif-grid"><div>
    <section class="panel device-card"><div class="device-ico">${icon('phone',46)}</div><div>
      <h2>Kjo pajisje</h2><span class="state-pill ${pillCls}"><i></i>${pillText}</span>
      <p class="muted">${help}</p>
      <div class="row wrap" style="margin-top:18px;gap:12px">${st.subscribed?`<button class="btn outline lg" data-action="push-disable">Çaktivizo</button>`:`<button class="btn gold lg" data-action="push-enable" ${pushReady&&supported?'':'disabled'}>Aktivizo njoftimet</button>`}<button class="btn outline lg" data-action="notif-test">Provo njoftimin</button></div>
      ${pushReady?'':`<p class="hint">${backend.isDemo?'Në demo njoftimet push nuk dërgohen; “Provo njoftimin” tregon njoftimin lokal dhe zilen.':'Mungon <code>vapidPublicKey</code> në config.js – shihni README.'}</p>`}
    </div><div class="device-foot">${icon('info',22)}Aktivizoji veçmas në çdo telefon që përdor.</div></section>
    <button class="panel list-btn" data-action="modal-install">${icon('home',28)}Shto aplikacionin në ekranin kryesor${icon('chevronRight',22)}</button>
    ${canManage()?`<section class="panel pad" style="margin-top:18px"><h3>Kanalet e njoftimeve</h3><ul class="howto"><li><b>Push në telefon</b> – edhe kur aplikacioni është i mbyllur.</li><li><b>Në aplikacion</b> – kur është i hapur, kontrollon çdo 30 sekonda dhe bie zilja.</li><li><b>Telegram</b> – çdo porosi e re shkon edhe në grupin e fabrikës.</li></ul></section>`:''}
  </div>
  <section class="preview-card"><h2>Shembull njoftimi</h2>
    <div class="phone" aria-hidden="true"><div class="phone-top"><span>${clock(new Date())}</span><span class="island"></span><span>▂▄▆ ◔</span></div><div class="phone-time">${clock(new Date())}</div>
      <div class="phone-note"><span class="app-ico">${crown(28)}</span><div><b>Regina colori</b><div class="t">${example.t}</div><p>${example.b}</p></div><small>tani</small></div></div>
  </section></div>`;
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
      const c=byId('clients',o.client_id);const title='Porosi e re '+fmtId(o);const body=[c?.name,c?.location].filter(Boolean).join(' — ');
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

// ====================================================================
// Stafi (admin)
// ====================================================================
function teamView(){
  if(!isAdmin())return dashboardView();
  const list=getData().profiles;
  return `<div class="page-head"><div><h1>Stafi dhe lejet</h1><p>Vetëm administratori cakton kush mund të shohë, krijojë dhe realizojë porosi.</p></div></div>
  <div class="notice">Llogaritë e reja krijohen te <b>Supabase → Authentication → Users</b>, pastaj aktivizohen këtu. Mos shpërndani fjalëkalime mes punëtorëve.${backend.isDemo?' Në demo shfaqen vetëm rolet e testimit.':''}</div>
  <section class="panel pad"><div class="table-wrap"><table class="table cards"><thead><tr><th>Emri</th><th>Roli</th><th>Aktiv</th><th></th></tr></thead><tbody>${list.map(p=>`<tr><td class="card-title"><div class="person" style="gap:12px"><div class="avatar" style="width:38px;height:38px;font-size:14px">${e((p.full_name||'?')[0]).toUpperCase()}</div><div><b style="color:var(--ink)">${e(p.full_name)}</b><span class="small muted">${e(p.id.substring(0,12))}</span></div></div></td><td data-label="Roli"><select class="select" id="role-${e(p.id)}" style="width:200px" aria-label="Roli">${Object.entries(roleNames).map(([id,label])=>`<option value="${id}" ${id===p.role?'selected':''}>${e(label)}</option>`).join('')}</select></td><td data-label="Aktiv"><input type="checkbox" id="active-${e(p.id)}" ${p.active?'checked':''} aria-label="Aktiv"/></td><td style="text-align:right"><button class="btn outline sm" data-action="save-profile" data-id="${e(p.id)}">Ruaj</button></td></tr>`).join('')}</tbody></table></div></section>`;
}

// ====================================================================
// Dritaret (modal)
// ====================================================================
const modalShell=(title,body,foot,form='')=>`<div class="modal-wrap" data-action="overlay">${form?`<form class="modal" id="${form}">`:'<div class="modal" role="dialog" aria-modal="true">'}<div class="modalhead"><h2>${title}</h2><button type="button" class="icon-btn" data-action="modal-close" aria-label="Mbyll">${icon('x',18)}</button></div><div class="modalbody">${body}</div><div class="modalfoot">${foot}</div>${form?'</form>':'</div>'}</div>`;
function modalHtml(){
  if(!S.modal)return '';
  const cancel=`<button type="button" class="btn outline" data-action="modal-close">Anulo</button>`;
  if(S.modal==='client')return modalShell('Shto klient të ri',`<div class="field"><label for="c-name">Emri i klientit *</label><input id="c-name" class="input" name="name" required minlength="2" maxlength="150" placeholder="P.sh. Termo Projekt" value="${e(S.clientName)}"/></div><div class="field"><label for="c-loc">Lokacioni *</label><input id="c-loc" class="input" name="location" required minlength="2" maxlength="150" placeholder="P.sh. Istog"/></div><p class="hint" style="margin:0">I njëjti klient mund të ketë disa lokacione; shtoni secilin veç.</p>`,`${cancel}<button class="btn gold" type="submit">Ruaj klientin</button>`,'client-form');
  if(S.modal==='product')return modalShell('Shto produkt',`<div class="field"><label for="p-name">Emri i produktit</label><input id="p-name" class="input" name="name" required minlength="2"/></div><div class="field"><label for="p-dep">Reparti</label><select id="p-dep" class="select" name="department">${Object.entries(DEPARTMENTS).map(([v,l])=>`<option value="${v}">${e(l)}</option>`).join('')}</select></div><div class="field"><label for="p-size">Paketimi i parë</label><input id="p-size" class="input" name="size" placeholder="P.sh. 25 kg" required/></div><p class="hint" style="margin:0">Produkti i ri shtohet me një paketim. Paketimet e tjera shtohen në databazë (tabela product_variants).</p>`,`${cancel}<button class="btn gold" type="submit">Shto produktin</button>`,'product-form');
  if(S.modal==='image'&&S.product){const p=byId('products',S.product);return modalShell('Fotografia e produktit',`<p><b>${e(p?.name)}</b></p><div class="field"><label for="i-url">URL HTTPS e fotografisë</label><input id="i-url" class="input" name="url" type="url" placeholder="https://…/produkti.jpg" value="${e(p?.image_url||'')}"/></div><p class="hint" style="margin:0">Përdor lidhjen e drejtpërdrejtë te fotografia. Lëre bosh për ilustrimin e paracaktuar.</p>`,`${cancel}<button class="btn gold" type="submit">Ruaj fotografinë</button>`,'image-form');}
  if(S.modal==='install'){return modalShell('Shto në ekranin kryesor',`<div><h3 style="margin-bottom:10px">Android (Chrome)</h3><div class="steps"><div class="step"><i>1</i><span>Hapni faqen në <b>Chrome</b>.</span></div><div class="step"><i>2</i><span>Shtypni menynë <b>⋮</b> lart djathtas.</span></div><div class="step"><i>3</i><span>Zgjidhni <b>Add to Home screen</b> / <b>Install app</b>.</span></div></div></div><div><h3 style="margin:8px 0 10px">iPhone (Safari)</h3><div class="steps"><div class="step"><i>1</i><span>Hapni faqen në <b>Safari</b>.</span></div><div class="step"><i>2</i><span>Shtypni <b>Share</b> (katrori me shigjetë).</span></div><div class="step"><i>3</i><span>Zgjidhni <b>Add to Home Screen</b>, pastaj hapeni nga ikona dhe aktivizoni njoftimet (iOS 16.4+).</span></div></div></div>`,`<button type="button" class="btn gold" data-action="modal-close">E kuptova</button>`);}
  if(S.modal==='variants'&&S.product){
    const p=byId('products',S.product);const vars=variants(p.id);const shades=shadesOf(p.id);const chosen=S.selectedShade||shades[0];const current=shades.length?vars.filter(v=>v.shade_code===chosen):vars;
    const inCart=cartEntries().length;
    return modalShell(e(p.name),`<div class="modalproduct"><div class="thumb">${productArt(p)}</div><div><b style="font-size:18px">${e(p.name)}</b><div class="muted">${e(DEPARTMENTS[p.department]||'Produkt Regina Color')} · ${e(unitName(p))}</div></div></div>
      ${shades.length?`<div><span class="label">Zgjedh nuancën</span><div class="shade-grid" style="margin-top:8px">${shades.map(sh=>`<button class="shade-btn ${chosen===sh?'chosen':''}" data-action="select-shade" data-id="${e(sh)}">${e(sh)}</button>`).join('')}</div></div>`:''}
      <span class="label">Paketimi dhe sasia</span>${current.map(v=>{const pr=priceOf(p.id,v.size_label);return `<div class="variant-option"><div><b>${e(v.size_label)}</b>${v.shade_code?` <span class="muted">· ${e(v.shade_code)}</span>`:''}${pr!=null?`<div class="small muted">${eur(pr)} / ${e(unitName(p))}</div>`:''}</div><div class="stepper"><button type="button" data-action="cart-minus" data-id="${e(v.id)}" aria-label="Më pak">${icon('minus',16)}</button><input type="number" min="0" max="1000000" data-quantity-id="${e(v.id)}" value="${S.cart[v.id]||0}" aria-label="Sasia ${e(v.size_label)}"/><button type="button" data-action="cart-plus" data-id="${e(v.id)}" aria-label="Më shumë">${icon('plus',16)}</button></div></div>`;}).join('')}
      ${isAdmin()?`<button class="btn outline sm" style="justify-self:start" data-action="modal-image">Cakto fotografinë</button>`:''}`,
      `${S.view!=='new'&&inCart?`<button class="btn outline" data-action="nav" data-id="new">Shko te porosia (${inCart})</button>`:''}<button class="btn gold" data-action="modal-close">${S.view==='new'?'Vazhdo me porosinë':'Mbyll'}</button>`);
  }
  return '';
}

// ====================================================================
// Veprimet
// ====================================================================
function reloadAndRender(){return backend.load().then(d=>{S.data=d;render();});}
function mutateCart(id,delta){if(!byId('product_variants',id))return;S.cart[id]=Math.max(0,(S.cart[id]||0)+delta);if(!S.cart[id])delete S.cart[id];render();}
function setRow(pid,patch){S.rowSel[pid]={...(S.rowSel[pid]||{}),...patch};}
function focusAgain(id){const input=document.getElementById(id);if(input){input.focus();input.setSelectionRange?.(input.value.length,input.value.length);}}
async function action(id,el){
  const key=el.dataset.id;
  if(id==='start-demo'){S.user=await backend.switchRole(document.getElementById('demo-start-role').value);S.data=await backend.load();render();startAlerts();return;}
  if(id==='retry-boot'){location.reload();return;}
  if(id==='login-role'){S.loginRole=key;S.loginError=null;try{if(key&&key!=='other')localStorage.setItem('regina-login-role',key);}catch{}render();document.getElementById(key==='other'?'login-email':'login-password')?.focus();return;}
  if(id==='mobile-menu'){S.mobileOpen=!S.mobileOpen;render();return;}
  if(id==='close-menu'){S.mobileOpen=false;render();return;}
  if(id==='nav'){S.view=key;S.mobileOpen=false;S.selectedOrder=null;S.modal=null;render();window.scrollTo(0,0);if(key==='notifications')refreshPushState();return;}
  if(id==='logout'){if(!backend.isDemo)await disablePush().catch(()=>{});clearInterval(alertTimer);alertTimer=null;await backend.logout();Object.assign(S,{user:null,data:null,selectedOrder:null,cart:{},modal:null,clientName:'',clientLocation:''});render();return;}
  if(id==='refresh'){await reloadAndRender();toast('Të dhënat u rifreskuan.');return;}
  if(id==='order-filter'){S.ordersFilter=key;render();return;}
  if(id==='toggle-row'){S.expanded[key]=!S.expanded[key];render();return;}
  if(id==='open-order'){S.selectedOrder=key;S.view='orders';render();window.scrollTo(0,0);return;}
  if(id==='back-orders'){S.selectedOrder=null;render();return;}
  if(id==='print'){window.print();return;}
  if(id==='catalog-group'){S.catalogGroup=key;render();return;}
  if(id==='scroll-summary'){document.getElementById('summary')?.scrollIntoView({behavior:'smooth'});return;}
  if(id==='modal-client'){S.modal='client';render();document.getElementById(S.clientName?'c-loc':'c-name')?.focus();return;}
  if(id==='modal-product'){S.modal='product';render();return;}
  if(id==='modal-image'){S.modal='image';render();return;}
  if(id==='modal-install'){S.modal='install';render();return;}
  if(id==='modal-close'){S.modal=null;S.product=null;S.selectedShade=null;render();return;}
  if(id==='choose-product'){S.product=key;S.selectedShade=null;S.modal='variants';render();return;}
  if(id==='select-shade'){S.selectedShade=key;render();return;}
  if(id==='cart-plus'){mutateCart(key,1);return;}
  if(id==='cart-minus'){mutateCart(key,-1);return;}
  if(id==='cart-remove'){delete S.cart[key];render();return;}
  if(id==='row-plus'||id==='row-minus'){const p=byId('products',key);const s=rowSel(p);setRow(key,{qty:Math.max(1,Math.min(1000000,s.qty+(id==='row-plus'?1:-1)))});render();return;}
  if(id==='row-add'){
    const p=byId('products',key);const s=rowSel(p);
    const v=variants(key).find(x=>x.size_label===s.size&&(x.shade_code||'')===(s.shade||''));
    if(!v)throw Error('Ky paketim nuk ekziston.');
    S.cart[v.id]=(S.cart[v.id]||0)+s.qty;setRow(key,{qty:1});render();
    toast(`U shtua: ${p.name}${v.shade_code?' '+v.shade_code:''} · ${v.size_label} × ${s.qty}`);return;
  }
  if(id==='submit-order'){
    const items=Object.entries(S.cart).filter(([,qty])=>qty>0).map(([variant_id,qty])=>({variant_id,qty}));
    if(!items.length)throw Error('Shto së paku një produkt.');
    if(!clientReady())throw Error('Shkruaj klientin dhe lokacionin.');
    let c=resolveClient();
    const name=c?.name||S.clientName.trim(),loc=c?.location||S.clientLocation.trim();
    if(!confirm(`Ta dërgojmë porosinë për ${name} — ${loc} në fabrikë?${c?'':'\n(Klienti i ri do të ruhet.)'}`))return;
    if(!c)c=await backend.addClient(name,loc);
    const created=await backend.createOrder(c.id,items,S.note);
    Object.assign(S,{cart:{},clientName:'',clientLocation:'',note:'',searchProducts:'',rowSel:{},selectedOrder:created,view:'orders'});
    await reloadAndRender();toast('Porosia u dërgua në fabrikë.');window.scrollTo(0,0);return;
  }
  if(id==='status'){
    const o=byId('orders',S.selectedOrder);if(!o)throw Error('Porosia nuk ekziston');
    if(key==='cancelled'&&!confirm('A dëshiron ta anulosh këtë porosi?'))return;
    await backend.setOrderStatus(o.id,key);await reloadAndRender();toast('Statusi u ndryshua.');return;
  }
  if(id==='fill-remaining'){for(const i of orderItems(S.selectedOrder)){const input=document.getElementById('ship-'+i.id);if(input)input.value=String(i.ordered_qty-i.fulfilled_qty);}return;}
  if(id==='ship'){
    const o=byId('orders',key);if(!o)throw Error('Porosia nuk ekziston');
    const close=Boolean(document.getElementById('close-order')?.checked);
    const note=document.getElementById('shipment-note')?.value||'';
    const lines=[];for(const it of orderItems(key)){
      const qty=Number(document.getElementById('ship-'+it.id)?.value??'0');
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
    const ok=await showLocalNotification('Regina colori','Njoftimet funksionojnë në këtë pajisje.','./','test');
    toast(ok?'Njoftimi provë u shfaq.':'Zilja u dëgjua, por njoftimet e sistemit nuk janë lejuar në këtë shfletues.',!ok);return;
  }
  if(id==='save-profile'){
    const role=document.getElementById('role-'+key)?.value;const active=document.getElementById('active-'+key)?.checked;
    if(key===S.user.id&&(!active||role!=='admin')&&!confirm('Kujdes: po ndryshon qasjen tënde si administrator. Vazhdo?'))return;
    await backend.updateProfile(key,role,active);await reloadAndRender();toast('Lejet e stafit u ruajtën.');return;
  }
}
async function onSubmit(event){
  const f=event.target;
  if(f.id==='login-form'){
    event.preventDefault();const fd=new FormData(f);
    try{S.loginError=null;S.user=await backend.login(String(fd.get('email')),String(fd.get('password')));S.data=await backend.load();openDeepLink();render();startAlerts();toast('U kyçe me sukses.');}
    catch(err){S.loginError=err.message;S.user=null;render();}return;
  }
  if(!['client-form','product-form','image-form'].includes(f.id))return;
  event.preventDefault();const fd=new FormData(f);
  try{
    if(f.id==='client-form'){const c=await backend.addClient(String(fd.get('name')),String(fd.get('location')));S.clientName=c.name;S.clientLocation=c.location;S.modal=null;await reloadAndRender();toast('Klienti u shtua.');}
    if(f.id==='product-form'){await backend.addProduct(String(fd.get('name')).trim(),String(fd.get('department')),String(fd.get('size')).trim());S.modal=null;await reloadAndRender();toast('Produkti u shtua.');}
    if(f.id==='image-form'){const url=String(fd.get('url')).trim();if(url&&!/^https:\/\//i.test(url))throw Error('Fotografia duhet të ketë URL HTTPS.');await backend.setProductImage(S.product,url);S.modal=null;S.product=null;await reloadAndRender();toast('Fotografia u ruajt.');}
  }catch(err){toast(err.message,true);}
}
app.addEventListener('click',async evt=>{
  const el=evt.target.closest('[data-action]');if(!el)return;
  if(el.dataset.action==='overlay'&&evt.target!==el)return;
  if(el.dataset.action==='toggle-row'&&evt.target.closest('a,button:not(.expand-btn),input,select'))return;
  evt.preventDefault();if(el.disabled)return;
  try{await action(el.dataset.action,el);}catch(err){console.error(err);toast(err.message||'Ndodhi një gabim.',true);}
});
app.addEventListener('submit',onSubmit);
app.addEventListener('change',async evt=>{
  const t=evt.target;const id=t.id;
  if(t.dataset.quantityId){const qty=Number(t.value);if(!Number.isSafeInteger(qty)||qty<0||qty>1000000){toast('Sasi e pavlefshme.',true);render();return;}if(qty===0)delete S.cart[t.dataset.quantityId];else S.cart[t.dataset.quantityId]=qty;render();return;}
  if(t.dataset.rowSize){setRow(t.dataset.rowSize,{size:t.value});render();return;}
  if(t.dataset.rowShade){setRow(t.dataset.rowShade,{shade:t.value});render();return;}
  if(t.dataset.rowQty){const q=Number(t.value);if(!Number.isSafeInteger(q)||q<1||q>1000000){toast('Sasi e pavlefshme.',true);render();return;}setRow(t.dataset.rowQty,{qty:q});return;}
  if(id==='role-demo'){try{S.user=await backend.switchRole(t.value);S.data=await backend.load();S.selectedOrder=null;S.view='dashboard';render();}catch(err){toast(err.message,true);}return;}
  if(id==='client-name'){
    S.clientName=t.value;
    const same=activeClients().filter(c=>norm(c.name)===norm(t.value));
    if(same.length===1)S.clientLocation=same[0].location;          // klienti me një lokacion: plotësohet vetë
    else if(same.length>1&&!same.some(c=>norm(c.location)===norm(S.clientLocation)))S.clientLocation='';
    render();if(same.length>1)focusAgain('client-location');return;
  }
  if(id==='client-location'){S.clientLocation=t.value;render();return;}
  if(id==='dash-filter'){S.dashFilter=t.value;render();return;}
  if(id==='report-period'){S.reportPeriod=t.value;render();return;}
  if(id==='report-year'){S.reportYear=Number(t.value);render();return;}
  if(id==='report-month'){S.reportMonth=Number(t.value);render();return;}
});
app.addEventListener('input',evt=>{
  const id=evt.target.id;
  if(id==='order-note'){S.note=evt.target.value;return;}
  if(id==='client-name'){S.clientName=evt.target.value;syncClientUi();return;}
  if(id==='client-location'){S.clientLocation=evt.target.value;syncClientUi();return;}
  const targets={'prices-search':'pricesSearch','product-search':'searchProducts','orders-search':'searchOrders','catalog-search':'catalogSearch','dash-search':'dashSearch'};
  if(targets[id]){S[targets[id]]=evt.target.value;render();focusAgain(id);}
});
document.addEventListener('keydown',evt=>{if(evt.key==='Escape'&&(S.modal||S.mobileOpen)){S.modal=null;S.mobileOpen=false;render();}});

async function boot(){
  render();swReg();
  try{S.user=await backend.init();if(S.user){S.data=await backend.load();openDeepLink();render();startAlerts();}else render();}
  catch(err){
    // Pa internet: mos e nxirr përdoruesin, trego mundësinë për të provuar përsëri.
    if(err.offline){app.innerHTML=`<div class="boot"><img class="boot-logo" src="assets/brand/regina-colori.png" alt="Regina Colori" width="176" height="44"/><small>${e(err.message)}</small><button class="btn gold" data-action="retry-boot">${icon('refresh',18)}Provo përsëri</button></div>`;return;}
    S.user=null;S.data=null;S.loginError=err.message;render();
  }
}
boot();
setInterval(async()=>{if(!S.user||backend.isDemo||S.modal||!['dashboard','orders','reports'].includes(S.view)||S.selectedOrder||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;try{await reloadAndRender();}catch(err){console.warn('Rifreskimi automatik:',err.message);}},30000);
