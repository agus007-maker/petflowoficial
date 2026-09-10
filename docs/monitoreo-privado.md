# Monitoreo privado de PetFlow

PetFlow incorpora un centro de diagnóstico visible únicamente para la cuenta creadora `nitsugamon@gmail.com`. El panel ejecuta verificaciones de lectura sobre la sesión, productos, ventas y avisos del negocio activo. Las pruebas no crean, modifican ni eliminan información y se ejecutan fuera del flujo de venta, por lo que no detienen la aplicación.

Cada comprobación registra su duración, resultado, nivel de severidad y detalle técnico. Las funciones de diagnóstico también generan una huella estable para evitar notificar varias veces la misma falla. El envío por correo queda deliberadamente desacoplado: para activarlo será necesario configurar un proveedor emisor como Resend o SMTP y luego conectar el registro de fallas a ese canal. La dirección de destino prevista es `nitsugamon@gmail.com`.

Las reglas reutilizables de precios masivos permiten calcular aumentos por porcentaje o monto fijo, aplicar filtros por categoría, marca, proveedor o selección manual, redondear valores y generar una vista previa antes de persistir cambios. Las reglas de permisos distinguen propietario, encargado y vendedor; la aplicación debe usar estas reglas también en las políticas de base de datos antes de habilitar operaciones sensibles.

## Próxima etapa técnica

La siguiente iteración debe agregar las tablas y políticas de auditoría, caja, cierres, roles por negocio y actualización masiva transaccional. Después se puede crear un Heartbeat de baja frecuencia para ejecutar las comprobaciones en producción. Ese Heartbeat debe configurarse sólo después de publicar el proyecto, porque los callbacks programados no son accesibles desde la vista previa local.
