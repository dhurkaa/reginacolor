-- REGINA COLOR | Skema per Supabase PostgreSQL (v1.1)
-- Ekzekutojeni te SQL Editor. Mund te ekzekutohet perseri pa humbur te dhena (idempotente).
create extension if not exists pgcrypto;
create extension if not exists pg_net with schema extensions;   -- per njoftimet (Telegram / push)

-- =====================================================================
-- TABELAT
-- =====================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'agent' check (role in ('agent','warehouse','admin')),
  active boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 150),
  location text not null check (char_length(trim(location)) between 2 and 150),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.products (
  id text primary key,
  name text not null,
  department text not null default 'tjeter',
  image_url text,
  active boolean not null default true
);
create table if not exists public.product_variants (
  id text primary key,
  product_id text not null references public.products(id) on delete cascade,
  size_label text not null,
  shade_code text,
  label text not null,
  active boolean not null default true
);
-- Lista e cmimeve: nje cmim per produkt + paketim (nuancat RG/MX e ndajne te njejtin cmim).
create table if not exists public.product_prices (
  product_id text not null references public.products(id) on delete cascade,
  size_label text not null,
  price numeric(12,2) not null check (price >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  primary key (product_id, size_label)
);
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no bigint generated always as identity unique,
  client_id uuid not null references public.clients(id),
  agent_id uuid not null references public.profiles(id),
  status text not null default 'new' check (status in ('new','preparing','partial','completed','cancelled')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id text not null references public.product_variants(id),
  ordered_qty integer not null check (ordered_qty > 0),
  fulfilled_qty integer not null default 0 check (fulfilled_qty >= 0 and fulfilled_qty <= ordered_qty),
  unique(order_id,variant_id)
);
-- Cmimi per njesi, i kopjuar nga lista kur krijohet porosia (ndryshimet e listes nuk e ndryshojne historine).
alter table public.order_items add column if not exists unit_price numeric(12,2) check (unit_price is null or unit_price >= 0);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  created_by uuid not null references public.profiles(id),
  dispatched_at timestamptz not null default now(),
  note text not null default ''
);
create table if not exists public.shipment_items (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id),
  quantity integer not null check (quantity > 0),
  unique(shipment_id,order_item_id)
);
create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  user_id uuid references public.profiles(id),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
-- Telefonat/shfletuesit qe kane lejuar njoftimet push.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
-- Konfigurim privat (adresa e funksionit te njoftimeve + sekreti). Pa asnje policy: i padukshem nga aplikacioni.
create table if not exists public.app_config (
  key text primary key,
  value text not null
);

create index if not exists idx_orders_agent on public.orders(agent_id);
create index if not exists idx_orders_created on public.orders(created_at desc);
create index if not exists idx_items_order on public.order_items(order_id);
create index if not exists idx_shipments_order on public.shipments(order_id);
create index if not exists idx_shipments_time on public.shipments(dispatched_at desc);
create index if not exists idx_shipment_items_shipment on public.shipment_items(shipment_id);
create index if not exists idx_push_user on public.push_subscriptions(user_id);

