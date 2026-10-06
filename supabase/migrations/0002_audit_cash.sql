-- PetFlow: auditoría, caja y cierres por negocio.
create extension if not exists pgcrypto;

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  pet_shop_id uuid not null references public.pet_shops(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (length(trim(action)) between 2 and 80),
  entity_type text not null check (length(trim(entity_type)) between 2 and 80),
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_events_shop_created_idx on public.audit_events(pet_shop_id, created_at desc);

create table if not exists public.cash_registers (
  id uuid primary key default gen_random_uuid(),
  pet_shop_id uuid not null references public.pet_shops(id) on delete cascade,
  opened_by uuid not null references auth.users(id),
  opened_at timestamptz not null default now(),
  opening_amount numeric(14,2) not null default 0 check (opening_amount >= 0),
  closed_at timestamptz,
  closed_by uuid references auth.users(id),
  expected_cash numeric(14,2),
  counted_cash numeric(14,2),
  difference numeric(14,2),
  status text not null default 'open' check (status in ('open','closed')),
  closing_note text,
  check ((status = 'open' and closed_at is null) or (status = 'closed' and closed_at is not null and counted_cash is not null))
);
create unique index if not exists one_open_register_per_shop_idx on public.cash_registers(pet_shop_id) where status = 'open';

create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  pet_shop_id uuid not null references public.pet_shops(id) on delete cascade,
  cash_register_id uuid not null references public.cash_registers(id) on delete restrict,
  created_by uuid not null references auth.users(id),
  movement_type text not null check (movement_type in ('sale','cash_in','cash_out','refund','opening_adjustment')),
  payment_method text not null default 'cash' check (payment_method in ('cash','transfer','card','mercado_pago','other')),
  amount numeric(14,2) not null check (amount > 0),
  reference_id uuid,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists cash_movements_register_idx on public.cash_movements(cash_register_id, created_at);

alter table public.audit_events enable row level security;
alter table public.cash_registers enable row level security;
alter table public.cash_movements enable row level security;

create or replace function public.is_pet_shop_member(target_shop uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists(select 1 from public.pet_shop_memberships m where m.pet_shop_id = target_shop and m.user_id = auth.uid());
$$;
create or replace function public.can_manage_pet_shop(target_shop uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists(select 1 from public.pet_shops s where s.id = target_shop and s.owner_user_id = auth.uid())
      or exists(select 1 from public.pet_shop_memberships m where m.pet_shop_id = target_shop and m.user_id = auth.uid() and m.role in ('owner','manager','admin'));
$$;
grant execute on function public.is_pet_shop_member(uuid) to authenticated;
grant execute on function public.can_manage_pet_shop(uuid) to authenticated;

create policy audit_events_manager_read on public.audit_events for select to authenticated using (public.can_manage_pet_shop(pet_shop_id));
create policy cash_registers_manager_read on public.cash_registers for select to authenticated using (public.can_manage_pet_shop(pet_shop_id));
create policy cash_movements_manager_read on public.cash_movements for select to authenticated using (public.can_manage_pet_shop(pet_shop_id));

create or replace function public.write_audit_event(p_pet_shop_id uuid, p_action text, p_entity_type text, p_entity_id text default null, p_before_data jsonb default null, p_after_data jsonb default null, p_metadata jsonb default '{}'::jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare event_id uuid;
begin
  if not public.can_manage_pet_shop(p_pet_shop_id) then raise exception 'not_authorized'; end if;
  insert into public.audit_events(pet_shop_id, actor_user_id, action, entity_type, entity_id, before_data, after_data, metadata)
  values(p_pet_shop_id, auth.uid(), trim(p_action), trim(p_entity_type), p_entity_id, p_before_data, p_after_data, coalesce(p_metadata,'{}'::jsonb)) returning id into event_id;
  return event_id;
end; $$;
grant execute on function public.write_audit_event(uuid,text,text,text,jsonb,jsonb,jsonb) to authenticated;

create or replace function public.open_cash_register(p_pet_shop_id uuid, p_opening_amount numeric default 0) returns public.cash_registers
language plpgsql security definer set search_path = public as $$
declare result public.cash_registers;
begin
  if not public.can_manage_pet_shop(p_pet_shop_id) then raise exception 'not_authorized'; end if;
  if p_opening_amount < 0 then raise exception 'opening_amount_must_be_positive'; end if;
  insert into public.cash_registers(pet_shop_id,opened_by,opening_amount) values(p_pet_shop_id,auth.uid(),p_opening_amount) returning * into result;
  perform public.write_audit_event(p_pet_shop_id,'cash_opened','cash_register',result.id::text,null,to_jsonb(result)); return result;
exception when unique_violation then raise exception 'cash_register_already_open';
end; $$;
grant execute on function public.open_cash_register(uuid,numeric) to authenticated;

create or replace function public.record_cash_movement(p_pet_shop_id uuid, p_register_id uuid, p_type text, p_payment_method text, p_amount numeric, p_reference_id uuid default null, p_note text default null) returns public.cash_movements
language plpgsql security definer set search_path = public as $$
declare result public.cash_movements; register_row public.cash_registers;
begin
  if not public.can_manage_pet_shop(p_pet_shop_id) then raise exception 'not_authorized'; end if;
  select * into register_row from public.cash_registers where id=p_register_id and pet_shop_id=p_pet_shop_id and status='open' for update;
  if not found then raise exception 'open_cash_register_not_found'; end if;
  if p_amount <= 0 then raise exception 'amount_must_be_positive'; end if;
  insert into public.cash_movements(pet_shop_id,cash_register_id,created_by,movement_type,payment_method,amount,reference_id,note)
  values(p_pet_shop_id,p_register_id,auth.uid(),p_type,p_payment_method,p_amount,p_reference_id,p_note) returning * into result;
  perform public.write_audit_event(p_pet_shop_id,'cash_movement_recorded','cash_movement',result.id::text,null,to_jsonb(result)); return result;
end; $$;
grant execute on function public.record_cash_movement(uuid,uuid,text,text,numeric,uuid,text) to authenticated;

create or replace function public.close_cash_register(p_pet_shop_id uuid, p_register_id uuid, p_counted_cash numeric, p_note text default null) returns public.cash_registers
language plpgsql security definer set search_path = public as $$
declare result public.cash_registers; register_row public.cash_registers; expected numeric;
begin
  if not public.can_manage_pet_shop(p_pet_shop_id) then raise exception 'not_authorized'; end if;
  if p_counted_cash < 0 then raise exception 'counted_cash_must_be_positive'; end if;
  select * into register_row from public.cash_registers where id=p_register_id and pet_shop_id=p_pet_shop_id and status='open' for update;
  if not found then raise exception 'open_cash_register_not_found'; end if;
  select register_row.opening_amount + coalesce(sum(case when movement_type in ('sale','cash_in') and payment_method='cash' then amount when movement_type in ('cash_out','refund') and payment_method='cash' then -amount else 0 end),0) into expected from public.cash_movements where cash_register_id=p_register_id;
  update public.cash_registers set closed_at=now(),closed_by=auth.uid(),expected_cash=expected,counted_cash=p_counted_cash,difference=p_counted_cash-expected,status='closed',closing_note=p_note where id=p_register_id returning * into result;
  perform public.write_audit_event(p_pet_shop_id,'cash_closed','cash_register',result.id::text,to_jsonb(register_row),to_jsonb(result),jsonb_build_object('difference',result.difference)); return result;
end; $$;
grant execute on function public.close_cash_register(uuid,uuid,numeric,text) to authenticated;
revoke all on function public.write_audit_event(uuid,text,text,text,jsonb,jsonb,jsonb) from anon;
revoke all on function public.open_cash_register(uuid,numeric) from anon;
revoke all on function public.record_cash_movement(uuid,uuid,text,text,numeric,uuid,text) from anon;
revoke all on function public.close_cash_register(uuid,uuid,numeric,text) from anon;
