-- PetFlow: registro global de diagnósticos automáticos del Heartbeat.
-- Los inserts los realiza exclusivamente el servidor con service_role.
-- La lectura queda limitada al creador del proyecto mediante el email verificado de Auth.

create table if not exists public.system_diagnostic_runs (
  id uuid primary key default gen_random_uuid(),
  task_uid text not null,
  checked_at timestamptz not null default now(),
  status text not null check (status in ('ok', 'failed')),
  checks jsonb not null default '[]'::jsonb,
  notification_sent boolean not null default false,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists system_diagnostic_runs_checked_at_idx
  on public.system_diagnostic_runs (checked_at desc);

alter table public.system_diagnostic_runs enable row level security;

create policy system_diagnostic_runs_creator_read
  on public.system_diagnostic_runs for select
  using ((auth.jwt() ->> 'email') = 'nitsugamon@gmail.com');

revoke all on public.system_diagnostic_runs from anon;
grant select on public.system_diagnostic_runs to authenticated;
