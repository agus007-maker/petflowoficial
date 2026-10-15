-- PetFlow: caja por negocio, apertura, movimientos y cierre conciliado.

create table if not exists public.cash_registers (
  id uuid primary key default gen_random_uuid(),
  pet_shop_id uuid not null references public.pet_shops(id) on delete cascade,
  opened_by uuid not null references auth.users(id),
  opened_at timestamptz not null default now(),
  opening_amount numeric(14,2) not null check (opening_amount >= 0),
  closed_by uuid references auth.users(id),
  closed_at timestamptz,
  counted_amount numeric(14,2) check (counted_amount >= 0),
  expected_amount numeric(14,2),
  difference numeric(14,2),
  status text not null default 'open' check (status in ('open', 'closed'))
);

create unique index if not exists cash_registers_one_open_per_shop_idx
  on public.cash_registers (pet_shop_id) where status = 'open';

create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  cash_register_id uuid not null references public.cash_registers(id) on delete cascade,
  pet_shop_id uuid not null references public.pet_shops(id) on delete cascade,
  movement_type text not null check (movement_type in ('cash_in', 'cash_out')),
  amount numeric(14,2) not null check (amount > 0),
  reason text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists cash_movements_register_created_idx
  on public.cash_movements (cash_register_id, created_at);

alter table public.cash_registers enable row level security;
alter table public.cash_movements enable row level security;

create policy cash_registers_member_read
  on public.cash_registers for select
  using (exists (select 1 from public.pet_shop_memberships m where m.pet_shop_id = pet_shop_id and m.user_id = auth.uid()));

create policy cash_movements_member_read
  on public.cash_movements for select
  using (exists (select 1 from public.pet_shop_memberships m where m.pet_shop_id = pet_shop_id and m.user_id = auth.uid()));

create or replace function public.open_cash_register(p_pet_shop_id uuid, p_opening_amount numeric)
returns public.cash_registers
language plpgsql security definer set search_path = public
as $$
declare result public.cash_registers;
begin
  if p_opening_amount < 0 then raise exception 'El monto inicial no puede ser negativo'; end if;
  if not exists (select 1 from public.pet_shop_memberships where pet_shop_id = p_pet_shop_id and user_id = auth.uid() and role <> 'viewer') then
    raise exception 'No tenés permiso para abrir la caja';
  end if;
  insert into public.cash_registers (pet_shop_id, opened_by, opening_amount)
  values (p_pet_shop_id, auth.uid(), p_opening_amount)
  returning * into result;
  return result;
exception when unique_violation then
  raise exception 'Ya existe una caja abierta para este negocio';
end;
$$;

grant execute on function public.open_cash_register(uuid, numeric) to authenticated;

create or replace function public.add_cash_movement(p_cash_register_id uuid, p_movement_type text, p_amount numeric, p_reason text)
returns public.cash_movements
language plpgsql security definer set search_path = public
as $$
declare register_row public.cash_registers; result public.cash_movements;
begin
  select * into register_row from public.cash_registers where id = p_cash_register_id for update;
  if register_row.id is null or register_row.status <> 'open' then raise exception 'La caja no está abierta'; end if;
  if not exists (select 1 from public.pet_shop_memberships where pet_shop_id = register_row.pet_shop_id and user_id = auth.uid() and role <> 'viewer') then
    raise exception 'No tenés permiso para registrar movimientos';
  end if;
  if p_movement_type not in ('cash_in', 'cash_out') or p_amount <= 0 or coalesce(trim(p_reason), '') = '' then raise exception 'Movimiento inválido'; end if;
  insert into public.cash_movements (cash_register_id, pet_shop_id, movement_type, amount, reason, created_by)
  values (p_cash_register_id, register_row.pet_shop_id, p_movement_type, p_amount, trim(p_reason), auth.uid())
  returning * into result;
  return result;
end;
$$;

grant execute on function public.add_cash_movement(uuid, text, numeric, text) to authenticated;

create or replace function public.close_cash_register(p_cash_register_id uuid, p_counted_amount numeric)
returns public.cash_registers
language plpgsql security definer set search_path = public
as $$
declare register_row public.cash_registers; result public.cash_registers; sales_cash numeric := 0; cash_in numeric := 0; cash_out numeric := 0; expected numeric;
begin
  if p_counted_amount < 0 then raise exception 'El efectivo contado no puede ser negativo'; end if;
  select * into register_row from public.cash_registers where id = p_cash_register_id for update;
  if register_row.id is null or register_row.status <> 'open' then raise exception 'La caja no está abierta'; end if;
  if not exists (select 1 from public.pet_shop_memberships where pet_shop_id = register_row.pet_shop_id and user_id = auth.uid() and role <> 'viewer') then
    raise exception 'No tenés permiso para cerrar la caja';
  end if;
  select coalesce(sum(total), 0) into sales_cash from public.sales where pet_shop_id = register_row.pet_shop_id and payment_method = 'cash' and created_at >= register_row.opened_at;
  select coalesce(sum(amount) filter (where movement_type = 'cash_in'), 0), coalesce(sum(amount) filter (where movement_type = 'cash_out'), 0) into cash_in, cash_out from public.cash_movements where cash_register_id = p_cash_register_id;
  expected := register_row.opening_amount + sales_cash + cash_in - cash_out;
  update public.cash_registers set status = 'closed', closed_by = auth.uid(), closed_at = now(), counted_amount = p_counted_amount, expected_amount = expected, difference = p_counted_amount - expected where id = p_cash_register_id returning * into result;
  return result;
end;
$$;

grant execute on function public.close_cash_register(uuid, numeric) to authenticated;
