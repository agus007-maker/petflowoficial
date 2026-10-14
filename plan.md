# Plan: aumentos, permisos y reportes diarios de PetFlow

## Estado base: POS publicado

La estación de Punto de venta inspirada en la captura compartida ya se fusionó y está publicada. Mantiene la identidad y navegación de PetFlow, lector tipo teclado, búsqueda/consulta de precios, carrito y cobro mediante la operación existente; no copia marca ni recursos de Cobrando.

## Alcance de esta fase

1. **Aumento masivo de precios:** desde Inventario, todos los productos activos o una categoría; aumento por porcentaje o importe fijo en ARS; vista previa de alcance, cantidad y precio anterior/nuevo; una confirmación; validación de importes y auditoría del cambio.
2. **Roles y permisos personalizables:** el propietario conserva control total. Roles por pet shop configuran permisos independientes para POS, productos/stock, actualización de precios, ventas, clientes, agenda, reportes y administración de usuarios/configuración. La navegación oculta lo no autorizado, mientras Supabase/RLS y las operaciones SQL también lo deniegan. Se mantiene el aislamiento entre negocios y no se permite quitar el control total al propietario.
3. **Reporte diario Excel:** se genera aunque nadie tenga PetFlow abierto, usando la fecha local de `pet_shops.timezone` (predeterminado `America/Argentina/Buenos_Aires`) y se archiva en almacenamiento privado para descargar según el permiso de reportes. Incluye resumen y totales por medio de pago, cada venta, sus artículos y los turnos del día. No se distribuye por correo por defecto.

El primer flujo de roles administra miembros ya registrados; la invitación de cuentas nuevas queda fuera de este alcance inicial, salvo que se confirme que también se necesita.

## Arquitectura e implementación

- **Cliente:** React/Vite y Supabase JS. `PetFlowApp.tsx` integra las pantallas; `BulkPriceIncrease.tsx` y `PetFlowAdmin.css` contienen la vista previa del lote; `petflow-rules.ts` calcula precios sin persistir cambios. La RPC SQL es el único punto que aplicará el ajuste en forma atómica y auditable.
- **Autorización/datos:** una migración incremental de Supabase definirá roles, permisos, auditoría, funciones SQL y RLS. La interfaz no será el único control. El código actual del repositorio no contiene el archivo `supabase/migrations/0001_petflow_schema.sql` citado por los tests/documentación; hay una vista previa de precios, pero falta cerrar la integración segura con el esquema real.
- **Excel:** `netlify/functions/_lib/daily-report-workbook.ts` crea un libro `.xlsx` con hojas Resumen, Ventas, Artículos y Turnos. El generador recibe sólo los datos necesarios para esas hojas; no exporta teléfono, correo ni notas privadas de clientes.
- **Ejecución:** `netlify/functions/daily-reports.mts` consulta ventas/turnos, arma el libro con ExcelJS, lo guarda en el bucket privado `petflow-daily-reports` y registra metadatos idempotentes en `daily_reports`. El scheduler usa `0 * * * *` (minuto 0, cada hora UTC), calcula los límites del día en la zona del negocio y genera el reporte del día local anterior; el retraso normal desde medianoche local es de 0–60 minutos. Los límites de fecha contemplan cambios de horario estacional.
- **Netlify:** conservar `pnpm run build` y `dist/public`; las funciones viven fuera del directorio estático `netlify/functions/`. Netlify confirma que las funciones programadas corren sólo en deploys publicados, reciben `next_run` como próxima invocación, usan cron UTC y tienen un máximo de 30 segundos; por eso el cálculo de fecha usa la hora efectiva del handler, no `next_run`. Fuentes: [Scheduled Functions](https://docs.netlify.com/build/functions/scheduled-functions/), [cron y UTC](https://docs.netlify.com/snippets/functions/scheduled-functions/cron-expression-format/) y [Netlify Functions](https://docs.netlify.com/build/functions/).
- **Dependencias/runtime:** `exceljs` genera el archivo y `@netlify/functions` aporta sus tipos. El check TypeScript incluye `.ts` y `.mts` bajo `netlify/functions`.
- **Configuración privada pendiente:** la función requiere `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` dentro del alcance **Functions** de Netlify; jamás se agrega la clave al bundle cliente, a `netlify.toml` o a Git. No se habilitará el archivo hasta que la migración y la configuración segura estén completas.

## Estructura relevante

- `client/src/components/PetFlowApp.tsx`: shell, navegación y módulos actuales.
- `client/src/components/BulkPriceIncrease.tsx`: alcance y vista previa del aumento masivo; se ampliará para usar permisos reales una vez definidos.
- `client/src/lib/petflow-rules.ts`: reglas puras de validación, venta y cálculo de precios.
- `netlify/functions/daily-reports.mts`: generación programada y archivo de reportes.
- `netlify/functions/_lib/daily-report-workbook.ts` y `report-dates.ts`: formato Excel y fechas locales/UTC.
- `server/*report*.test.ts` y `server/petflow-pricing.test.ts`: pruebas del formato, fechas y cálculos.
- `drizzle/schema.ts` describe la capa Drizzle del proyecto, pero no reemplaza el esquema Supabase al que accede el frontend.
- `supabase/migrations/` no existe actualmente en el árbol; se añadirá sólo después de contrastar el esquema exportado sin datos.

## Diseño

- **Movimiento:** consola administrativa contemporánea para comercios de cuidado animal, con densidad operativa y claridad de caja.
- **Principios:** impacto del aumento visible antes de aplicarlo; permisos basados en capacidades reales; informes privados, fechados y directos de descargar; separar administración del trabajo diario.
- **Color:** conservar verde bosque y menta de PetFlow; fondos claros en administración, cifras con alto contraste, ámbar para cambios pendientes y rojo reservado para error o acción destructiva.
- **Layout:** módulos integrados a la navegación existente, tablas amplias en escritorio y formularios apilados en móvil; información clave visible sin paneles ambiguos.
- **Elementos distintivos:** etiqueta de alcance del aumento, comparación anterior/nuevo y tarjetas de reportes por fecha.
- **Interacción:** vista previa obligatoria y confirmación única; feedback de éxito/error; si falta la RPC no se simula éxito. Respetar foco de teclado y `prefers-reduced-motion`, con transiciones discretas de 150–200 ms.
- **Tipografía:** continuar con la sans serif existente y cifras tabulares para importes y totales.
- **Esencia de marca:** PetFlow ayuda a pet shops a cuidar clientes y operar el negocio con control; práctica, cálida y confiable.
- **Voz:** «Revisá el impacto antes de actualizar» y «Tu cierre del día está listo para descargar».
- **Marca:** conservar huella y wordmark PetFlow y su menta propia; no copiar activos de Cobrando.

## Límite de publicación

No se aplicarán migraciones ni se habilitarán los controles en producción hasta verificar la estructura y las políticas reales de Supabase. Se necesita el dump de esquema de `public` **sin datos** para terminar las políticas/RPC sin adivinar tablas o permisos existentes.
