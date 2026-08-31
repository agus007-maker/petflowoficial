# PetFlow: guía de producto y construcción

## Propósito

PetFlow es una aplicación de operación diaria para pet shops. Reúne en una misma experiencia el catálogo de productos, el punto de venta, las fichas de tutores y mascotas, la agenda de servicios y los avisos del responsable. La interfaz se diseñó para un uso rápido tanto en mostrador como en un teléfono: las acciones principales están cerca del contexto en el que se necesitan y el estado vacío de cada módulo indica el siguiente paso útil.

| Módulo | Uso cotidiano | Resultado esperado |
| --- | --- | --- |
| Resumen | Consultar ventas, stock crítico, agenda y alertas. | Priorizar el inicio del día en pocos segundos. |
| Inventario | Registrar productos, precios, SKU, stock inicial y mínimo. | Conocer qué productos requieren reposición. |
| Punto de venta | Buscar productos, armar un ticket, elegir cobro y confirmarlo. | Crear una venta y descontar stock en una misma operación. |
| Clientes y mascotas | Crear tutores, asociar mascotas y abrir la ficha. | Centralizar contacto, mascotas e historial de compras. |
| Agenda | Crear un turno, navegar por fecha y actualizar su estado. | Ordenar los servicios del día y dejar registro operativo. |
| Alertas | Leer avisos y definir anticipación de recordatorios. | Mantener informado al responsable del pet shop. |
| Guía rápida | Recorrer los cuatro flujos iniciales. | Reducir el tiempo de adopción del producto. |

## Cómo usar PetFlow

El recorrido recomendado comienza en **Inventario**. Allí se agregan los productos con su precio de venta, existencias y stock mínimo. El indicador de reposición se activa cuando las unidades disponibles son iguales o inferiores a ese mínimo.

Luego, en **Clientes y mascotas**, se registra el tutor y se le asocian sus mascotas. Esto permite elegirlos tanto para la agenda de servicios como para vincular una venta y conservar su historial comercial.

Desde **Punto de venta**, se agregan productos al ticket, se selecciona opcionalmente un cliente y se confirma el medio de pago. La operación valida que haya unidades suficientes, crea la venta y sus líneas, y descuenta el stock de forma conjunta. Si algún producto no cuenta con unidades, la venta no se registra parcialmente.

La sección **Agenda** permite programar una mascota para un servicio, visualizar el día elegido y mover el turno entre los estados programado, confirmado, en servicio, completado, cancelado o no asistió. Cada cambio de estado queda registrado como aviso operativo.

## Avisos automáticos

PetFlow incluye una bandeja de alertas dentro del producto. Cuando se modifica el estado de un turno, el sistema registra el aviso y lo dirige al responsable del proyecto. Para los recordatorios de turnos próximos se puede seleccionar una anticipación de 15, 30, 60 o 120 minutos.

> Los recordatorios no se programan desde la vista previa de desarrollo. Primero debe estar publicada la aplicación y después se activa **“Activar avisos automáticos”** desde Alertas.

Una vez activados, los recordatorios se revisan cada 15 minutos. El sistema guarda la fecha de recordatorio emitido en cada turno para impedir duplicados incluso si una ejecución se repite. El aviso actual llega al propietario responsable del proyecto y además queda visible en la bandeja de PetFlow.

| Alternativa de aviso | Situación | Requisito adicional |
| --- | --- | --- |
| Aviso del propietario y bandeja de PetFlow | Implementado en esta versión. | Ninguno tras publicar y activar. |
| Correo, WhatsApp o mensajería para otra persona | Extensión posible si el responsable no es el propietario del proyecto. | Definir el canal y conectar sus credenciales o webhook. |

## Cómo se construyó

La aplicación se construyó como una web app de React con interfaz responsive y componentes reutilizables. La identidad visual combina verde bosque, crema y acentos miel; la tipografía editorial se reserva para jerarquía y la sans serif para la operación. El motivo de “flujo” de huellas refuerza la marca sin competir con las acciones de trabajo.

En el servidor se modelaron tablas separadas para productos, clientes, mascotas, ventas, ítems de venta, turnos, preferencias de aviso y notificaciones. Cada registro queda asociado a `ownerUserId`, por lo que la información de un pet shop no se mezcla con la de otro usuario autenticado. Las operaciones del punto de venta se ejecutan dentro de una transacción para mantener sincronizados comprobante, líneas y stock.

Los formularios del cliente consumen procedimientos tipados del servidor. Esto mantiene validaciones y reglas críticas —como no admitir stock negativo, verificar la pertenencia de una mascota al cliente, o impedir ventas con unidades insuficientes— fuera de la interfaz. La agenda incluye un ejecutor programado protegido que busca únicamente sus propias configuraciones y no confía en datos enviados por el navegador.

## Calidad y validación

Se generó y aplicó una migración de base de datos para el modelo operativo. Se ejecutó la comprobación de TypeScript y una batería de pruebas automatizadas que cubre el cierre de sesión, los criterios de elegibilidad de recordatorios y las etiquetas de estados. También se revisaron visualmente el panel y los módulos de inventario, punto de venta, clientes, agenda, alertas y guía en escritorio; el resumen se revisó además en móvil.

## Publicación y puesta en marcha

La aplicación queda lista para publicar desde la interfaz del proyecto. Una vez creada la versión de entrega, usá el botón **Publish** de la interfaz. Después de publicar, iniciá sesión en PetFlow, cargá productos y clientes iniciales, configurá el plazo deseado en Alertas, guardá las preferencias y activá los avisos automáticos.

No se configuró una pasarela de pagos ni un canal de mensajería externo, porque el alcance solicitado se concentra en la gestión interna de pet shops. Esas extensiones pueden añadirse en una siguiente etapa si necesitás cobro en línea, facturación fiscal, múltiples empleados, reportes financieros avanzados o comunicaciones por WhatsApp o correo.
