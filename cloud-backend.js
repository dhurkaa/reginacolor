import {CLOUD_CONFIG} from './config.js';
const SESSION_KEY='regina-cloud-session';
const {supabaseUrl:url,supabaseAnonKey:key}=CLOUD_CONFIG;
export const isCloudConfigured=Boolean(url&&key);
const getSession=()=>{try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}};
export class CloudBackend {
  constructor(){this.isDemo=false;this.session=getSession();this.user=null;}
  async authCall(path,payload,accessToken){
    const res=await fetch(`${url}/auth/v1/${path}`,{method:'POST',headers:{'apikey':key,'Content-Type':'application/json',...(accessToken?{Authorization:`Bearer ${accessToken}`}:{})},body:JSON.stringify(payload)});
    const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.msg||data.error_description||data.message||'Gabim në hyrje');return data;
  }
  saveSession(s){this.session=s;if(s)localStorage.setItem(SESSION_KEY,JSON.stringify(s));else localStorage.removeItem(SESSION_KEY);}
  async ensureToken(){if(!this.session)throw Error('Ju lutem kyçuni');if(Date.now()<Number(this.session.expires_at||0)*1000-90_000)return this.session.access_token;
    try{const r=await this.authCall('token?grant_type=refresh_token',{refresh_token:this.session.refresh_token});this.saveSession({...r,expires_at:Math.floor(Date.now()/1000)+r.expires_in});return r.access_token;}catch(e){this.saveSession(null);this.user=null;throw Error('Sesioni ka skaduar. Kyçuni përsëri.');}}
  async api(path,{method='GET',body,all=false}={}){
    const token=await this.ensureToken();
    const common={'apikey':key,'Authorization':`Bearer ${token}`,'Content-Type':'application/json','Prefer':method==='POST'?'return=representation':'return=minimal'};
    const call=async(range)=>{const res=await fetch(`${url}/rest/v1/${path}`,{method,headers:{...common,...(range?{Range:range}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});if(!res.ok){const err=await res.json().catch(()=>({}));throw Error(err.message||err.error||`Gabim i databazës (${res.status})`);}if(res.status===204)return [];const raw=await res.text();return raw?JSON.parse(raw):[];};
    if(!all)return call();let result=[];let start=0;for(let i=0;i<100;i++){const page=await call(`${start}-${start+999}`);result=result.concat(page);if(page.length<1000)break;start+=1000;}return result;
  }
  async init(){if(!this.session)return null;try{const token=await this.ensureToken();const res=await fetch(`${url}/auth/v1/user`,{headers:{'apikey':key,'Authorization':`Bearer ${token}`}});if(!res.ok)throw Error('Sesioni nuk është aktiv');const auth=await res.json();const rows=await this.api(`profiles?id=eq.${auth.id}&select=*`);this.user=rows?.[0]||null;if(!this.user?.active)throw Error('Llogaria juaj nuk është aktivizuar ende nga administratori.');return this.user;}catch(e){if(!String(e.message).includes('aktivizuar'))this.saveSession(null);throw e;}}
  async login(email,password){const r=await this.authCall('token?grant_type=password',{email,password});this.saveSession({...r,expires_at:Math.floor(Date.now()/1000)+r.expires_in});return this.init();}
  async logout(){try{const token=await this.ensureToken();await this.authCall('logout',{},token);}catch{}this.saveSession(null);this.user=null;}
  async load(){const tables=['clients','products','product_variants','product_prices','orders','order_items','shipments','shipment_items','order_events','profiles'];const result=await Promise.all(tables.map(t=>this.api(`${t}?select=*`,{all:true})));return Object.fromEntries(tables.map((t,i)=>[t,result[i]]));}
  async addClient(name,location){const rows=await this.api('clients',{method:'POST',body:{name:name.trim(),location:location.trim()}});return rows[0];}
  async createOrder(client_id,items,notes){return this.api('rpc/create_order',{method:'POST',body:{p_client_id:client_id,p_items:items,p_notes:notes||''}});}
  async setOrderStatus(id,status){await this.api('rpc/set_order_status',{method:'POST',body:{p_order_id:id,p_status:status}});}
  async registerShipment(id,lines,close,note){return this.api('rpc/register_shipment',{method:'POST',body:{p_order_id:id,p_lines:lines,p_close:close,p_note:note||''}});}
  async adjustOrderItem(id,qty){await this.api('rpc/adjust_order_item',{method:'POST',body:{p_item_id:id,p_qty:qty}});}
  async reopenOrder(id){await this.api('rpc/reopen_order',{method:'POST',body:{p_order_id:id}});}
  async addProduct(name,department,size){const id='extra-'+crypto.randomUUID().slice(0,16);await this.api('products',{method:'POST',body:{id,name,department}});await this.api('product_variants',{method:'POST',body:{id:id+'-1',product_id:id,label:size,size_label:size}});}
  async setProductImage(id,image_url){await this.api(`products?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:{image_url:image_url||null}});}
  async updateProfile(id,role,active){await this.api(`profiles?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:{role,active}});}
  async setProductPrice(product_id,size,price){await this.api('rpc/set_product_price',{method:'POST',body:{p_product_id:product_id,p_size:size,p_price:price}});}
  async setItemPrice(item_id,price){await this.api('rpc/set_item_price',{method:'POST',body:{p_item_id:item_id,p_price:price}});}
  async fillMissingPrices(order_id){return this.api('rpc/fill_missing_prices',{method:'POST',body:{p_order_id:order_id}});}
  async savePushSubscription(sub){const j=sub.toJSON();await this.api('rpc/save_push_subscription',{method:'POST',body:{p_endpoint:j.endpoint,p_p256dh:j.keys.p256dh,p_auth:j.keys.auth,p_user_agent:navigator.userAgent}});}
  async deletePushSubscription(endpoint){await this.api('rpc/delete_push_subscription',{method:'POST',body:{p_endpoint:endpoint}});}
  async latestOrders(){return this.api('orders?select=id,order_no,client_id,agent_id,created_at&order=order_no.desc&limit=10');}
}
