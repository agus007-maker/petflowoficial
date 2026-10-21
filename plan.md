# Plan: espacio de venta rápido para PetFlow

## Alcance y enfoque

Adaptar la pantalla de Punto de venta de PetFlow a una estación de cobro compacta inspirada en la captura de Cobrando compartida por el usuario. Mantener la identidad y navegación de PetFlow, sus tablas/RPC actuales y su flujo de venta; no copiar marca, textos, logos ni activos de Cobrando. En esta entrega no se añadirá una caja abierta/cerrada ficticia, una venta por monto libre ni nuevos datos financieros: requieren cambios confirmados en el modelo/RPC de Supabase.

## Diseño

- **Movimiento:** consola operativa de comercio contemporánea, con la densidad de un POS de mostrador y la identidad de una herramienta de cuidado animal.
- **Principios:** cobrar con pocas acciones; lectura rápida a distancia; mantener el resumen de venta siempre visible; no alterar stock hasta confirmar una venta; conservar accesibilidad y adaptación a pantallas pequeñas.
- **Color:** modo oscuro localizado al POS para reducir el brillo en el mostrador; fondo verde pino casi negro y superficies carbón; menta PetFlow para foco y acción primaria; ámbar para advertencias de stock; contraste alto para importes y estados.
- **Paradigma de layout:** navegación lateral existente; encabezado de Punto de venta; espacio de búsqueda/escaneo y productos a la izquierda; carrito, cliente, forma de pago y total anclados a la derecha.
- **Elementos distintivos:** campo de escaneo que acepta lectores tipo teclado; precio y disponibilidad visibles en cada resultado; tarjeta de cobro fija con total destacado y vaciado explícito del ticket.
- **Interacción:** buscar por nombre, SKU o categoría; Enter agrega una coincidencia exacta de SKU/nombre cuando hay stock; F2 enfoca la búsqueda; F4 limpia el borrador del carrito. Consultar precio cambia a modo de lectura sin añadir artículos. Confirmar venta sigue usando la RPC atómica existente y conserva impresión/descarga de ticket.
- **Animación:** transiciones cortas (120–160 ms) solo para foco/hover; sin animaciones de larga duración; respetar `prefers-reduced-motion`.
- **Tipografía:** conservar la familia de sistema actual; usar jerarquía compacta sans serif para la caja y números tabulares/contrastados para cantidades e importes.
- **Esencia de marca:** PetFlow ayuda a los pet shops a vender rápido sin perder el contexto de sus clientes y mascotas; clara, cálida y confiable.
- **Voz:** “Escaneá o buscá un producto”; “Revisá el ticket y cobrá cuando esté listo”.
- **Logo:** conservar el wordmark y la huella de PetFlow ya existentes.
- **Color de marca:** mantener la menta de PetFlow como acento, sobre superficies oscuras solo en la vista del POS.

## Implementación y estructura

- `client/src/components/PetFlowApp.tsx`: conectar el modo visual POS con la vista seleccionada; reestructurar el componente `PointOfSale`; agregar búsqueda por SKU/nombre, modo de consulta, accesos de teclado y estados vacíos claros; mantener la RPC `create_sale`, validación de stock, cliente, método de pago y ticket.
- `client/src/index.css`: reutilizar variables globales y respetar navegación y vistas actuales.
- `client/src/components/PetFlowPos.css`: estilos encapsulados por modo POS, colores oscuros, distribución de estación, estados de búsqueda, carrito, accesibilidad y responsive.
- No agregar dependencias ni tocar tablas/RPC de producción. La publicación sigue siendo la existente: Vite build con salida estática para Netlify; el cambio se entrega en una rama/PR, no se fusiona a producción sin autorización.

## Límites para una siguiente fase

Apertura/cierre persistente de caja y su conciliación, venta de monto libre, registro de compras/movimientos, roles operativos y reporte Excel requieren definir esquema/RLS/RPC y se deben tratar como cambios de datos separados. El actual enlace de referencia redirigió al inicio de sesión; el diseño se basa en la captura proporcionada por el usuario y en las funciones ya presentes en PetFlow.


## Hallazgo de runtime durante la verificación

El preview mostró pantalla en blanco porque `client/src/lib/supabase/client.ts` leía `process.env` en código del navegador. La implementación reemplaza esa lectura por `import.meta.env` y expone en Vite únicamente los prefijos públicos `VITE_` y `NEXT_PUBLIC_`, necesarios para las variables de Supabase que Netlify ya configura. No se debe usar esa configuración para variables privadas o claves de servicio.


## Acceso persistente con email y contraseña

- Mantener Supabase Auth como único gestor de credenciales; no almacenar contraseñas en tablas propias.
- El acceso habitual será email + contraseña mediante `signInWithPassword`, con sesión persistente provista por el cliente Supabase.
- El alta/configuración inicial solicita el email y envía un enlace de verificación con `signInWithOtp`. El enlace vuelve a PetFlow con un indicador de flujo, intercambia el código por sesión y muestra un formulario para elegir y confirmar una contraseña.
- Incluir recuperación: `resetPasswordForEmail` redirige al mismo flujo seguro de creación de contraseña.
- Con contraseña guardada, continuar el arranque actual de cuenta/negocio; no alterar membresías, tiendas ni datos operativos.
- Implementar en `client/src/components/PetFlowApp.tsx` y conservar el diseño/estilos actuales. La URL de producción permitida de Supabase Auth debe incluir el origen `https://pettflow.netlify.app`; el código no requiere credenciales adicionales.
- Entregar en una rama de feature y no fusionar ni desplegar a producción sin autorización.
