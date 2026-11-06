-- Acceso persistente: el correo se usa para el alta inicial y el nombre de usuario para los accesos siguientes.
create table if not exists public.user_login_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_login_profiles_username_format check (username ~ '^[a-z0-9][a-z0-9._-]{2,31}$')
);

create unique index if not exists user_login_profiles_username_lower_idx
  on public.user_login_profiles (lower(username));

alter table public.user_login_profiles enable row level security;

create policy user_login_profiles_self_read
  on public.user_login_profiles for select
  using (user_id = auth.uid());

create or replace function public.touch_user_login_profile_updated_at()
returns trigger language plpgsql security invoker set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_login_profiles_touch_updated_at on public.user_login_profiles;
create trigger user_login_profiles_touch_updated_at
before update on public.user_login_profiles
for each row execute function public.touch_user_login_profile_updated_at();
