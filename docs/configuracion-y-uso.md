# Puesta en marcha y uso de PetFlow

## Configuración de Supabase

Creá un proyecto en Supabase y aplicá, una única vez, el contenido de `supabase/migrations/0001_petflow_schema.sql` desde el editor SQL. El archivo incorpora tablas, restricciones, políticas RLS, funciones atómicas y disparadores. La validación local comprueba que su sintaxis corresponda a PostgreSQL; la aplicación de DDL requiere el editor SQL, la CLI de Supabase o una integración de administración autorizada.

| Variable | Dónde se usa | Regla de manejo |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente y servidor de Next.js. | Puede estar disponible en el navegador. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Cliente autenticado de Supabase. | Puede estar disponible en el navegador porque RLS limita cada fila. |
| `NEXT_PUBLIC_APP_URL` | URL pública usada para enlaces de acceso enviados por correo. | Debe ser la URL HTTPS de producción, sin `/` final. |
| `SUPABASE_SERVICE_ROLE_KEY` | Importación y ejecución de avisos desde servidor. | Nunca incluirla en una variable pública, repositorio o código de cliente. |
| `REMINDER_JOB_SECRET` | Opcional, para un endpoint de cron externo. | Guardarla sólo en el entorno de servidor. |

Para el entorno de producción, cargá nuevamente las variables desde la configuración segura del proveedor donde publiques el proyecto. Definí `NEXT_PUBLIC_APP_URL` con la URL HTTPS pública. En Supabase, configurá esa URL como **Site URL** y agregá `https://<tu-dominio>/auth/callback` a la lista de URL de redirección. Conservá `http://localhost:3000/auth/callback` únicamente si seguirás probando en local. La aplicación incluye esa ruta callback y ya no depende del host desde el que se inició el formulario.

## Acceso y aislamiento

Al iniciar sesión por primera vez, el disparador de Supabase crea el perfil. Luego PetFlow solicita el nombre del negocio: la creación genera el pet shop, su membresía de propietario y las preferencias de avisos. Cada tabla operativa se filtra por `pet_shop_id`; las políticas RLS verifican la membresía usando la identidad autenticada. Los usuarios no pueden consultar ni modificar filas de otro pet shop.[1]

## Uso cotidiano

Desde **Inventario** se crean artículos y se editan nombre, SKU, categoría, precios, stock, mínimo y estado. Los botones de suma y resta invocan un procedimiento que rechaza cualquier ajuste que resulte en stock negativo. En **Punto de venta**, se prepara la compra y se confirma mediante una función que bloquea los productos, verifica existencias, registra venta y líneas, y descuenta stock dentro de una única transacción. El ticket aparece en seguida, puede imprimirse o descargarse en PDF, y queda disponible nuevamente desde **Ventas**.

En **Agenda**, la opción **Nuevo cliente y mascota** permite crear las tres entidades —tutor, mascota y turno— de forma atómica. De ese modo se evita abandonar la agenda o cargar datos duplicados. Los cambios de estado generan un aviso interno. La sección **Alertas** permite definir si se recordarán los turnos y con cuánta anticipación.

## Recordatorios

La función `process_due_reminders` consulta los turnos elegibles, establece `reminder_sent_at` antes de crear el aviso y sólo procesa los estados programado o confirmado. Esta secuencia la vuelve idempotente ante reintentos. El proyecto implementa `POST /api/scheduled/reminders`; sólo acepta la cabecera `x-reminder-secret` con el valor de `REMINDER_JOB_SECRET` y, desde el servidor, invoca la función con `SUPABASE_SERVICE_ROLE_KEY`. No debe llamarse desde el navegador.

Después de publicar la aplicación, configurá el programador de tu plataforma para ejecutar una solicitud `POST` cada 15 minutos a `https://<tu-dominio>/api/scheduled/reminders`, con `x-reminder-secret: <REMINDER_JOB_SECRET>`. Antes de activarlo, aplicá la migración y verificá un turno próximo en una copia de datos o entorno de prueba. El ZIP recuperado ya tenía el mismo intervalo lógico, pero no incluía una programación operativa ni datos para importar.

## Importación de datos existentes

El archivo recuperado contiene migraciones y código, pero no datos de clientes, productos, inventario ni ventas. Por eso no se ejecutó una importación real. Si contás con un volcado JSON del sistema anterior, adaptalo al siguiente formato y ejecutá el script únicamente desde una terminal segura:

```json
{
  "petShop": { "name": "Patitas del Sur", "timezone": "America/Argentina/Buenos_Aires" },
  "products": [{ "id": 1, "name": "Alimento", "category": "Alimentos", "stock": 8, "salePrice": 12000 }],
  "clients": [{ "id": 10, "fullName": "Ana Pérez" }],
  "pets": [{ "id": 20, "clientId": 10, "name": "Mora", "species": "Perro" }],
  "sales": [],
  "saleItems": [],
  "appointments": [],
  "notifications": []
}
```

Usá el identificador UUID del usuario ya creado en `auth.users` y ejecutá `IMPORT_OWNER_USER_ID=<uuid> pnpm import:legacy /ruta/legado.json`. El script conserva el stock final del volcado; por ello importa ventas y líneas directamente sin volver a descontar existencias. Antes de una carga definitiva, probalo sobre una copia de la base y revisá el resumen que produce.

## Validación local

Ejecutá `pnpm validate:supabase`, `pnpm test`, `pnpm check` y `pnpm build`. La suite incluye conectividad de credenciales, sintaxis y elementos de seguridad del esquema, preparación de venta, validación de productos, vínculo cliente-mascota, alta rápida y convenciones de ticket. La migración incorpora `supabase/tests/petflow_rls.test.sql`: ejecutalo con `supabase test db` en un entorno local de Supabase para comprobar que el propietario puede operar su pet shop, que otros usuarios no acceden a sus filas y que las ventas sólo se crean mediante la función RPC.[1]

## Referencias

[1]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase Docs: Row Level Security"
[2]: https://supabase.com/docs/guides/database/functions "Supabase Docs: Database Functions"
[3]: https://supabase.com/docs/guides/auth/server-side/creating-a-client "Supabase Docs: Creating a Supabase client for SSR"
