-- PetFlow: roles/permisos, aumento masivo de precios y base para reportes.
-- Aplicar después del esquema principal de PetFlow.

alter table public.pet_shop_memberships
  add column if not exists role text not null default 'staff',
  add column if not exists permissions jsonb not null default '{}'::jsonb;

alter table public.pet_shop_memberships
  drop constraint if exists pet_shop_memberships_role_check;

alter table public.pet_shop_memberships
  add constraint pet_shop_memberships_role_check
  check (role in ('owner', 'manager', 'staff', 'viewer'));

create index if not exists pet_shop_memberships_shop_role_idx
  on public.pet_shop_memberships (pet_shop_id, role);

create table if not exists public.pet_shop_role_permissions (
  pet_shop_id uuid not null references public.pet_shops(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'staff', 'viewer')),
  permission text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (pet_shop_id, role, permission)
);

alter table public.pet_shop_role_permissions enable row level security;

create or replace function public.current_pet_shop_role(p_shop_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.pet_shop_memberships
  where pet_shop_id = p_shop_id and user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.current_pet_shop_role(uuid) to authenticated;

create or replace function public.has_pet_shop_permission(p_shop_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pet_shop_memberships m
    left join public.pet_shop_role_permissions rp
      on rp.pet_shop_id = m.pet_shop_id
      and rp.role = m.role
      and rp.permission = p_permission
      and rp.enabled = true
    where m.pet_shop_id = p_shop_id
      and m.user_id = auth.uid()
      and (m.role = 'owner' or coalesce((m.permissions ->> p_permission)::boolean, false) or rp.permission is not null)
  );
$$;

grant execute on function public.has_pet_shop_permission(uuid, text) to authenticated;

create or replace function public.change_pet_shop_member_role(
  p_pet_shop_id uuid,
  p_membership_id uuid,
  p_role text,
  p_permissions jsonb default '{}'::jsonb
)
returns public.pet_shop_memberships
language plpgsql
security definer
set search_path = public
as $$
declare changed public.pet_shop_memberships;
begin
  if p_role not in ('owner', 'manager', 'staff', 'viewer') then
    raise exception 'Rol inválido';
  end if;
  if not public.has_pet_shop_permission(p_pet_shop_id, 'manage_roles') then
    raise exception 'No tenés permiso para administrar roles';
  end if;
  update public.pet_shop_memberships
    set role = p_role, permissions = coalesce(p_permissions, '{}'::jsonb)
    where id = p_membership_id and pet_shop_id = p_pet_shop_id
    returning * into changed;
  if changed.id is null then raise exception 'Membresía inexistente'; end if;
  return changed;
end;
$$;

grant execute on function public.change_pet_shop_member_role(uuid, uuid, text, jsonb) to authenticated;

create or replace function public.apply_price_increase(
  p_pet_shop_id uuid,
  p_percent numeric,
  p_category text default null,
  p_scope text default 'active'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare affected integer;
begin
  if p_percent <= 0 or p_percent > 1000 then raise exception 'El porcentaje debe estar entre 0 y 1000'; end if;
  if p_scope not in ('active', 'all') then raise exception 'Alcance inválido'; end if;
  if not public.has_pet_shop_permission(p_pet_shop_id, 'manage_prices') then
    raise exception 'No tenés permiso para modificar precios';
  end if;
  update public.products
    set sale_price = round((sale_price * (1 + p_percent / 100))::numeric, 2)
    where pet_shop_id = p_pet_shop_id
      and (p_scope = 'all' or active = true)
      and (p_category is null or category = p_category);
  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant execute on function public.apply_price_increase(uuid, numeric, text, text) to authenticated;

insert into public.pet_shop_role_permissions (pet_shop_id, role, permission)
select s.id, roles.role, permissions.permission
from public.pet_shops s
cross join (values ('manager'), ('staff'), ('viewer')) as roles(role)
cross join (values ('view_reports'), ('view_inventory')) as permissions(permission)
on conflict do nothing;

create policy pet_shop_role_permissions_owner_read
  on public.pet_shop_role_permissions for select
  using (public.has_pet_shop_permission(pet_shop_id, 'manage_roles'));

create policy pet_shop_role_permissions_owner_write
  on public.pet_shop_role_permissions for all
  using (public.has_pet_shop_permission(pet_shop_id, 'manage_roles'))
  with check (public.has_pet_shop_permission(pet_shop_id, 'manage_roles'));
