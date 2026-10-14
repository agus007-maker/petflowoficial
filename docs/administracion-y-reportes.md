# Administración y reportes de PetFlow

## Aumento general de precios

El propietario encuentra **Administración → Aumento de precios**. Puede elegir un porcentaje, limitarlo a productos activos y filtrar por categoría. PetFlow muestra una vista previa antes de aplicar el cambio. La operación final se ejecuta mediante `apply_price_increase`, que valida el porcentaje, el negocio y el permiso `manage_prices` en Supabase.

## Roles y permisos

El panel **Roles y permisos** sólo aparece para el propietario del negocio. La migración `0003_management_tools.sql` agrega roles `owner`, `manager`, `staff` y `viewer`, además de permisos personalizados por membresía. Los cambios se realizan mediante `change_pet_shop_member_role`; la interfaz no es el mecanismo de seguridad. Aplicar la migración antes de usar esta pantalla en producción.

## Reporte diario

El panel **Reporte diario** genera un CSV UTF-8 separado por punto y coma, compatible con Excel. Incluye resumen de ventas, ingresos, turnos, clientes, detalle de ventas y turnos del día seleccionado.

## Programación automática

La generación manual está lista. Para enviarlo todos los días por correo hay que desplegar primero la versión con un endpoint de producción en `/api/scheduled/`, registrar un Heartbeat diario y conectar un proveedor de correo. No se debe usar un `setInterval` dentro del servidor, porque el runtime puede apagarse entre ejecuciones. La migración y el endpoint de automatización deben aplicarse sólo después de confirmar la URL publicada y el proveedor de correo.