-- =====================================================================
-- PERDORUESIT DHE ROLET
-- =====================================================================
-- Secili perdorues i ri eshte JOAKTIV deri kur admini e lejon.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id,full_name,role,active)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)), 'agent', false)
  on conflict(id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created_regina on auth.users;
create trigger on_auth_user_created_regina after insert on auth.users
for each row execute function public.handle_new_user();

-- Roli i perdoruesit aktual; NULL nese nuk eshte kycur ose nuk eshte aktiv.
create or replace function public.app_role() returns text
language sql stable security definer set search_path=public as $$
  select role from public.profiles where id=auth.uid() and active=true limit 1
$$;

-- Ndalon veprimin nese perdoruesi nuk ka nje nga rolet. (Kujdes: NULL nuk kalon kurre.)
create or replace function public.require_role(variadic p_roles text[]) returns text
language plpgsql stable security definer set search_path=public as $$
declare v_role text := public.app_role();
begin
  if v_role is null or not (v_role = any(p_roles)) then
    raise exception 'Nuk keni leje per kete veprim';
  end if;
  return v_role;
end; $$;

-- Versioni 1.0 kishte funksionin current_role(); politikat e reja perdorin app_role().
drop function if exists public.current_role() cascade;

-- =====================================================================
-- SIGURIA (Row Level Security)
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_prices enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_items enable row level security;
alter table public.order_events enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.app_config enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
using (id=auth.uid() or public.app_role() in ('admin','warehouse'));
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update to authenticated
using (public.app_role()='admin') with check (public.app_role()='admin');

drop policy if exists clients_read on public.clients;
create policy clients_read on public.clients for select to authenticated
using (public.app_role() is not null);
drop policy if exists clients_add on public.clients;
create policy clients_add on public.clients for insert to authenticated
with check (public.app_role() is not null);
drop policy if exists clients_admin_update on public.clients;
create policy clients_admin_update on public.clients for update to authenticated
using (public.app_role()='admin') with check (public.app_role()='admin');

drop policy if exists products_read on public.products;
create policy products_read on public.products for select to authenticated
using (public.app_role() is not null);
drop policy if exists products_admin_add on public.products;
create policy products_admin_add on public.products for insert to authenticated
with check (public.app_role()='admin');
drop policy if exists products_admin_update on public.products;
create policy products_admin_update on public.products for update to authenticated
using (public.app_role()='admin') with check (public.app_role()='admin');

drop policy if exists variants_read on public.product_variants;
create policy variants_read on public.product_variants for select to authenticated
using (public.app_role() is not null);
drop policy if exists variants_admin_add on public.product_variants;
create policy variants_admin_add on public.product_variants for insert to authenticated
with check (public.app_role()='admin');
drop policy if exists variants_admin_update on public.product_variants;
create policy variants_admin_update on public.product_variants for update to authenticated
using (public.app_role()='admin') with check (public.app_role()='admin');

-- Cmimet: lexohen nga stafi aktiv; ndryshohen vetem permes set_product_price (admin).
drop policy if exists prices_read on public.product_prices;
create policy prices_read on public.product_prices for select to authenticated
using (public.app_role() is not null);

drop policy if exists orders_read on public.orders;
create policy orders_read on public.orders for select to authenticated
using (public.app_role() in ('admin','warehouse') or (public.app_role()='agent' and agent_id=auth.uid()));
drop policy if exists items_read on public.order_items;
create policy items_read on public.order_items for select to authenticated
using (exists(select 1 from public.orders o where o.id=order_id and
  (public.app_role() in ('admin','warehouse') or (public.app_role()='agent' and o.agent_id=auth.uid()))));
drop policy if exists shipments_read on public.shipments;
create policy shipments_read on public.shipments for select to authenticated
using (exists(select 1 from public.orders o where o.id=order_id and
  (public.app_role() in ('admin','warehouse') or (public.app_role()='agent' and o.agent_id=auth.uid()))));
drop policy if exists shipment_items_read on public.shipment_items;
create policy shipment_items_read on public.shipment_items for select to authenticated
using (exists(select 1 from public.shipments s join public.orders o on o.id=s.order_id
  where s.id=shipment_id and (public.app_role() in ('admin','warehouse') or (public.app_role()='agent' and o.agent_id=auth.uid()))));
drop policy if exists events_read on public.order_events;
create policy events_read on public.order_events for select to authenticated
using (exists(select 1 from public.orders o where o.id=order_id and
  (public.app_role() in ('admin','warehouse') or (public.app_role()='agent' and o.agent_id=auth.uid()))));

-- Secili sheh vetem pajisjet e veta; shtimi/heqja behet permes funksioneve me poshte.
drop policy if exists push_read_own on public.push_subscriptions;
create policy push_read_own on public.push_subscriptions for select to authenticated
using (user_id=auth.uid());

-- =====================================================================
-- NJOFTIMET (Telegram + push), dergohen pas COMMIT nga pg_net
-- =====================================================================
create or replace function public.notify_event(p_event text, p_order_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_url text; v_secret text;
begin
  select value into v_url from public.app_config where key='notify_url';
  select value into v_secret from public.app_config where key='notify_secret';
  if coalesce(v_url,'')='' then return; end if;   -- njoftimet ende jo te konfiguruara
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('event',p_event,'order_id',p_order_id),
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||coalesce(v_secret,'')),
    timeout_milliseconds := 15000);
