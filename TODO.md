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

## Recuperación y configuración de contraseña de cuentas existentes

- [ ] Desde el acceso debe existir “Crear o configurar contraseña” para personas que antes entraban con enlace. Ingresan su email y reciben un enlace para una cuenta existente o nueva.
- [ ] Al abrir el enlace de configuración, PetFlow ofrece crear y confirmar contraseña y no devuelve al login sin explicación.
- [ ] “Olvidé mi contraseña” muestra el formulario de nueva contraseña tras validar sesión, reconociendo PKCE, query/hash y el evento Auth `PASSWORD_RECOVERY`.
- [ ] Un enlace vencido o inválido explica cómo pedir otro; nunca permite cambiar la contraseña sin sesión autenticada.
- [ ] Si email/contraseña falla, se orienta a usuarios antiguos hacia “Crear o configurar contraseña” sin revelar si un email existe.
- [ ] Cada persona puede iniciar sesión con el correo o un nombre de usuario personal único; el correo sigue siendo el destino de los enlaces para crear/restablecer la contraseña. El nombre del local puede inspirar el alias, pero no se usa como identificador compartido porque puede repetirse o tener varios empleados.
- [ ] El alias se guarda con unicidad, sin lectura pública de su email asociado, y su resolución ocurre en servidor; ninguna contraseña se almacena fuera de Supabase Auth.
- [ ] El endpoint de alias aplica límites persistentes de intentos por IP y nombre, guarda solamente identificadores HMAC y devuelve el mismo error para alias o contraseña incorrectos.
- [ ] Con la migración de aliases aún sin aplicar o la función server-side sin su secreto, el acceso por correo y la recuperación siguen funcionando; el alias informa claramente que falta configuración y no bloquea el acceso por email.
