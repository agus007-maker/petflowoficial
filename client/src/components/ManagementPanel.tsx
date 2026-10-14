import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Percent, ShieldCheck, UserCog } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string;
  name: string;
  category: string;
  sale_price: number | string;
  active: boolean;
};

type Sale = {
  id: string;
  total: number | string;
  payment_method: string;
  created_at: string;
};

type Appointment = { id: string; service: string; scheduled_at: string; status: string };
type Client = { id: string; full_name: string };

type Props = {
  shopId: string;
  userId: string;
  products: Product[];
  sales: Sale[];
  appointments: Appointment[];
  clients: Client[];
  reload: () => Promise<void>;
  fail: (error: unknown) => void;
};

const supabase = createClient();
const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map(row => row.map(cell => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ManagementPanel({ shopId, userId, products, sales, appointments, clients, reload, fail }: Props) {
  const [tab, setTab] = useState<"prices" | "roles" | "report">("prices");
  const [percent, setPercent] = useState("10");
  const [category, setCategory] = useState("all");
  const [scope, setScope] = useState("active");
  const [savingPrices, setSavingPrices] = useState(false);
  const [members, setMembers] = useState<Array<{ id: string; user_id: string; role: string }>>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));

  const targets = useMemo(() => products.filter(product =>
    (scope === "all" || (scope === "active" && product.active)) &&
    (category === "all" || product.category === category),
  ), [products, scope, category]);
  const rate = Number(percent) || 0;

  async function applyPriceIncrease() {
    if (!targets.length || rate <= 0) return;
    if (!window.confirm(`Se actualizará el precio de ${targets.length} producto(s) en un ${rate}%. ¿Continuar?`)) return;
    setSavingPrices(true);
    try {
      const { error } = await supabase.rpc("apply_price_increase", {
        p_pet_shop_id: shopId,
        p_percent: rate,
        p_category: category === "all" ? null : category,
        p_scope: scope,
      });
      if (error) return fail(error);
      await reload();
    } catch (error) {
      fail(error);
    } finally {
      setSavingPrices(false);
    }
  }

  async function loadMembers() {
    setLoadingMembers(true);
    setMemberError("");
    const { data, error } = await supabase
      .from("pet_shop_memberships")
      .select("id,user_id,role")
      .eq("pet_shop_id", shopId);
    if (error) setMemberError("La tabla de membresías todavía no tiene roles configurados. Aplicá la migración de permisos antes de usar este panel.");
    else setMembers((data ?? []) as Array<{ id: string; user_id: string; role: string }>);
    setLoadingMembers(false);
  }

  async function changeRole(memberId: string, role: string) {
    const { error } = await supabase.rpc("change_pet_shop_member_role", {
      p_pet_shop_id: shopId,
      p_membership_id: memberId,
      p_role: role,
      p_permissions: {},
    });
    if (error) return fail(error);
    await loadMembers();
  }

  function exportReport() {
    const daySales = sales.filter(sale => sale.created_at.slice(0, 10) === reportDate);
    const dayAppointments = appointments.filter(appointment => appointment.scheduled_at.slice(0, 10) === reportDate);
    const total = daySales.reduce((sum, sale) => sum + Number(sale.total), 0);
    downloadCsv(`petflow-reporte-${reportDate}.csv`, [
      ["PetFlow - Reporte diario", reportDate],
      [],
      ["Resumen", "Valor"],
      ["Ventas", String(daySales.length)],
      ["Ingresos", money.format(total)],
      ["Turnos", String(dayAppointments.length)],
      ["Clientes registrados", String(clients.length)],
      [],
      ["Ventas del día", "Fecha", "Medio de pago", "Total"],
      ...daySales.map(sale => [sale.id, new Date(sale.created_at).toLocaleString("es-AR"), sale.payment_method, money.format(Number(sale.total))]),
      [],
      ["Turnos del día", "Servicio", "Estado", "Horario"],
      ...dayAppointments.map(appointment => [appointment.id, appointment.service, appointment.status, new Date(appointment.scheduled_at).toLocaleString("es-AR")]),
    ]);
  }

  return <div className="stack">
    <section className="panel management-panel">
      <div className="panel-head"><div><p className="kicker">ADMINISTRACIÓN DEL NEGOCIO</p><h2>Herramientas de gestión</h2></div><ShieldCheck /></div>
      <div className="mode-switch">
        <button className={tab === "prices" ? "selected" : ""} onClick={() => setTab("prices")}><Percent />Aumento de precios</button>
        <button className={tab === "roles" ? "selected" : ""} onClick={() => { setTab("roles"); void loadMembers(); }}><UserCog />Roles y permisos</button>
        <button className={tab === "report" ? "selected" : ""} onClick={() => setTab("report")}><FileSpreadsheet />Reporte diario</button>
      </div>
      {tab === "prices" && <div className="management-section"><div><p className="kicker">ACTUALIZACIÓN MASIVA</p><h3>Aumentar precios generales</h3><p className="hint">Calculá una vista previa y aplicá el porcentaje sólo a los artículos elegidos. La modificación se limita a este pet shop.</p></div><div className="form-grid"><label>Porcentaje<input type="number" min="0.01" step="0.01" value={percent} onChange={event => setPercent(event.target.value)} /></label><label>Alcance<select value={scope} onChange={event => setScope(event.target.value)}><option value="active">Productos activos</option><option value="all">Todos los productos</option></select></label><label>Categoría<select value={category} onChange={event => setCategory(event.target.value)}><option value="all">Todas las categorías</option>{Array.from(new Set(products.map(product => product.category))).map(item => <option key={item}>{item}</option>)}</select></label></div><div className="price-preview"><strong>{targets.length} productos seleccionados</strong>{targets.slice(0, 5).map(product => <div className="row" key={product.id}><span>{product.name}</span><span>{money.format(Number(product.sale_price))} → <b>{money.format(Number(product.sale_price) * (1 + rate / 100))}</b></span></div>)}</div><button className="primary" disabled={savingPrices || !targets.length || rate <= 0} onClick={applyPriceIncrease}>{savingPrices ? "Aplicando…" : `Aplicar aumento del ${rate}%`}</button></div>}
      {tab === "roles" && <div className="management-section"><p className="hint">El propietario puede cambiar el rol de miembros existentes. Los permisos se aplican en la base de datos mediante RLS; no se confía sólo en la interfaz.</p>{loadingMembers ? <p>Consultando miembros…</p> : memberError ? <p className="form-note">{memberError}</p> : members.length ? members.map(member => <div className="row" key={member.id}><div><strong>{member.user_id === userId ? "Vos (propietario)" : member.user_id}</strong><small>Miembro del pet shop</small></div><select value={member.role || "staff"} disabled={member.user_id === userId} onChange={event => void changeRole(member.id, event.target.value)}><option value="owner">Propietario</option><option value="manager">Encargado</option><option value="staff">Vendedor</option><option value="viewer">Consulta</option></select></div>) : <p className="empty-copy">No hay miembros para administrar.</p>}</div>}
      {tab === "report" && <div className="management-section"><p className="kicker">EXPORTACIÓN DIARIA</p><h3>Reporte compatible con Excel</h3><p className="hint">El archivo CSV usa separador punto y coma y codificación UTF-8, por lo que se abre correctamente en Excel en configuración regional argentina.</p><label>Fecha del reporte<input type="date" value={reportDate} onChange={event => setReportDate(event.target.value)} /></label><div className="metrics"><div className="metric"><p>Ventas</p><strong>{sales.filter(sale => sale.created_at.slice(0, 10) === reportDate).length}</strong></div><div className="metric"><p>Turnos</p><strong>{appointments.filter(appointment => appointment.scheduled_at.slice(0, 10) === reportDate).length}</strong></div></div><button className="primary" onClick={exportReport}><Download />Descargar reporte de Excel</button><p className="hint">La programación automática y el envío por correo requieren configurar un cron de producción y un proveedor de correo; esta pantalla deja lista la generación del archivo.</p></div>}
    </section>
  </div>;
}
