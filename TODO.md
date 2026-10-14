# PetFlow — funcionalidades

## Estación de punto de venta compacta — publicada
- [x] Punto de venta compacto con navegación PetFlow, búsqueda/productos y carrito de cobro, inspirado en la captura compartida sin copiar marca Cobrando.
- [x] Modo oscuro localizado, acento PetFlow y adaptación responsive con navegación de teclado.
- [x] Búsqueda por nombre, SKU o categoría y soporte a lector de código de barras tipo teclado.
- [x] Enter agrega sólo una coincidencia exacta de SKU/nombre con stock; una coincidencia ambigua no elige un producto al azar.
- [x] El modo «Consultar precio» permite leer resultados sin agregarlos al carrito.
- [x] El ticket conserva cliente, cantidades, medios de pago, total y confirmación mediante la RPC existente; la venta descuenta stock una sola vez y mantiene el ticket descargable/imprimible.
- [x] F2 enfoca la búsqueda; F4 vacía el borrador sin escribir cambios persistentes.
- [x] No se muestran cajas, venta de monto libre ni controles sin soporte de datos/RPC.
- [x] El cliente lee las variables con `import.meta.env`; Vite sólo expone prefijos públicos `VITE_` y `NEXT_PUBLIC_`, nunca claves de servicio.

## Aumento masivo de precios
- [ ] Una persona autorizada puede seleccionar todos los productos activos o una categoría y aumentar por porcentaje o por importe fijo en ARS.
- [ ] Antes de confirmar se muestran el alcance, la cantidad afectada y los precios anterior/nuevo; los valores no válidos o negativos se rechazan.
- [ ] La confirmación actualiza los precios como una operación atómica, conserva las ventas históricas y genera un registro auditable.
- [ ] Un miembro sin permiso no puede ejecutar el aumento desde la interfaz ni invocando directamente la operación de base de datos.

## Roles y permisos personalizables
- [ ] El propietario conserva control total y puede definir roles por pet shop con permisos independientes para POS, inventario/stock, precios, ventas, clientes, agenda, reportes y administración del equipo/configuración.
- [ ] El propietario puede asignar roles a miembros registrados de su negocio; el sistema mantiene aislamiento por `pet_shop_id` y no permite quitarle al propietario su control total.
- [ ] La navegación y las acciones reflejan los permisos, y Supabase/RLS impide igualmente la lectura o modificación directa no autorizada.
- [ ] La información sensible no se expone al cliente para un rol sin permiso; ocultar un botón no se considera control de acceso.

## Reporte diario Excel
- [ ] El reporte se genera automáticamente al cierre del día local del pet shop, aunque nadie tenga PetFlow abierto.
- [ ] El Excel incluye resumen de ventas, totales por medio de pago, cada venta y su detalle de productos, y los turnos del día.
- [ ] Cada negocio y fecha produce como máximo un reporte; un reintento no duplica archivos ni registros.
- [ ] Los archivos quedan privados y sólo miembros con permiso de reportes pueden verlos/descargarlos desde PetFlow; no se envían por correo por defecto.
- [ ] La pantalla de reportes permite consultar el historial y descargar cada Excel.
