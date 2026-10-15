# Administración y reportes de PetFlow

## Aumento general de precios

El propietario encuentra **Administración → Aumento de precios**. Puede elegir un porcentaje, limitarlo a productos activos y filtrar por categoría. PetFlow muestra una vista previa antes de aplicar el cambio. La operación final se ejecuta mediante `apply_price_increase`, que valida el porcentaje, el negocio y el permiso `manage_prices` en Supabase.

## Roles y permisos

El panel **Roles y permisos** sólo aparece para el propietario del negocio. La migración `0003_management_tools.sql` agrega roles `owner`, `manager`, `staff` y `viewer`, además de permisos personalizados por membresía. Los cambios se realizan mediante `change_pet_shop_member_role`; la interfaz no es el mecanismo de seguridad. Aplicar la migración antes de usar esta pantalla en producción.

## Reporte diario

El panel **Reporte diario** genera un CSV UTF-8 separado por punto y coma, compatible con Excel. Incluye resumen de ventas, ingresos, turnos, clientes, detalle de ventas y turnos del día seleccionado.

## Diagnóstico automático y notificaciones

PetFlow incluye el endpoint protegido `POST /api/scheduled/system-diagnostics`. Sólo acepta la identidad de un cron de Manus (`isCron` + `taskUid`) y ejecuta comprobaciones de lectura sobre Node.js, `dist/public/index.html` y el health endpoint de autenticación de Supabase. No crea ventas, no modifica productos y no escribe filas de prueba.

Dentro de **Administración → Diagnóstico** el creador puede actualizar y visualizar los últimos 50 registros: estado general, fecha, tarea, duración y detalle de cada comprobación. La tabla `system_diagnostic_runs` tiene RLS y sólo permite leer al correo creador `nitsugamon@gmail.com`. Aplicar `0004_system_diagnostics.sql` antes de usar la pestaña.

Al terminar, usa el canal de notificaciones del propietario del proyecto para informar el resultado. Si una comprobación falla, el handler devuelve HTTP 502 y el sistema de Heartbeat puede reintentar; si el canal de notificaciones no está disponible, también devuelve HTTP 502. Los errores inesperados incluyen contexto y timestamp para investigación.

Para persistir el historial, el runtime necesita la variable secreta `SUPABASE_SERVICE_ROLE_KEY` (o `SUPABASE_SECRET_KEY`) configurada en el hosting. Nunca debe colocarse en el frontend ni en GitHub. Si falta, el Heartbeat falla de forma explícita en vez de guardar un registro incompleto.

Para dejarlo funcionando todos los días, primero hay que publicar esta versión y confirmar la URL pública. Luego se registra un Heartbeat de proyecto con una expresión UTC de seis campos, por ejemplo `0 0 9 * * *`, apuntando al endpoint anterior. El cron debe crearse desde Manus, no con `setInterval` dentro del servidor, porque el runtime puede apagarse entre ejecuciones.

El canal incluido es una notificación al propietario, no un correo SMTP personal. Para correo electrónico se necesita conectar un proveedor y agregarlo como canal de entrega; no se guardan credenciales de correo en el repositorio.
