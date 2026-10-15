from pathlib import Path

migration = Path(__file__).parents[1] / "supabase" / "migrations" / "0003_management_tools.sql"
text = migration.read_text(encoding="utf-8")
diagnostics_migration = Path(__file__).parents[1] / "supabase" / "migrations" / "0004_system_diagnostics.sql"
diagnostics_text = diagnostics_migration.read_text(encoding="utf-8")
cash_migration = Path(__file__).parents[1] / "supabase" / "migrations" / "0005_cash_registers.sql"
cash_text = cash_migration.read_text(encoding="utf-8")
required = [
    "pet_shop_memberships",
    "permissions jsonb",
    "current_pet_shop_role",
    "has_pet_shop_permission",
    "change_pet_shop_member_role",
    "apply_price_increase",
    "manage_prices",
    "manage_roles",
    "enable row level security",
]
missing = [fragment for fragment in required if fragment not in text]
if missing:
    raise SystemExit("Faltan fragmentos de administración: " + ", ".join(missing))
diagnostics_required = [
    "system_diagnostic_runs",
    "task_uid",
    "notification_sent",
    "enable row level security",
    "nitsugamon@gmail.com",
]
diagnostics_missing = [fragment for fragment in diagnostics_required if fragment not in diagnostics_text]
if diagnostics_missing:
    raise SystemExit("Faltan fragmentos del historial de diagnósticos: " + ", ".join(diagnostics_missing))
print(f"Migraciones de administración válidas: {len(required) + len(diagnostics_required)} controles encontrados.")
cash_required = ["cash_registers", "cash_movements", "open_cash_register", "add_cash_movement", "close_cash_register", "one_open_per_shop", "enable row level security"]
cash_missing = [fragment for fragment in cash_required if fragment not in cash_text]
if cash_missing:
    raise SystemExit("Faltan fragmentos de caja: " + ", ".join(cash_missing))
print(f"Migración de caja válida: {len(cash_required)} controles encontrados.")
