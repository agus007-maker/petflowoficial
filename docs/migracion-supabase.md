# Migración de PetFlow a Supabase PostgreSQL

## Estado actual

PetFlow usa Drizzle ORM con `postgres-js` y PostgreSQL de Supabase. La conexión se lee desde el secreto del servidor `SUPABASE_DATABASE_URL`; `DATABASE_URL` queda como respaldo para entornos locales compatibles. Ninguna credencial debe entrar al repositorio ni al frontend.

La migración inicial se generó en `drizzle/supabase/0000_magical_ares.sql` y se aplicó con:

```bash
pnpm db:migrate
```

El esquema crea nueve tablas propias con prefijo `petflow_`:

- `petflow_users`
- `petflow_products`
- `petflow_clients`
- `petflow_pets`
- `petflow_sales`
- `petflow_sale_items`
- `petflow_appointments`
- `petflow_notification_settings`
- `petflow_notifications`

También crea los enums PostgreSQL para roles, medios de pago, estados de turnos y tipos de aviso, además de `petflow_drizzle_migrations` para el historial de Drizzle.

El prefijo es intencional: evita modificar o reutilizar tablas existentes de Supabase, incluida una tabla `products` que ya estaba presente. La migración no contiene `DROP TABLE`, `TRUNCATE`, `ALTER TABLE` sobre tablas ajenas ni inserciones de datos de prueba.

## Configuración del entorno

Configurar el secreto en el hosting y en el entorno local seguro:

```text
SUPABASE_DATABASE_URL=postgresql://.../postgres?sslmode=require
```

Se recomienda usar la cadena del pooler de Supabase para la aplicación desplegada y mantener `sslmode=require`. La cadena exacta se copia desde Supabase en **Connect → Connection string**; no se documenta aquí para evitar publicar credenciales.

Comandos disponibles:

```bash
# Genera una nueva migración a partir de drizzle/schema.ts
pnpm db:generate

# Aplica las migraciones pendientes a Supabase
pnpm db:migrate

# Ejecuta consultas read-only sobre Dashboard, Inventario, Clientes, Agenda y Alertas
pnpm db:verify

# Atajo de generación + aplicación
pnpm db:push
```

`drizzle.config.ts` usa `drizzle/supabase` como carpeta de salida y la tabla de historial `petflow_drizzle_migrations`, para no mezclar los artefactos históricos del esquema MySQL.

## Datos históricos

La migración aplicada es de estructura y deja preparada la base de Supabase. No copia automáticamente filas desde la base MySQL/TiDB anterior: hacerlo sin un mapeo explícito podría duplicar usuarios, romper claves foráneas o mezclar la tabla `products` que ya existía en Supabase.

Si se decide importar datos históricos, hacerlo en una ventana controlada y siguiendo este orden:

1. Exportar desde la base anterior solo las tablas de PetFlow y conservar una copia de respaldo.
2. Mapear usuarios por `openId`, no por el `id` numérico, en `petflow_users`.
3. Importar clientes y mascotas después de resolver el `ownerUserId` de cada usuario.
4. Importar productos a `petflow_products`; no escribir en la tabla ajena `products`.
5. Importar ventas, líneas de venta y turnos respetando las relaciones y fechas UTC.
6. Importar configuración y avisos solo si son necesarios; los recordatorios pendientes pueden recalcularse desde la agenda.
7. Validar conteos, totales, stock no negativo y relaciones antes de abrir el tráfico de producción.

Para una importación real se debe generar primero un archivo de mapeo y revisar sus conteos. No se debe ejecutar una carga masiva directamente contra producción sin respaldo y sin una comprobación de claves foráneas.

## Recordatorios automáticos

Los avisos de turnos continúan usando el endpoint `/api/scheduled/appointment-reminders`. El callback consulta `petflow_notification_settings` y `petflow_appointments`, registra el aviso en `petflow_notifications` y marca `reminderSentAt` en la misma base de Supabase. El job de Heartbeat no almacena datos de negocio: solo conserva su `taskUid` en `petflow_notification_settings`.

Para comprobar el flujo operativo:

1. Iniciar sesión en PetFlow.
2. Revisar o guardar la configuración de avisos.
3. Activar los recordatorios automáticos desde **Alertas**.
4. Confirmar que el `taskUid` se guarda en Supabase y que el job apunta a `/api/scheduled/appointment-reminders`.
5. Revisar la tabla de avisos desde la interfaz de PetFlow, no exponiendo la conexión de Supabase al navegador.

## Operación y seguridad

La aplicación consulta Supabase exclusivamente desde el servidor. La clave de conexión nunca debe comenzar con `VITE_` y no debe copiarse a `client/`, `.env` versionado, capturas, logs ni documentación. Para revisar datos y backups se utiliza el panel de Supabase; para cambiar el esquema se versiona `drizzle/schema.ts`, se genera la SQL, se revisa y recién después se ejecuta `pnpm db:migrate`.