exception when others then
  raise warning 'notify_event deshtoi: %', sqlerrm;   -- njoftimi nuk duhet ta ndaloje kurre porosine
end; $$;

-- =====================================================================
-- VEPRIMET (shkrimet kritike behen VETEM permes ketyre funksioneve, me audit)
-- =====================================================================
create or replace function public.create_order(p_client_id uuid,p_items jsonb,p_notes text default '')
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_line jsonb; v_var text; v_qty int; v_n int:=0;
begin
  perform public.require_role('agent','warehouse','admin');
  if not exists(select 1 from public.clients where id=p_client_id and active) then raise exception 'Klienti nuk ekziston'; end if;
  if coalesce(jsonb_typeof(p_items),'null') <> 'array' or jsonb_array_length(p_items)=0 then raise exception 'Porosia eshte bosh'; end if;
  if jsonb_array_length(p_items) > 200 then raise exception 'Shume rreshta ne nje porosi'; end if;
  if (select count(distinct x->>'variant_id') from jsonb_array_elements(p_items) x) <> jsonb_array_length(p_items)
  then raise exception 'Produkti eshte shtuar dy here'; end if;
  insert into public.orders(client_id,agent_id,notes) values(p_client_id,auth.uid(),left(coalesce(p_notes,''),3000)) returning id into v_id;
  for v_line in select * from jsonb_array_elements(p_items) loop
    v_var := v_line->>'variant_id'; v_qty := (v_line->>'qty')::int;
    if v_qty is null or v_qty<1 or v_qty>1000000 then raise exception 'Sasi e pavlefshme'; end if;
    if not exists(select 1 from public.product_variants v join public.products p on p.id=v.product_id
      where v.id=v_var and v.active and p.active) then raise exception 'Variant i pavlefshem %',v_var; end if;
    insert into public.order_items(order_id,variant_id,ordered_qty,unit_price)
    values(v_id,v_var,v_qty,(select pp.price from public.product_variants v
       join public.product_prices pp on pp.product_id=v.product_id and pp.size_label=v.size_label where v.id=v_var));
    v_n := v_n+1;
  end loop;
  insert into public.order_events(order_id,user_id,event_type,payload)
  values(v_id,auth.uid(),'created',jsonb_build_object('line_count',v_n));
  perform public.notify_event('order_created', v_id);
  return v_id;
end; $$;

create or replace function public.set_order_status(p_order_id uuid,p_status text)
returns void language plpgsql security definer set search_path=public as $$
declare v_old text;
begin
  perform public.require_role('warehouse','admin');
  if p_status not in ('preparing','cancelled') then raise exception 'Status i pavlefshem'; end if;
  select status into v_old from public.orders where id=p_order_id for update;
  if v_old is null then raise exception 'Porosia nuk ekziston'; end if;
  if v_old in ('completed','cancelled') then raise exception 'Porosia eshte mbyllur'; end if;
  if p_status='cancelled' and exists(select 1 from public.order_items where order_id=p_order_id and fulfilled_qty>0)
  then raise exception 'Porosia me dergesa nuk mund te anulohet'; end if;
  update public.orders set status=p_status where id=p_order_id;
  insert into public.order_events(order_id,user_id,event_type,payload)
  values(p_order_id,auth.uid(),'status_changed',jsonb_build_object('from',v_old,'to',p_status));
end; $$;

create or replace function public.register_shipment(p_order_id uuid,p_lines jsonb,p_close boolean default false,p_note text default '')
returns uuid language plpgsql security definer set search_path=public as $$
declare v_status text; v_shipment uuid; v_line jsonb; v_item uuid; v_qty int; v_existing int; v_ordered int;
        v_n int:=0; v_total int; v_left int;
