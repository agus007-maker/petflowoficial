-- PetFlow: nombres de usuario únicos por persona para iniciar sesión.
-- El correo de Supabase Auth sigue siendo el contacto de recuperación.

create table if not exists public.petflow_login_names (
  user_id uuid primary key references auth.users(id) on delete cascade,
  login_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint petflow_login_names_format_check
    check (login_name ~ '^[a-z0-9][a-z0-9._-]{2,29}$')
);

create unique index if not exists petflow_login_names_login_name_unique
  on public.petflow_login_names (lower(login_name));

alter table public.petflow_login_names enable row level security;
revoke all on public.petflow_login_names from anon, authenticated;

create or replace function public.set_petflow_login_name(p_login_name text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_login_name text := lower(trim(coalesce(p_login_name, '')));
begin
  if v_user_id is null then
    raise exception 'Iniciá sesión para elegir un nombre de usuario';
  end if;
  if v_login_name !~ '^[a-z0-9][a-z0-9._-]{2,29}$' then
    raise exception 'Usá de 3 a 30 caracteres: letras sin tilde, números, punto, guion o guion bajo';
  end if;

  insert into public.petflow_login_names (user_id, login_name, updated_at)
  values (v_user_id, v_login_name, now())
  on conflict (user_id) do update
    set login_name = excluded.login_name,
        updated_at = now();

  return v_login_name;
exception
  when unique_violation then
    raise exception 'Ese nombre de usuario ya está en uso. Elegí otro';
end;
$$;

revoke all on function public.set_petflow_login_name(text) from public, anon;
grant execute on function public.set_petflow_login_name(text) to authenticated;

-- Solo una función de servidor con service_role puede traducir el alias a correo.
-- No expone emails a anon/authenticated ni por una consulta directa a la tabla.
create or replace function public.resolve_petflow_login_email(p_login_name text)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.email
  from public.petflow_login_names n
  join auth.users u on u.id = n.user_id
  where lower(n.login_name) = lower(trim(coalesce(p_login_name, '')))
    and u.email is not null
  limit 1;
$$;

revoke all on function public.resolve_petflow_login_email(text) from public, anon, authenticated;
grant execute on function public.resolve_petflow_login_email(text) to service_role;


-- Rate limit durable del endpoint de login por alias. Solo guarda claves HMAC,
-- nunca IPs, correos ni nombres de usuario en claro.
create table if not exists public.petflow_login_attempt_buckets (
  bucket_hash text primary key,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0)
);

alter table public.petflow_login_attempt_buckets enable row level security;
revoke all on public.petflow_login_attempt_buckets from anon, authenticated;

create or replace function public.consume_petflow_alias_login_attempt(
  p_ip_bucket_hash text,
  p_login_bucket_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_bucket text;
  v_limit integer;
  v_attempts integer;
  v_allowed boolean := true;
begin
  if p_ip_bucket_hash !~ '^[a-f0-9]{64}$' or p_login_bucket_hash !~ '^[a-f0-9]{64}$' then
    return false;
  end if;

  for v_bucket, v_limit in
    select * from (values (p_ip_bucket_hash, 60), (p_login_bucket_hash, 10)) as limits(bucket_hash, max_attempts)
  loop
    insert into public.petflow_login_attempt_buckets (bucket_hash, window_started_at, attempts)
    values (v_bucket, now(), 1)
    on conflict (bucket_hash) do update
      set attempts = case
            when public.petflow_login_attempt_buckets.window_started_at <= now() - interval '15 minutes' then 1
            else public.petflow_login_attempt_buckets.attempts + 1
          end,
          window_started_at = case
            when public.petflow_login_attempt_buckets.window_started_at <= now() - interval '15 minutes' then now()
            else public.petflow_login_attempt_buckets.window_started_at
          end
    returning attempts into v_attempts;

    if v_attempts > v_limit then
      v_allowed := false;
    end if;
  end loop;

  if random() < 0.01 then
    delete from public.petflow_login_attempt_buckets
    where window_started_at < now() - interval '1 day';
  end if;
  return v_allowed;
end;
$$;

create or replace function public.clear_petflow_alias_login_attempt(
  p_ip_bucket_hash text,
  p_login_bucket_hash text
)
returns void
language sql
security definer
set search_path = public, auth
as $$
  delete from public.petflow_login_attempt_buckets
  where bucket_hash in (p_ip_bucket_hash, p_login_bucket_hash);
$$;

revoke all on function public.consume_petflow_alias_login_attempt(text, text) from public, anon, authenticated;
revoke all on function public.clear_petflow_alias_login_attempt(text, text) from public, anon, authenticated;
grant execute on function public.consume_petflow_alias_login_attempt(text, text) to service_role;
grant execute on function public.clear_petflow_alias_login_attempt(text, text) to service_role;
