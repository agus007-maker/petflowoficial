# Verificación de PetFlow

La validación se realizó sobre el proyecto Next.js con las credenciales de Supabase configuradas. Las claves de conexión respondieron correctamente contra el endpoint de autenticación; no se expusieron sus valores. La migración `0001_petflow_schema.sql` fue analizada como SQL PostgreSQL válido y la prueba de estructura verifica que existan RLS, índices y las funciones RPC que cubren ventas y turnos.

| Comprobación | Resultado | Evidencia |
| --- | --- | --- |
| Conectividad de Supabase | Correcta | `server/supabase.credentials.test.ts` valida clave publicable y clave de servicio. |
| Endpoint de recordatorios | Correcto | `app/api/scheduled/reminders/route.test.ts` acepta el secreto de servidor y rechaza solicitudes no autorizadas. |
| Reglas de dominio | Correcta | 12 pruebas Vitest aprobadas: ventas, stock, productos, cliente-mascota, tickets, credenciales y esquema. |
| Tipos y compilación | Correcta | `pnpm check` y `NODE_ENV=production pnpm build` aprobados. |
| Acceso visual de escritorio y móvil | Correcto | Se comprobó la pantalla de acceso con el formulario de enlace mágico, tipografía, contraste y adaptación al viewport móvil. |
| Esquema y RLS en Supabase | Pendiente de ejecución remota | `supabase/tests/petflow_rls.test.sql` está preparado para ejecutarse con `supabase test db`. |
| Flujos autenticados y carga real | Pendiente de ejecución remota | Requiere aplicar la migración, iniciar sesión y disponer de datos operativos; el ZIP no contenía datos para importar. |

La integración administrativa de Supabase disponible en la sesión no fue autorizada, por lo que no se aplicó DDL ni se insertaron datos de prueba en el proyecto remoto. Esta decisión evita modificar la base del usuario sin una confirmación explícita. Una vez aplicada la migración, se deben recorrer los flujos de cliente nuevo desde turno, edición de inventario, venta, historial y descarga de ticket.
