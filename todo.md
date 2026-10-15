# PetFlow — mejoras solicitadas

- [x] Aumento general de precios desde Administración, con porcentaje, categoría y vista previa.
- [x] Panel de roles para miembros existentes, protegido visualmente para el propietario.
- [x] Migración y RPC de permisos para que el control también se aplique en Supabase.
- [x] Generación de reporte diario compatible con Excel mediante CSV UTF-8.
- [x] Implementar endpoint de diagnóstico automático protegido por cron, con notificación al propietario y pruebas no destructivas.
- [x] Activar Heartbeat diario sobre la URL publicada; las alertas se entregan por el canal del propietario. El correo SMTP/transaccional personal queda como integración opcional pendiente de proveedor.
- [x] Implementar Mi caja: apertura, ingresos, retiros, efectivo esperado y cierre con diferencia.
- [ ] Aplicar la migración `0005_cash_registers.sql` en Supabase antes de operar con datos reales.
- [x] Validar TypeScript, pruebas y build parcial.
