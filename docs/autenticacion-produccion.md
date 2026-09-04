# Autenticación de PetFlow en producción

## Causa del enlace con `localhost`

El enlace mágico se construía con `window.location.origin`. Si el formulario se enviaba desde `http://localhost:3000`, Supabase recibía ese origen y lo colocaba en el correo. Un destinatario externo no puede abrir `localhost` porque ese nombre apunta a su propio equipo, no al servidor de PetFlow.

La aplicación ahora usa `NEXT_PUBLIC_APP_URL` para formar siempre el enlace público y dispone de `/auth/callback` para canjear el código de Supabase por una sesión antes de volver al panel.

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
- **Redirect URLs:** `https://petflow.tudominio.com/auth/callback`
- Durante desarrollo, agregar también `http://localhost:3000/auth/callback` si se seguirá probando localmente.

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
2. Solicitar el enlace mágico.
3. Confirmar que el correo contiene `https://petflow.tudominio.com/auth/callback`.
4. Abrir el enlace una sola vez y comprobar que vuelve al panel autenticado.
5. Repetir con un segundo negocio y verificar que no puede leer los datos del primero.
