# PetFlow — mejoras solicitadas

- [x] Aumento general de precios desde Administración, con porcentaje, categoría y vista previa.
- [x] Panel de roles para miembros existentes, protegido visualmente para el propietario.
- [x] Migración y RPC de permisos para que el control también se aplique en Supabase.
- [x] Generación de reporte diario compatible con Excel mediante CSV UTF-8.
- [x] Implementar endpoint de diagnóstico automático protegido por cron, con notificación al propietario y pruebas no destructivas.
- [x] Activar Heartbeat diario sobre la URL publicada; las alertas se entregan por el canal del propietario. El correo SMTP/transaccional personal queda como integración opcional pendiente de proveedor.
- [x] Implementar Mi caja: apertura, ingresos, retiros, efectivo esperado y cierre con diferencia.
- [x] Verificar técnicamente en Supabase que las tablas reales de caja (`cash_registers`, `cash_sessions`, `cash_movements`) están aplicadas y protegidas con RLS.
- [x] Agregar `pnpm validate:cash`, verificador no destructivo de tablas y RPC de caja.
- [x] Validar TypeScript, pruebas y build parcial.
- [x] Implementar acceso inicial por correo y accesos siguientes con nombre de usuario y contraseña de Supabase Auth.
- [x] Aplicar `0006_login_names.sql` en Supabase y configurar/verificar el secreto server-side `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Resolver la alerta crítica de Supabase en `public.products`: activar RLS sólo después de definir y revisar sus políticas por negocio.
