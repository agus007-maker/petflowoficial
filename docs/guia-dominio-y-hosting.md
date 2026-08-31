# Dominio personalizado y hosting externo de PetFlow

## Antes de empezar

PetFlow es una aplicación full-stack, no una página estática. Tiene un frontend React, un servidor Express/tRPC, una base de datos MySQL/TiDB, autenticación Manus y un proceso periódico para recordatorios de turnos. Por eso, conectar GitHub a otro hosting no basta: hay que trasladar el runtime, las variables de entorno, la base de datos, la autenticación y el programador.

| Alternativa | Ventaja principal | Adaptación necesaria para PetFlow | Automatizaciones |
| --- | --- | --- | --- |
| Vercel | Documenta despliegue de Express como función serverless y dominios desde Settings → Domains. | Adaptar el entrypoint actual al formato de función/Express que Vercel detecta. | Trasladar el endpoint de recordatorios a un cron compatible y revisar límites serverless. |
| Netlify | Buen flujo de Git y dominios, con Express mediante Netlify Functions. | Crear una función, agregar `serverless-http`, `@netlify/functions`, `netlify.toml` y redirects `/api/*`. | No usar funciones background/programadas de Netlify para esta lógica sin rediseñarla. |
| Hosting integrado actual | Mantiene autenticación, base, storage y Heartbeat de PetFlow sin migración. | Ninguna. | Los recordatorios ya están programados en la infraestructura del proyecto. |

## Conectar el dominio sin mover la aplicación

Esta es la ruta más simple y segura. Comprá o utilizá un dominio propio, abrí el proyecto en **Settings → Domains**, elegí agregar un dominio e ingresá, por ejemplo, `app.tumarcapet.com`. El panel indicará exactamente el registro DNS que debe agregarse en el registrador del dominio.

Si usás un dominio raíz como `tumarcapet.com`, normalmente se configura un registro **A**. Si usás un subdominio como `app.tumarcapet.com`, normalmente se configura un **CNAME**. No inventes el valor: copiá el destino que muestre el panel del proveedor. Vercel documenta este flujo y diferencia A para apex y CNAME para subdominios [1]. Netlify ofrece las opciones de dominio propio, Netlify DNS o DNS externo [3].

Después de guardar el DNS, regresá al panel y esperá la verificación. No elimines registros de correo, como MX, SPF o DKIM, si el dominio también se usa para email. Cuando el estado aparezca como verificado, probá la URL con y sin `www` y confirmá que el certificado HTTPS esté activo.

## Opción Vercel

1. En GitHub, asegurate de que el repositorio de PetFlow contenga el código y no ningún archivo `.env`. Los secretos deben cargarse desde Project Settings → Environment Variables.
2. En Vercel elegí **Add New → Project**, conectá GitHub y seleccioná el repositorio. Configurá Node/pnpm de acuerdo con `package.json`.
3. Antes de desplegar, adaptá el servidor actual. Vercel documenta Express como una función única y acepta un entrypoint que exporte la aplicación Express; la entrada actual de PetFlow inicia un servidor administrado por el runtime, por lo que debe revisarse para exportar el objeto `app` sin depender de un proceso persistente [2].
4. Cargá las variables de entorno equivalentes a `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `OWNER_OPEN_ID`, `OWNER_NAME`, `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`, `VITE_FRONTEND_FORGE_API_URL`, `VITE_FRONTEND_FORGE_API_KEY`, `VITE_ANALYTICS_ENDPOINT` y `VITE_ANALYTICS_WEBSITE_ID`. No copies valores secretos en GitHub.
5. Configurá el dominio desde Settings → Domains y completá el registro DNS indicado. Para el dominio raíz Vercel suele pedir A; para subdominio, CNAME [1].
6. Verificá `/api/trpc`, inicio de sesión, creación de producto, venta con descuento de stock y creación/cambio de turno. No consideres la migración terminada hasta que esos flujos funcionen.
7. Rediseñá el recordatorio periódico para el mecanismo de cron que vayas a utilizar en Vercel y probá que la ruta protegida no acepte llamadas anónimas. El recordatorio actual usa la programación de PetFlow; no se traslada automáticamente con el repositorio.

## Opción Netlify

1. Conectá el repositorio desde **Add new site → Import an existing project** y definí el comando de build del proyecto.
2. Prepará la capa serverless. La documentación oficial de Netlify para Express indica instalar `express`, `serverless-http` y `@netlify/functions`, crear una función bajo `netlify/functions/` y agregar un `netlify.toml` con bundler esbuild y un redirect de `/api/*` hacia `/.netlify/functions/api/:splat` [4].
3. Mové o envolvé las rutas Express/tRPC del proyecto dentro de esa función. El servidor actual de PetFlow no queda migrado sólo por seleccionar GitHub: requiere esta adaptación y una revisión de cookies, URLs y CORS.
4. Cargá las variables de entorno en Site configuration → Environment variables. Conservá la misma separación entre variables públicas `VITE_*` y secretos de servidor. Nunca subas `.env` al repositorio.
5. En el panel de dominios del sitio, agregá `app.tumarcapet.com`. Si mantenés el DNS fuera de Netlify, copiá exactamente los registros que Netlify indique; si delegás DNS a Netlify, trasladá también los registros de correo que necesites.
6. Probá autenticación, `/api/trpc`, base de datos, ventas, stock y agenda. La guía de Netlify advierte que Express se ejecuta como Netlify Functions y que no es recomendable usar esa modalidad para funciones background o programadas [4].
7. Para mantener los avisos, usá un cron externo o un proveedor de jobs que invoque un endpoint seguro, o rediseñá el proceso para el mecanismo serverless elegido. La programación actual de PetFlow no se exporta con GitHub.

## Qué conviene trasladar y qué no

GitHub debe contener el código, migraciones, configuración no secreta y documentación. La base de datos debe migrarse por separado y con una estrategia de backup; los datos de clientes, mascotas, ventas e inventario no aparecen al clonar el repositorio. Las credenciales deben crearse como variables protegidas en el nuevo proveedor. La autenticación necesita que la nueva URL de producción esté registrada como redirect/callback válida en el sistema de identidad.

Para la aplicación actual, el hosting integrado es la ruta de menor riesgo porque ya resuelve el servidor Node, la base, el login y el programador. Vercel y Netlify son alternativas viables para un equipo que quiera administrar su propia infraestructura, pero ambas requieren trabajo de migración antes de usarlas como producción.

## Referencias

[1]: https://vercel.com/docs/domains/working-with-domains/add-a-domain "Vercel — Adding & Configuring a Custom Domain"

[2]: https://vercel.com/docs/frameworks/backend/express "Vercel — Express on Vercel"

[3]: https://docs.netlify.com/manage/domains/get-started-with-domains/ "Netlify — Get started with domains"

[4]: https://docs.netlify.com/build/frameworks/framework-setup-guides/express/ "Netlify — Express on Netlify"
