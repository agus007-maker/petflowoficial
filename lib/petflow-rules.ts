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
