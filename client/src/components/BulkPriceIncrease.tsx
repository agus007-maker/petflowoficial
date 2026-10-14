import { useEffect, useMemo, useState, type FormEvent } from "react";
import { TrendingUp, X } from "lucide-react";
import { previewPriceIncrease, type PriceCandidate, type PriceIncreaseMode } from "@/lib/petflow-rules";
import "./PetFlowAdmin.css";

type PriceIncreaseRequest = {
  p_pet_shop_id: string;
  p_scope: "all_active" | "category";
  p_category: string | null;
  p_mode: PriceIncreaseMode;
  p_value: number;
};

type Props = {
  products: PriceCandidate[];
  shopId: string;
  currentUserId: string;
  ownerUserId?: string | null;
  apply: (request: PriceIncreaseRequest) => Promise<number>;
  onSuccess: (count: number) => void;
};

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });

export function BulkPriceIncrease({ products, shopId, currentUserId, ownerUserId, apply, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"all_active" | "category">("all_active");
  const [category, setCategory] = useState("");
  const [mode, setMode] = useState<PriceIncreaseMode>("percent");
  const [rawValue, setRawValue] = useState("10");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const categories = useMemo(
    () => [...new Set(products.filter(product => product.active).map(product => product.category))].sort((a, b) => a.localeCompare(b, "es")),
    [products],
  );
  const numericValue = Number(rawValue.trim().replace(",", "."));
  const preview = useMemo(() => {
    try {
      const selection = scope === "all_active" ? { kind: "all-active" as const } : { kind: "category" as const, category };
      return { result: previewPriceIncrease(products, selection, mode, numericValue), error: "" };
    } catch (error) {
      return { result: null, error: error instanceof Error ? error.message : "Revisá los datos del aumento." };
    }
  }, [products, scope, category, mode, numericValue]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, saving]);

  if (!ownerUserId || currentUserId !== ownerUserId) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = preview.result;
    if (!result?.rows.length || saving) return;
    setSubmitError("");
    setSaving(true);
    try {
      const count = await apply({
        p_pet_shop_id: shopId,
        p_scope: scope,
        p_category: scope === "category" ? category : null,
        p_mode: mode,
        p_value: numericValue,
      });
      onSuccess(count);
      setOpen(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No se pudo actualizar el catálogo. No se confirmó ningún cambio.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="panel bulk-price-launcher" aria-labelledby="bulk-price-heading">
        <div>
          <p className="kicker">ACTUALIZACIÓN DE CATÁLOGO</p>
          <h2 id="bulk-price-heading">Ajustar varios precios a la vez</h2>
          <p>Revisá el alcance y los nuevos importes antes de confirmar.</p>
        </div>
        <button className="secondary" type="button" onClick={() => { setSubmitError(""); setOpen(true); }}>
          <TrendingUp aria-hidden="true" /> Aumentar precios
        </button>
      </section>

      {open && (
        <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setOpen(false); }}>
          <section className="modal bulk-price-modal" role="dialog" aria-modal="true" aria-labelledby="bulk-price-title">
            <button className="modal-close" type="button" aria-label="Cerrar" onClick={() => !saving && setOpen(false)}>
              <X aria-hidden="true" />
            </button>
            <p className="kicker">CAMBIO MASIVO · VISTA PREVIA</p>
            <h2 id="bulk-price-title">Aumentar precios</h2>
            <p className="modal-copy">El aumento se aplicará a productos activos. Las ventas ya realizadas conservarán sus importes históricos.</p>

            <form className="form-grid" onSubmit={submit}>
              <label className="field full">
                <span>Alcance</span>
                <select value={scope} onChange={event => setScope(event.target.value as "all_active" | "category")}>
                  <option value="all_active">Todos los productos activos</option>
                  <option value="category">Una categoría</option>
                </select>
              </label>
              {scope === "category" && (
                <label className="field full">
                  <span>Categoría</span>
                  <select value={category} onChange={event => setCategory(event.target.value)} required>
                    <option value="">Elegir categoría</option>
                    {categories.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              )}
              <label className="field">
                <span>Tipo de aumento</span>
                <select value={mode} onChange={event => setMode(event.target.value as PriceIncreaseMode)}>
                  <option value="percent">Porcentaje</option>
                  <option value="fixed">Importe fijo (ARS)</option>
                </select>
              </label>
              <label className="field">
                <span>{mode === "percent" ? "Aumento (%)" : "Aumento (ARS)"}</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={rawValue}
                  onChange={event => setRawValue(event.target.value)}
                  required
                />
              </label>

              <div className="bulk-price-preview full" aria-live="polite">
                <div className="bulk-price-preview-head">
                  <strong>{preview.result?.rows.length ?? 0} productos recibirán un cambio</strong>
                  <span>{preview.result?.eligibleCount ?? 0} activos en el alcance</span>
                </div>
                {preview.error ? <p className="bulk-price-error">{preview.error}</p> : null}
                {preview.result?.rows.length ? (
                  <div className="bulk-price-rows">
                    {preview.result.rows.slice(0, 5).map(row => (
                      <div className="bulk-price-row" key={row.id}>
                        <span>{row.name}</span>
                        <strong>{money.format(row.previousPrice)} <span aria-hidden="true">→</span> {money.format(row.newPrice)}</strong>
                      </div>
                    ))}
                    {preview.result.rows.length > 5 ? <p className="bulk-price-more">y {preview.result.rows.length - 5} artículos más</p> : null}
                    {preview.result.unchangedCount > 0 ? <p className="bulk-price-more">{preview.result.unchangedCount} producto(s) con precio cero no cambian con un porcentaje.</p> : null}
                  </div>
                ) : null}
              </div>

              {submitError ? <p className="bulk-price-error full" role="alert">{submitError}</p> : null}
              <div className="bulk-price-actions full">
                <button className="secondary" type="button" disabled={saving} onClick={() => setOpen(false)}>Cancelar</button>
                <button className="primary" type="submit" disabled={saving || !preview.result?.rows.length}>
                  {saving ? "Actualizando…" : "Confirmar aumento"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