begin
  perform public.require_role('warehouse','admin');
  select status into v_status from public.orders where id=p_order_id for update;
  if v_status is null or v_status in ('cancelled','completed') then raise exception 'Porosia nuk eshte aktive'; end if;
  if coalesce(jsonb_typeof(p_lines),'null')<>'array' then raise exception 'Lista e sasive nuk eshte e vlefshme'; end if;
  if (select count(distinct x->>'order_item_id') from jsonb_array_elements(p_lines) x) <> jsonb_array_length(p_lines)
  then raise exception 'Rresht i perseritur'; end if;
  if jsonb_array_length(p_lines)>0 then
    insert into public.shipments(order_id,created_by,note)
    values(p_order_id,auth.uid(),left(coalesce(p_note,''),2000)) returning id into v_shipment;
    for v_line in select * from jsonb_array_elements(p_lines) loop
      v_item:=(v_line->>'order_item_id')::uuid;
      v_qty:=(v_line->>'qty')::int;
      select ordered_qty,fulfilled_qty into v_ordered,v_existing
      from public.order_items where id=v_item and order_id=p_order_id for update;
      if v_ordered is null or v_qty is null or v_qty<=0 or v_existing+v_qty>v_ordered
      then raise exception 'Sasia e dergeses eshte e pavlefshme'; end if;
      update public.order_items set fulfilled_qty=fulfilled_qty+v_qty where id=v_item;
      insert into public.shipment_items(shipment_id,order_item_id,quantity) values(v_shipment,v_item,v_qty);
      v_n:=v_n+v_qty;
    end loop;
    insert into public.order_events(order_id,user_id,event_type,payload)
    values(p_order_id,auth.uid(),'shipment',jsonb_build_object('shipment_id',v_shipment,'units',v_n));
  elsif not p_close then raise exception 'Nuk jane caktuar sasite e dergeses'; end if;
  select coalesce(sum(fulfilled_qty),0),coalesce(sum(ordered_qty-fulfilled_qty),0)
  into v_total,v_left from public.order_items where order_id=p_order_id;
  if p_close and v_total=0 then raise exception 'Nuk mund te mbyllet pa asnje dergese'; end if;
  update public.orders set
    status=case when p_close or v_left=0 then 'completed' when v_total>0 then 'partial' else 'preparing' end,
    completed_at=case when p_close or v_left=0 then now() else null end
  where id=p_order_id;
  if p_close or v_left=0 then
    insert into public.order_events(order_id,user_id,event_type,payload)
    values(p_order_id,auth.uid(),'closed',jsonb_build_object('remaining_units',v_left,'closed_short',v_left>0));
  end if;
  if v_shipment is not null then perform public.notify_event('shipment', p_order_id); end if;
  return v_shipment;
end; $$;

create or replace function public.adjust_order_item(p_item_id uuid,p_qty integer)
returns void language plpgsql security definer set search_path=public as $$
declare v_order uuid; v_old int; v_fulfilled int; v_status text;
begin
  perform public.require_role('admin');
  select oi.order_id,oi.ordered_qty,oi.fulfilled_qty,o.status
  into v_order,v_old,v_fulfilled,v_status from public.order_items oi
  join public.orders o on o.id=oi.order_id where oi.id=p_item_id for update of oi;
  if v_order is null or v_status in ('cancelled','completed') then raise exception 'Porosia eshte mbyllur'; end if;
  if p_qty is null or p_qty<1 or p_qty>1000000 or p_qty<v_fulfilled then raise exception 'Sasi e pavlefshme'; end if;
  update public.order_items set ordered_qty=p_qty where id=p_item_id;
  insert into public.order_events(order_id,user_id,event_type,payload)
  values(v_order,auth.uid(),'quantity_adjusted',jsonb_build_object('item_id',p_item_id,'old',v_old,'new',p_qty));
end; $$;

