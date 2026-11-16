import { closeDb, getDashboard, getSettingsByTaskUid, listAppointments, listClients, listNotifications, listProducts } from "../server/db";

const ownerUserId = 0;
const timeoutMs = 15_000;

async function readWithTimeout<T>(name: string, read: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      read(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${name} excedió ${timeoutMs} ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

try {
  const dashboard = await readWithTimeout("Dashboard", () => getDashboard(ownerUserId));
  const products = await readWithTimeout("Inventario", () => listProducts(ownerUserId));
  const clients = await readWithTimeout("Clientes y mascotas", () => listClients(ownerUserId));
  const appointments = await readWithTimeout("Agenda", () => listAppointments(ownerUserId));
  const notifications = await readWithTimeout("Alertas", () => listNotifications(ownerUserId));
  const heartbeatLookup = await readWithTimeout("Heartbeat", () => getSettingsByTaskUid("petflow-verification-task-not-found"));

  console.log(JSON.stringify({
    ok: true,
    readOnly: true,
    modules: {
      dashboard: { metrics: dashboard.metrics },
      inventory: { rows: products.length },
      clientsAndPets: { rows: clients.length },
      agenda: { rows: appointments.length },
      notifications: { rows: notifications.length },
      heartbeat: { settingsLookup: heartbeatLookup === undefined ? "ok" : "unexpected-row" },
    },
  }, null, 2));
} finally {
  await closeDb();
}
