# Auditoría, caja y cierres

La migración `supabase/migrations/0002_audit_cash.sql` agrega tres entidades aisladas por negocio:

- `audit_events`: historial inmutable de acciones, usuario, entidad, estado anterior y posterior.
- `cash_registers`: apertura, turno activo, efectivo esperado, efectivo contado, diferencia y cierre.
- `cash_movements`: ingresos, retiros, ventas y devoluciones asociados a una caja.

Todas tienen **Row Level Security**. Sólo propietario o encargado pueden consultar auditoría y caja. Las escrituras se realizan mediante RPC protegidas: `open_cash_register`, `record_cash_movement`, `close_cash_register` y `write_audit_event`. No se conceden escrituras directas al navegador ni permisos a `anon`.

## Aplicación

1. Abrir el proyecto Supabase correspondiente.
2. Ejecutar la migración después de la migración base de PetFlow.
3. Verificar que `pet_shop_memberships` tenga `role` y que sus valores incluyan `owner`, `manager` o `admin`.
4. Confirmar que las políticas RLS estén activas.
5. Ingresar a PetFlow y abrir **Caja y cierres**.

La aplicación no inserta datos de prueba automáticamente. Si la migración todavía no se aplicó, la pantalla mostrará el error de Supabase sin alterar ventas ni inventario.
