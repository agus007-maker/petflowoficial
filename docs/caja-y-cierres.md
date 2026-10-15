# Mi caja y cierres

PetFlow incorpora **Mi caja** como sección principal para cada miembro que no tenga rol `viewer`.

## Apertura

Al entrar en **Mi caja**, si no existe una caja abierta para el negocio aparece **Abrir mi caja**. La persona carga el monto físico inicial y confirma. Sólo puede existir una caja abierta por pet shop.

## Durante la jornada

El sistema calcula en tiempo real:

- Monto inicial.
- Ventas cobradas en efectivo desde la apertura.
- Ingresos manuales.
- Retiros manuales.
- Efectivo esperado.

Los movimientos manuales requieren monto, tipo y motivo. Las ventas con tarjeta, transferencia u otros medios no se suman al efectivo.

## Cierre

La persona cuenta el efectivo y lo carga en **Efectivo contado**. La función segura `close_cash_register` calcula y guarda:

`diferencia = efectivo contado - efectivo esperado`

El cierre es inmutable desde la interfaz: una vez cerrado, la caja no puede reabrirse ni modificarse. La migración `0005_cash_registers.sql` crea las tablas, índices, RLS y funciones RPC.

## Seguridad

Las operaciones de caja se aíslan por `pet_shop_id`. Los usuarios `owner`, `manager` y `staff` pueden abrir y operar la caja; `viewer` sólo puede consultar registros permitidos. La validación se ejecuta en Supabase mediante funciones `security definer`; no se confía únicamente en la interfaz.

Aplicar la migración antes de usar la sección en producción. No se insertan datos ficticios durante las pruebas.
