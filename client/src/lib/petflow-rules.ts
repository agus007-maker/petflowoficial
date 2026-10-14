export type SaleRequestLine = { productId: string; quantity: number; availableStock: number };

export function prepareSaleRequest(lines: SaleRequestLine[]) {
  if (!lines.length) throw new Error("La venta debe tener al menos un producto.");
  const grouped = new Map<string, SaleRequestLine>();

  for (const line of lines) {
    if (!line.productId) throw new Error("Cada línea debe identificar un producto.");
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) throw new Error("La cantidad debe ser un entero mayor a cero.");
    const previous = grouped.get(line.productId);
    const combined = (previous?.quantity ?? 0) + line.quantity;
    if (combined > line.availableStock) throw new Error("La cantidad solicitada supera el stock disponible.");
    grouped.set(line.productId, { ...line, quantity: combined });
  }

  return [...grouped.values()].map(line => ({ product_id: line.productId, quantity: line.quantity }));
}

export function validateProductDraft(input: { name: string; category: string; stock: number; minStock: number; costPrice: number; salePrice: number }) {
  if (!input.name.trim()) throw new Error("El nombre del artículo es obligatorio.");
  if (!input.category.trim()) throw new Error("La categoría es obligatoria.");
  if (![input.stock, input.minStock, input.costPrice, input.salePrice].every(Number.isFinite)) throw new Error("Completá valores numéricos válidos.");
  if (input.stock < 0 || input.minStock < 0 || input.costPrice < 0 || input.salePrice < 0) throw new Error("Stock y precios no pueden ser negativos.");
}

export function assertPetMatchesClient(clientId: string, petClientId: string) {
  if (!clientId || clientId !== petClientId) throw new Error("La mascota no pertenece al cliente seleccionado.");
}

export function ticketFilename(saleId: string) {
  return `petflow-ticket-${saleId.slice(0, 8).toUpperCase()}.pdf`;
}


export type PriceIncreaseMode = "percent" | "fixed";
export type PriceIncreaseScope = { kind: "all-active" } | { kind: "category"; category: string };
export type PriceCandidate = { id: string; name: string; category: string; sale_price: number | string; active: boolean };
export type PriceIncreaseRow = { id: string; name: string; category: string; previousPrice: number; newPrice: number; increase: number };
export type PriceIncreasePreview = { rows: PriceIncreaseRow[]; eligibleCount: number; unchangedCount: number };

export function previewPriceIncrease(
  products: PriceCandidate[],
  scope: PriceIncreaseScope,
  mode: PriceIncreaseMode,
  value: number,
): PriceIncreasePreview {
  if (mode !== "percent" && mode !== "fixed") throw new Error("Elegí un tipo de aumento válido.");
  if (!Number.isFinite(value) || value <= 0) throw new Error("El aumento debe ser un número mayor a cero.");
  if (scope.kind === "category" && !scope.category.trim()) throw new Error("Elegí una categoría para el aumento.");

  const eligible = products.filter(product => product.active && (scope.kind === "all-active" || product.category === scope.category));
  if (!eligible.length) throw new Error("No hay productos activos dentro del alcance seleccionado.");

  const rows: PriceIncreaseRow[] = [];
  let unchangedCount = 0;
  for (const product of eligible) {
    const previousPrice = Number(product.sale_price);
    if (!Number.isFinite(previousPrice) || previousPrice < 0) throw new Error(`El precio de ${product.name || "un producto"} no es válido; no se puede preparar el lote.`);
    const unrounded = mode === "percent" ? previousPrice * (1 + value / 100) : previousPrice + value;
    if (!Number.isFinite(unrounded) || unrounded > Number.MAX_SAFE_INTEGER / 100) throw new Error("El aumento supera el rango numérico permitido.");
    const newPrice = Math.round((unrounded + Number.EPSILON) * 100) / 100;
    if (newPrice <= previousPrice) {
      unchangedCount += 1;
      continue;
    }
    rows.push({ id: product.id, name: product.name, category: product.category, previousPrice, newPrice, increase: Math.round((newPrice - previousPrice + Number.EPSILON) * 100) / 100 });
  }
  return { rows, eligibleCount: eligible.length, unchangedCount };
}
