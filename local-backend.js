import {CATALOG_PRODUCTS,CATALOG_VARIANTS} from './catalog.js';
const KEY='regina-demo-v1', WHO='regina-demo-user-v1';
const uuid=()=>crypto.randomUUID();
const clone=x=>structuredClone(x);
const PEOPLE=[{id:'demo-agent',full_name:'Agjent demonstrues',role:'agent',active:true},{id:'demo-warehouse',full_name:'Magazina demonstrim',role:'warehouse',active:true},{id:'demo-admin',full_name:'Administrator demonstrim',role:'admin',active:true}];
function read(){
  try { const s=JSON.parse(localStorage.getItem(KEY)); if(s?.products?.length){s.product_prices??=[];return s;} }catch{}
  const s={profiles:PEOPLE,clients:[{id:uuid(),name:'Termo Projekt',location:'Istog',active:true,created_at:new Date().toISOString()}],products:clone(CATALOG_PRODUCTS),product_variants:clone(CATALOG_VARIANTS),product_prices:[],orders:[],order_items:[],shipments:[],shipment_items:[],order_events:[],lastNo:0};
  save(s);return s;
}
function save(s){localStorage.setItem(KEY,JSON.stringify(s));}
const now=()=>new Date().toISOString();
export class LocalBackend {
  constructor(){this.isDemo=true;this.person=localStorage.getItem(WHO)||'demo-admin';}
  async init(){this.person=localStorage.getItem(WHO)||'demo-admin';return this.me();}
  me(){return PEOPLE.find(p=>p.id===this.person)||PEOPLE[2];}
  async login(){return this.me();}
  async switchRole(id){if(!PEOPLE.some(p=>p.id===id))throw Error('Rol i pavlefshëm');this.person=id;localStorage.setItem(WHO,id);return this.me();}
  async logout(){return;}
  async load(){
    const s=clone(read());
    if(this.me().role==='agent'){
      s.orders=s.orders.filter(o=>o.agent_id===this.person);
      const ids=new Set(s.orders.map(o=>o.id));
      s.order_items=s.order_items.filter(i=>ids.has(i.order_id));
      s.shipments=s.shipments.filter(sh=>ids.has(sh.order_id));
      const shipmentIds=new Set(s.shipments.map(sh=>sh.id));
      s.shipment_items=s.shipment_items.filter(it=>shipmentIds.has(it.shipment_id));
      s.order_events=s.order_events.filter(ev=>ids.has(ev.order_id));
      s.profiles=s.profiles.filter(p=>p.id===this.person);
    }
    return s;
  }
  async addClient(name,location){const s=read();const item={id:uuid(),name:name.trim(),location:location.trim(),active:true,created_at:now()};s.clients.push(item);save(s);return item;}
  async createOrder(client_id,items,notes){const s=read();if(!s.clients.some(x=>x.id===client_id))throw Error('Klienti nuk ekziston');if(!items.length)throw Error('Shto së paku një produkt');const id=uuid();const item={id,order_no:++s.lastNo,client_id,agent_id:this.person,status:'new',notes:notes||'',created_at:now(),completed_at:null};s.orders.unshift(item);for(const it of items){if(!s.product_variants.some(v=>v.id===it.variant_id)||!Number.isInteger(it.qty)||it.qty<1)throw Error('Sasia e pavlefshme');const v=s.product_variants.find(x=>x.id===it.variant_id);const pr=s.product_prices.find(x=>x.product_id===v.product_id&&x.size_label===v.size_label);s.order_items.push({id:uuid(),order_id:id,variant_id:it.variant_id,ordered_qty:it.qty,fulfilled_qty:0,unit_price:pr?pr.price:null});}s.order_events.push({id:uuid(),order_id:id,user_id:this.person,event_type:'created',created_at:now(),payload:{}});save(s);return id;}
  assertRole(){if(!['admin','warehouse'].includes(this.me().role))throw Error('Nuk keni leje për këtë veprim');}
  async setOrderStatus(id,status){this.assertRole();const s=read(),o=s.orders.find(x=>x.id===id);if(!o||['completed','cancelled'].includes(o.status))throw Error('Porosia është e mbyllur');if(!['preparing','cancelled'].includes(status))throw Error('Status i pavlefshëm');if(status==='cancelled'&&s.order_items.some(i=>i.order_id===id&&i.fulfilled_qty>0))throw Error('Nuk mund të anulohet porosia me dërgesa');o.status=status;s.order_events.push({id:uuid(),order_id:id,user_id:this.person,event_type:'status_changed',created_at:now(),payload:{status}});save(s);}
  async registerShipment(orderId,lines,close,note){this.assertRole();const s=read(),o=s.orders.find(x=>x.id===orderId);if(!o||['completed','cancelled'].includes(o.status))throw Error('Porosia është e mbyllur');const entries=lines.filter(x=>x.qty>0);if(!entries.length&&!close)throw Error('Zgjedh sasinë për dërgesë');const ids=entries.map(x=>x.order_item_id);if(new Set(ids).size!==ids.length)throw Error('Rresht i përsëritur');for(const ent of entries){const item=s.order_items.find(i=>i.id===ent.order_item_id&&i.order_id===orderId);if(!item||!Number.isInteger(ent.qty)||ent.qty<1||ent.qty>item.ordered_qty-item.fulfilled_qty)throw Error('Sasia tejkalon mbetjen');}
    let shipmentId=null;if(entries.length){shipmentId=uuid();s.shipments.push({id:shipmentId,order_id:orderId,created_by:this.person,dispatched_at:now(),note:note||''});for(const ent of entries){const item=s.order_items.find(x=>x.id===ent.order_item_id);item.fulfilled_qty+=ent.qty;s.shipment_items.push({id:uuid(),shipment_id:shipmentId,order_item_id:item.id,quantity:ent.qty});}s.order_events.push({id:uuid(),order_id:orderId,user_id:this.person,event_type:'shipment',created_at:now(),payload:{shipment_id:shipmentId}});}
    const all=s.order_items.filter(x=>x.order_id===orderId);const remain=all.reduce((a,x)=>a+x.ordered_qty-x.fulfilled_qty,0),sent=all.reduce((a,x)=>a+x.fulfilled_qty,0);if(close&&sent===0)throw Error('Nuk mund të mbyllet pa dërgesë');o.status=close||remain===0?'completed':sent>0?'partial':'preparing';o.completed_at=o.status==='completed'?now():null;if(o.status==='completed')s.order_events.push({id:uuid(),order_id:orderId,user_id:this.person,event_type:'closed',created_at:now(),payload:{remaining_units:remain}});save(s);return shipmentId;
  }
  async adjustOrderItem(itemId,qty){if(this.me().role!=='admin')throw Error('Vetëm administratori');const s=read();const item=s.order_items.find(x=>x.id===itemId);const o=s.orders.find(x=>x.id===item?.order_id);if(!item||!o||['completed','cancelled'].includes(o.status))throw Error('Porosia është e mbyllur');if(!Number.isInteger(qty)||qty<1||qty<item.fulfilled_qty)throw Error('Sasi e pavlefshme');const old=item.ordered_qty;item.ordered_qty=qty;s.order_events.push({id:uuid(),order_id:o.id,user_id:this.person,event_type:'quantity_adjusted',created_at:now(),payload:{old,new:qty}});save(s);}
  async reopenOrder(id){if(this.me().role!=='admin')throw Error('Vetëm administratori');const s=read();const o=s.orders.find(x=>x.id===id);if(o?.status!=='completed')throw Error('Porosia nuk është e përfunduar');const items=s.order_items.filter(x=>x.order_id===id);if(items.every(x=>x.fulfilled_qty===x.ordered_qty))throw Error('Nuk ka mbetje');o.status=items.some(x=>x.fulfilled_qty>0)?'partial':'preparing';o.completed_at=null;s.order_events.push({id:uuid(),order_id:id,user_id:this.person,event_type:'reopened',created_at:now(),payload:{}});save(s);}
  async addProduct(name,department,size){if(this.me().role!=='admin')throw Error('Vetëm administratori');const s=read();const id='extra-'+uuid().slice(0,8),vid=id+'-'+uuid().slice(0,5);s.products.push({id,name,department,image_url:null,active:true});s.product_variants.push({id:vid,product_id:id,size_label:size,shade_code:null,label:size,active:true});save(s);}
  async setProductImage(id,url){if(this.me().role!=='admin')throw Error('Vetëm administratori');const s=read(),p=s.products.find(x=>x.id===id);if(!p)throw Error('Produkti nuk ekziston');p.image_url=url||null;save(s);}
  async setProductPrice(product_id,size,price){if(this.me().role!=='admin')throw Error('Vetëm administratori');const s=read();s.product_prices=s.product_prices.filter(x=>!(x.product_id===product_id&&x.size_label===size));if(price!=null){if(!(price>=0&&price<=1000000))throw Error('Çmim i pavlefshëm');s.product_prices.push({product_id,size_label:size,price:Math.round(price*100)/100,updated_at:now(),updated_by:this.person});}save(s);}
  async setItemPrice(itemId,price){if(this.me().role!=='admin')throw Error('Vetëm administratori');const s=read();const it=s.order_items.find(x=>x.id===itemId);if(!it)throw Error('Rreshti nuk ekziston');if(price!=null&&!(price>=0&&price<=1000000))throw Error('Çmim i pavlefshëm');const old=it.unit_price??null;it.unit_price=price==null?null:Math.round(price*100)/100;s.order_events.push({id:uuid(),order_id:it.order_id,user_id:this.person,event_type:'price_adjusted',created_at:now(),payload:{old,new:it.unit_price}});save(s);}
  async fillMissingPrices(orderId){if(this.me().role!=='admin')throw Error('Vetëm administratori');const s=read();let n=0;for(const it of s.order_items.filter(x=>x.order_id===orderId&&x.unit_price==null)){const v=s.product_variants.find(x=>x.id===it.variant_id);const pr=s.product_prices.find(x=>x.product_id===v?.product_id&&x.size_label===v?.size_label);if(pr){it.unit_price=pr.price;n++;}}if(n)s.order_events.push({id:uuid(),order_id:orderId,user_id:this.person,event_type:'prices_filled',created_at:now(),payload:{lines:n}});save(s);return n;}
  async savePushSubscription(){throw Error('Njoftimet push punojnë vetëm në versionin online (Supabase + Vercel).');}
  async deletePushSubscription(){}
  async latestOrders(){const d=await this.load();return [...d.orders].sort((a,b)=>b.order_no-a.order_no).slice(0,10);}
  async updateProfile(id,role,active){if(this.me().role!=='admin')throw Error('Vetëm administratori');const s=read(),p=s.profiles.find(x=>x.id===id);if(p){p.role=role;p.active=active;save(s);}}
}
