export const permissionCatalog = [
  { key: "dashboard.view", label: "Ver resumen", group: "Operación" },
  { key: "inventory.view", label: "Consultar inventario", group: "Operación" },
  { key: "inventory.manage", label: "Editar inventario y precios", group: "Operación" },
  { key: "pos.view", label: "Abrir punto de venta", group: "Operación" },
  { key: "pos.sell", label: "Registrar ventas", group: "Operación" },
  { key: "clients.view", label: "Consultar clientes y mascotas", group: "Relaciones" },
  { key: "clients.manage", label: "Crear clientes y mascotas", group: "Relaciones" },
  { key: "agenda.view", label: "Consultar agenda", group: "Relaciones" },
  { key: "agenda.manage", label: "Crear y actualizar turnos", group: "Relaciones" },
  { key: "alerts.view", label: "Consultar alertas", group: "Control" },
  { key: "alerts.manage", label: "Configurar recordatorios", group: "Control" },
  { key: "administration.manage", label: "Administrar roles y permisos", group: "Administración" },
] as const;

export type PermissionKey = (typeof permissionCatalog)[number]["key"];
export type MembershipRole = "owner" | "manager" | "cashier" | "assistant" | "viewer";

export const roleLabels: Record<MembershipRole, string> = {
  owner: "Propietario",
  manager: "Encargado/a",
  cashier: "Caja",
  assistant: "Asistente",
  viewer: "Consulta",
};

export const roleDefaults: Record<Exclude<MembershipRole, "owner">, PermissionKey[]> = {
  manager: permissionCatalog.map(item => item.key).filter(key => key !== "administration.manage"),
  cashier: ["dashboard.view", "inventory.view", "pos.view", "pos.sell", "clients.view", "agenda.view", "alerts.view"],
  assistant: ["dashboard.view", "inventory.view", "clients.view", "clients.manage", "agenda.view", "agenda.manage", "alerts.view"],
  viewer: ["dashboard.view", "inventory.view", "clients.view", "agenda.view", "alerts.view"],
};
