# Modelo operativo de PetFlow

PetFlow funciona como una aplicación multiusuario orientada a un pet shop. Cada persona autenticada administra un espacio operativo propio y todos los registros comerciales —productos, clientes, mascotas, ventas, turnos y avisos— quedan asociados a su identificador `ownerUserId`. Esta regla evita que los datos de un comercio sean visibles o modificables por otro.

El **responsable del pet shop** es el usuario autenticado que gestiona su espacio. El sistema registra dos tipos de avisos: los producidos inmediatamente cuando cambia el estado de un turno y los recordatorios de turnos próximos. Ambos se conservan en la bandeja operativa y se remiten al responsable del proyecto cuando dicho canal está activado.

| Módulo | Propósito operativo | Regla principal |
| --- | --- | --- |
| Inventario | Registrar productos, precios y existencias. | Una venta nunca puede reducir stock por debajo de cero. |
| Punto de venta | Cobrar pedidos y descontar unidades. | Venta, ítems y descuento de stock se registran en una única transacción. |
| Clientes y mascotas | Centralizar el vínculo entre tutor y mascota. | Cada mascota pertenece a un cliente del mismo espacio operativo. |
| Agenda | Organizar servicios y estados de atención. | Un turno conserva cliente, mascota, fecha, duración y estado. |
| Avisos | Informar al responsable sobre cambios y próximos turnos. | Los recordatorios no se repiten una vez registrados. |
