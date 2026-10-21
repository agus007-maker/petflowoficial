# TODO — POS de PetFlow

## Estación de punto de venta compacta

- [ ] La vista Punto de venta adopta una distribución compacta con navegación PetFlow existente, área de búsqueda/productos y carrito fijo de cobro, tomando la captura del usuario como referencia sin reproducir la marca Cobrando.
- [ ] El POS usa modo oscuro solo en esta vista, conserva el acento de marca PetFlow y mantiene contraste, navegación por teclado y adaptación a móvil.
- [ ] El campo permite buscar por nombre, SKU o categoría y aceptar lectores de código de barras que escriben como teclado.
- [ ] Enter agrega un producto con stock cuando el texto coincide exactamente con su SKU o nombre; si la coincidencia no es inequívoca, no agrega un producto al azar.
- [ ] El POS muestra productos, precios y stock; el modo “Consultar precio” permite leer resultados sin agregarlos al carrito.
- [ ] El ticket conserva selector de cliente, cantidades editables, medios de pago, total y confirmación; la venta confirmada sigue usando la RPC existente, descuenta stock una sola vez y conserva el ticket descargable/imprimible.
- [ ] F2 enfoca la búsqueda; F4 vacía el borrador del carrito; vaciar el ticket no escribe ni modifica datos persistentes.
- [ ] No mostrar como funcional una caja abierta/cerrada, venta de monto libre ni controles que no tengan soporte en los datos/RPC actuales.
- [ ] El código cliente lee variables mediante `import.meta.env`; no contiene referencias directas a `process.env` que dejen la pantalla en blanco en el navegador. Vite solo expone prefijos públicos `VITE_` y `NEXT_PUBLIC_`, nunca claves de servicio.


## Acceso persistente con cuenta y contraseña

- [ ] El usuario registrado puede volver a PetFlow e iniciar sesión con su email y contraseña, sin solicitar un enlace en cada acceso; Supabase Auth mantiene la sesión según su configuración segura.
- [ ] La primera vez, “Crear cuenta” solicita el email y envía el enlace de verificación; al abrirlo, PetFlow confirma el acceso y presenta la creación y confirmación de contraseña antes de entrar al espacio del negocio.
- [ ] La contraseña se crea o actualiza usando Supabase Auth; nunca se guarda texto de contraseña en tablas propias ni en el cliente.
- [ ] “Olvidé mi contraseña” envía un enlace de recuperación y permite definir una contraseña nueva desde el regreso autenticado a PetFlow.
- [ ] Tras establecer contraseña, los usuarios nuevos continúan el alta del pet shop y los usuarios existentes vuelven a su negocio y datos de membresía sin cambios.
- [ ] Los enlaces de alta y recuperación regresan al dominio público PetFlow configurado, y la app muestra estados entendibles si el enlace vence o Supabase lo rechaza.
