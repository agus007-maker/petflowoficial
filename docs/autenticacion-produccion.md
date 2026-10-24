# Autenticación de PetFlow en producción

## Causa del enlace con `localhost`

El enlace mágico se construía con `window.location.origin`. Si el formulario se enviaba desde `http://localhost:3000`, Supabase recibía ese origen y lo colocaba en el correo. Un destinatario externo no puede abrir `localhost` porque ese nombre apunta a su propio equipo, no al servidor de PetFlow.

La aplicación usa `VITE_APP_URL` o `NEXT_PUBLIC_APP_URL` para formar el destino público (si no están definidos, usa el origen de la página abierta). El retorno entra por la raíz del sitio; el cliente Supabase procesa el código PKCE o los tokens del enlace y la aplicación presenta la pantalla correspondiente antes de entrar al panel.

## Variables de producción

Configurar en el proveedor donde está publicada la aplicación:

```env
NEXT_PUBLIC_APP_URL=https://petflow.tudominio.com
NEXT_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<clave-publicable>
SUPABASE_SERVICE_ROLE_KEY=<clave-solo-servidor>
```

`NEXT_PUBLIC_APP_URL` no debe terminar en `/`. La clave de servicio no debe empezar por `NEXT_PUBLIC_`, no debe enviarse al navegador y no debe incluirse en el repositorio.

En Supabase, en **Authentication → URL Configuration**:

- **Site URL:** `https://petflow.tudominio.com`
- **Redirect URLs:** `https://petflow.tudominio.com/`
- Durante desarrollo, agregar también `http://localhost:3000/` si se seguirá probando localmente.

El dominio debe ser el dominio real de la aplicación publicada, no el dominio de Supabase ni `localhost`.

## Acceso recomendado para cada negocio

Para un sistema multi-negocio, la opción recomendada es:

1. El administrador crea la cuenta del responsable con su correo y el negocio al que pertenece.
2. El servidor usa una invitación de Supabase de un solo uso.
3. El responsable abre el enlace, establece su propia contraseña y queda asociado al negocio mediante `pet_shop_memberships`.
4. Las políticas RLS continúan aislando los datos por `pet_shop_id`.

No se deben enviar contraseñas permanentes por correo. Si se necesita entregar una contraseña temporal por compatibilidad, debe ser aleatoria, de un solo uso, con vencimiento y con cambio obligatorio en el primer acceso; aun así, el enlace de invitación es más seguro.

| Alternativa | Experiencia | Seguridad | Complejidad | Costo operativo |
| --- | --- | --- | --- | --- |
| Enlace mágico actual | El usuario escribe su correo y recibe un enlace | Alta si el correo está protegido | Baja | Baja |
| Invitación de un solo uso y contraseña propia | El administrador invita; el usuario define su contraseña | Alta y adecuada para negocios | Media | Baja |
| Usuario y contraseña generados por PetFlow y enviados por correo | Acceso directo con credenciales recibidas | Menor; el correo queda como secreto | Media/alta | Baja |

La primera opción es la más simple. La segunda es la mejor si cada negocio necesita cuentas administradas y acceso con contraseña. El envío programado de correos no es necesario para el alta: Supabase puede enviar la invitación en el momento de crear el usuario. Sólo conviene programar recordatorios o reenvíos controlados, no repetir contraseñas.

## Flujo que falta para habilitar invitaciones administrativas

El archivo recibido contiene el panel operativo y el inicio de sesión por enlace mágico, pero no contiene una migración Supabase ni una ruta servidor para crear usuarios. Para implementar invitaciones completas se debe agregar, en una siguiente iteración:

- un rol administrativo y una pantalla para crear/invitar responsables;
- una ruta de servidor protegida que use `SUPABASE_SERVICE_ROLE_KEY` sólo en el servidor;
- la creación de `pet_shop_memberships` después de aceptar la invitación;
- una pantalla de alta de contraseña y recuperación de contraseña;
- auditoría, revocación de membresías y reenvío limitado de invitaciones.

No se debe llamar a la API administrativa de Supabase desde `PetFlowApp.tsx`.

## Validación

Después de publicar y configurar las variables:

1. Abrir PetFlow desde `https://petflow.tudominio.com`, no desde localhost.
2. Solicitar el enlace mágico o de recuperación.
3. Confirmar que el correo regresa a `https://petflow.tudominio.com/`.
4. Abrir el enlace una sola vez; el alta muestra creación de contraseña y la recuperación muestra cambio de contraseña antes de continuar al panel.
5. Repetir con un segundo negocio y verificar que no puede leer los datos del primero.

## Acceso con email o nombre de usuario y recuperación

PetFlow mantiene el correo electrónico de Supabase Auth como dirección de recuperación. Al crear o configurar la contraseña, la persona puede escoger además un **nombre de usuario personal y único** (3–30 caracteres: letras sin tilde, números, punto, guion o guion bajo). Después puede iniciar sesión con cualquiera de los dos. El nombre del negocio no se usa por sí solo como login porque puede repetirse y pertenecer a varias personas.

Para habilitar los nombres de usuario en el proyecto de producción, completar estos pasos una sola vez:

1. En Supabase, abrir **SQL Editor** y ejecutar íntegro `supabase/migrations/0006_login_names.sql`. La migración crea una tabla sin lectura directa para clientes; cada usuario autenticado puede reservar su propio nombre y solo la función de servidor puede resolverlo a un correo.
2. En Netlify, en **Site configuration → Environment variables**, configurar para el runtime de **Functions** estas variables: `SUPABASE_URL` (URL del proyecto), `SUPABASE_ANON_KEY` (clave pública anon/publishable), `SUPABASE_SERVICE_ROLE_KEY` (clave secreta de servicio) y `PETFLOW_APP_ORIGIN=https://pettflow.netlify.app`. Las variables de `NEXT_PUBLIC_*` que se usan durante el build no necesariamente están disponibles para Functions en runtime.
3. La `SUPABASE_SERVICE_ROLE_KEY` se copia directamente desde Supabase a Netlify como secreto: no se pega en un chat, no se añade a Git ni lleva prefijo `NEXT_PUBLIC_`. Debe quedar disponible solo en Functions.
4. Desplegar la versión que contiene `netlify/functions/alias-login.mts`. Hasta que estén aplicadas la migración y esas variables, el acceso con email y la recuperación siguen funcionando; el formulario informa que el acceso por nombre todavía no está configurado.
5. Para configurar el usuario, la persona elige **Crear o configurar contraseña**, recibe un enlace en su correo y, al abrirlo, guarda una contraseña y un nombre de usuario único opcional. Si no define usuario, inicia sesión con su correo.

En Supabase, confirmar en **Authentication → URL Configuration** que el Site URL y la URL permitida incluyen `https://pettflow.netlify.app/`. El enlace de recuperación vuelve a la página de PetFlow; con la sesión validada por Supabase, la página presenta **“Elegí una contraseña nueva”** y permite guardarla. Si el enlace venció, volver a **¿Olvidaste tu contraseña?** y pedir otro. El correo sigue siendo el destino de recuperación aunque se inicie sesión con nombre de usuario.