create or replace function public.reopen_order(p_order_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_left int; v_total int;
begin
  perform public.require_role('admin');
  if not exists(select 1 from public.orders where id=p_order_id and status='completed' for update) then raise exception 'Porosia nuk eshte mbyllur'; end if;
  select coalesce(sum(ordered_qty-fulfilled_qty),0),coalesce(sum(fulfilled_qty),0) into v_left,v_total
  from public.order_items where order_id=p_order_id;
  if v_left=0 then raise exception 'Nuk ka sasi te mbetur'; end if;
  update public.orders set status=case when v_total>0 then 'partial' else 'preparing' end,completed_at=null where id=p_order_id;
  insert into public.order_events(order_id,user_id,event_type) values(p_order_id,auth.uid(),'reopened');
end; $$;

-- Lista e cmimeve (admin). p_price NULL = fshi cmimin.
create or replace function public.set_product_price(p_product_id text,p_size text,p_price numeric)
returns void language plpgsql security definer set search_path=public as $$
begin
  perform public.require_role('admin');
  if not exists(select 1 from public.product_variants where product_id=p_product_id and size_label=p_size)
  then raise exception 'Paketimi nuk ekziston'; end if;
  if p_price is null then
    delete from public.product_prices where product_id=p_product_id and size_label=p_size;
    return;
  end if;
  if p_price<0 or p_price>1000000 then raise exception 'Cmim i pavlefshem'; end if;
  insert into public.product_prices(product_id,size_label,price,updated_at,updated_by)
  values(p_product_id,p_size,round(p_price,2),now(),auth.uid())
  on conflict(product_id,size_label) do update set price=excluded.price,updated_at=now(),updated_by=auth.uid();
end; $$;

-- Ndryshon cmimin e nje rreshti te porosise (p.sh. zbritje). NULL = pa cmim.
create or replace function public.set_item_price(p_item_id uuid,p_price numeric)
returns void language plpgsql security definer set search_path=public as $$
declare v_order uuid; v_old numeric;
begin
  perform public.require_role('admin');
  select order_id,unit_price into v_order,v_old from public.order_items where id=p_item_id for update;
  if v_order is null then raise exception 'Rreshti nuk ekziston'; end if;
  if p_price is not null and (p_price<0 or p_price>1000000) then raise exception 'Cmim i pavlefshem'; end if;
  update public.order_items set unit_price=round(p_price,2) where id=p_item_id;
  insert into public.order_events(order_id,user_id,event_type,payload)
  values(v_order,auth.uid(),'price_adjusted',jsonb_build_object('item_id',p_item_id,'old',v_old,'new',round(p_price,2)));
end; $$;

-- Plotson rreshtat pa cmim me cmimet aktuale te listes.
create or replace function public.fill_missing_prices(p_order_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare v_n int;
begin
  perform public.require_role('admin');
  update public.order_items oi set unit_price=pp.price
  from public.product_variants v
  join public.product_prices pp on pp.product_id=v.product_id and pp.size_label=v.size_label
  where oi.order_id=p_order_id and oi.unit_price is null and v.id=oi.variant_id;
  get diagnostics v_n = row_count;
  if v_n>0 then
    insert into public.order_events(order_id,user_id,event_type,payload)
    values(p_order_id,auth.uid(),'prices_filled',jsonb_build_object('lines',v_n));
  end if;
  return v_n;
end; $$;

-- Pajisjet per njoftime push (cdo perdorues aktiv, per veten e vet).
create or replace function public.save_push_subscription(p_endpoint text,p_p256dh text,p_auth text,p_user_agent text default '')
returns void language plpgsql security definer set search_path=public as $$
begin
  perform public.require_role('agent','warehouse','admin');
  if p_endpoint is null or p_endpoint !~ '^https://' or length(p_endpoint)>2000 then raise exception 'Pajisje e pavlefshme'; end if;
  delete from public.push_subscriptions where endpoint=p_endpoint;   -- pajisja mund te kete qene e nje perdoruesi tjeter
  insert into public.push_subscriptions(user_id,endpoint,p256dh,auth,user_agent)
  values(auth.uid(),p_endpoint,left(p_p256dh,200),left(p_auth,100),left(coalesce(p_user_agent,''),400));
end; $$;

create or replace function public.delete_push_subscription(p_endpoint text)
returns void language plpgsql security definer set search_path=public as $$
begin
  delete from public.push_subscriptions where endpoint=p_endpoint and user_id=auth.uid();
end; $$;

-- =====================================================================
-- LEJET E FUNKSIONEVE (Supabase u jep anon/authenticated qasje automatikisht; i kufizojme)
-- =====================================================================
do $$
declare f text;
begin
  foreach f in array array[
    'public.create_order(uuid,jsonb,text)',
    'public.set_order_status(uuid,text)',
    'public.register_shipment(uuid,jsonb,boolean,text)',
    'public.adjust_order_item(uuid,integer)',
    'public.reopen_order(uuid)',
    'public.set_product_price(text,text,numeric)',
    'public.set_item_price(uuid,numeric)',
    'public.fill_missing_prices(uuid)',
    'public.save_push_subscription(text,text,text,text)',
    'public.delete_push_subscription(text)']
  loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  foreach f in array array['public.notify_event(text,uuid)','public.handle_new_user()','public.require_role(text[])'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
end $$;
