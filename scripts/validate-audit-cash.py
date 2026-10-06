from pathlib import Path
from sys import exit

migration = Path(__file__).parents[1] / "supabase" / "migrations" / "0002_audit_cash.sql"
sql = migration.read_text(encoding="utf-8")
required = [
    "create table if not exists public.audit_events",
    "create table if not exists public.cash_registers",
    "create table if not exists public.cash_movements",
    "enable row level security",
    "create or replace function public.write_audit_event",
    "create or replace function public.open_cash_register",
    "create or replace function public.record_cash_movement",
    "create or replace function public.close_cash_register",
    "create policy audit_events_manager_read",
    "create policy cash_registers_manager_read",
    "create policy cash_movements_manager_read",
]
missing = [item for item in required if item not in sql.lower()]
if missing:
    print("Faltan elementos:", *missing, sep="\n- ")
    exit(1)
statements = [part for part in sql.split(";") if part.strip()]
print(f"Migración validada: {len(statements)} sentencias y todos los elementos requeridos están presentes.")
