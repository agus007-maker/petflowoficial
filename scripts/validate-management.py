from pathlib import Path

migration = Path(__file__).parents[1] / "supabase" / "migrations" / "0003_management_tools.sql"
text = migration.read_text(encoding="utf-8")
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
print(f"Migración de administración válida: {len(required)} controles encontrados.")
