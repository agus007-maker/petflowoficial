import { useEffect, useMemo, useState } from "react";
import { Banknote, CheckCircle2, CircleAlert, LogIn, LogOut, Plus, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Sale = { total: number | string; payment_method: string; created_at: string };
type CashRegister = { id: string; opened_at: string; opening_amount: number | string; status: "open" | "closed"; counted_amount?: number | string | null; expected_amount?: number | string | null; difference?: number | string | null };
type CashMovement = { id: string; movement_type: "cash_in" | "cash_out"; amount: number | string; reason: string; created_at: string };

type Props = { shopId: string; sales: Sale[]; fail: (error: unknown) => void };
const supabase = createClient();
const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

export default function CashRegisterPanel({ shopId, sales, fail }: Props) {
  const [register, setRegister] = useState<CashRegister | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingAmount, setOpeningAmount] = useState("");
  const [countedAmount, setCountedAmount] = useState("");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const [movementType, setMovementType] = useState<"cash_in" | "cash_out">("cash_in");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("cash_registers").select("*").eq("pet_shop_id", shopId).eq("status", "open").maybeSingle();
    if (error) fail(error);
    setRegister((data as CashRegister | null) ?? null);
    if (data) {
      const movementsResult = await supabase.from("cash_movements").select("*").eq("cash_register_id", data.id).order("created_at", { ascending: false });
      if (movementsResult.error) fail(movementsResult.error);
      setMovements((movementsResult.data ?? []) as CashMovement[]);
    } else setMovements([]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, [shopId]);

  const cashSales = useMemo(() => register ? sales.filter(sale => sale.payment_method === "cash" && new Date(sale.created_at) >= new Date(register.opened_at)).reduce((sum, sale) => sum + Number(sale.total), 0) : 0, [register, sales]);
  const cashIn = movements.filter(item => item.movement_type === "cash_in").reduce((sum, item) => sum + Number(item.amount), 0);
  const cashOut = movements.filter(item => item.movement_type === "cash_out").reduce((sum, item) => sum + Number(item.amount), 0);
  const expected = Number(register?.opening_amount ?? 0) + cashSales + cashIn - cashOut;

  async function openRegister() {
    const amount = Number(openingAmount);
    if (!Number.isFinite(amount) || amount < 0) return;
    setSaving(true);
    const { data, error } = await supabase.rpc("open_cash_register", { p_pet_shop_id: shopId, p_opening_amount: amount });
    if (error) fail(error); else { setRegister(data as CashRegister); setOpeningAmount(""); setNotice("Caja abierta correctamente."); await load(); }
    setSaving(false);
  }
  async function addMovement() {
    if (!register) return;
    const amount = Number(movementAmount);
    if (!Number.isFinite(amount) || amount <= 0 || !movementReason.trim()) return;
    setSaving(true);
    const { error } = await supabase.rpc("add_cash_movement", { p_cash_register_id: register.id, p_movement_type: movementType, p_amount: amount, p_reason: movementReason.trim() });
    if (error) fail(error); else { setMovementAmount(""); setMovementReason(""); setNotice("Movimiento registrado."); await load(); }
    setSaving(false);
  }
  async function closeRegister() {
    if (!register) return;
    const amount = Number(countedAmount);
    if (!Number.isFinite(amount) || amount < 0) return;
    if (!window.confirm("¿Confirmás el cierre de la caja? Esta operación no se puede editar.")) return;
    setSaving(true);
    const { data, error } = await supabase.rpc("close_cash_register", { p_cash_register_id: register.id, p_counted_amount: amount });
    if (error) fail(error); else { setRegister(data as CashRegister); setCountedAmount(""); setNotice("Caja cerrada. Revisa la diferencia del cierre."); }
    setSaving(false);
  }

  if (loading) return <div className="panel"><p>Consultando estado de caja…</p></div>;
  if (!register) return <div className="stack"><section className="cash-empty panel"><Banknote /><p className="kicker">MI CAJA</p><h2>Abrir mi caja</h2><p>Ingresá el efectivo disponible al comenzar tu jornada. Las ventas en efectivo y los movimientos manuales se sumarán automáticamente.</p><label>Monto inicial<input type="number" min="0" step="0.01" value={openingAmount} onChange={event => setOpeningAmount(event.target.value)} placeholder="0,00" /></label><button className="primary" disabled={saving || openingAmount === ""} onClick={() => void openRegister()}><LogIn />{saving ? "Abriendo…" : "Abrir caja"}</button></section></div>;

  return <div className="stack"><section className="cash-header panel"><div><p className="kicker">MI CAJA · ABIERTA</p><h2>Caja abierta</h2><p className="hint">Desde {new Date(register.opened_at).toLocaleString("es-AR")}</p></div><button className="secondary" onClick={() => void load()} disabled={saving}><RefreshCw />Actualizar</button></section><div className="metrics cash-metrics"><div className="metric"><p>Monto inicial</p><strong>{money.format(Number(register.opening_amount))}</strong></div><div className="metric"><p>Ventas en efectivo</p><strong>{money.format(cashSales)}</strong></div><div className="metric"><p>Efectivo esperado</p><strong>{money.format(expected)}</strong></div><div className="metric"><p>Movimientos</p><strong>{movements.length}</strong></div></div><div className="cash-columns"><section className="panel"><div className="panel-head"><div><p className="kicker">MOVIMIENTOS</p><h3>Ingresos y retiros</h3></div></div><div className="form-grid"><label>Tipo<select value={movementType} onChange={event => setMovementType(event.target.value as "cash_in" | "cash_out")}><option value="cash_in">Ingreso manual</option><option value="cash_out">Retiro manual</option></select></label><label>Monto<input type="number" min="0.01" step="0.01" value={movementAmount} onChange={event => setMovementAmount(event.target.value)} /></label><label className="full">Motivo<input value={movementReason} onChange={event => setMovementReason(event.target.value)} placeholder="Ej. cambio para caja" /></label></div><button className="secondary" disabled={saving || !movementAmount || !movementReason.trim()} onClick={() => void addMovement()}><Plus />Registrar movimiento</button>{movements.length ? movements.map(item => <div className="row" key={item.id}><div><strong>{item.movement_type === "cash_in" ? "Ingreso" : "Retiro"}</strong><small>{item.reason} · {new Date(item.created_at).toLocaleTimeString("es-AR")}</small></div><strong className={item.movement_type === "cash_in" ? "success-text" : "danger-text"}>{item.movement_type === "cash_in" ? "+" : "−"}{money.format(Number(item.amount))}</strong></div>) : <p className="empty-copy">No hay movimientos manuales.</p>}</section><section className="panel cash-close"><p className="kicker">CIERRE DEL DÍA</p><h3>Conciliar efectivo</h3><p className="hint">Contá el efectivo físico y comparalo con el monto esperado. La diferencia puede ser positiva o negativa.</p><div className="close-summary"><div><span>Efectivo esperado</span><strong>{money.format(expected)}</strong></div><div><span>Ventas en efectivo</span><strong>{money.format(cashSales)}</strong></div><div><span>Ingresos / retiros</span><strong>{money.format(cashIn - cashOut)}</strong></div></div><label>Efectivo contado<input type="number" min="0" step="0.01" value={countedAmount} onChange={event => setCountedAmount(event.target.value)} placeholder={expected.toFixed(2)} /></label><button className="primary full" disabled={saving || countedAmount === ""} onClick={() => void closeRegister()}><LogOut />Cerrar caja</button>{notice && <p className="form-note"><CheckCircle2 /> {notice}</p>}</section></div></div>;
}
