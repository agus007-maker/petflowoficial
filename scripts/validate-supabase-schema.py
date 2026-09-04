from pathlib import Path
from sys import exit

from pglast import parse_sql


schema_path = Path(__file__).parents[1] / "supabase" / "migrations" / "0001_petflow_schema.sql"
schema = schema_path.read_text(encoding="utf-8")

required_fragments = [
    "create table public.profiles",
    "create table public.pet_shops",
    "create table public.products",
    "create table public.clients",
    "create table public.pets",
    "create table public.sales",
    "create table public.sale_items",
    "create table public.appointments",
    "create table public.notification_settings",
    "create table public.notifications",
    "create or replace function public.create_sale",
    "create or replace function public.create_appointment_with_new_client",
    "create or replace function public.process_due_reminders",
    "enable row level security",
    "grant execute on function public.create_sale",
]

missing = [fragment for fragment in required_fragments if fragment not in schema]
if missing:
    print("Faltan protecciones o entidades requeridas:", *missing, sep="\n- ")
    exit(1)

try:
    statements = parse_sql(schema)
except Exception as error:
    print(f"La migración no es SQL PostgreSQL válido: {error}")
    exit(1)

print(f"Migración válida: {len(statements)} sentencias PostgreSQL analizadas.")
