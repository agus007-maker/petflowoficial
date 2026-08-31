export type SaleRequestItem = { productId: number; quantity: number };
export type SaleProduct = { id: number; name: string; stock: number; salePrice: string | number };

export class PetShopRuleError extends Error {}

export function petBelongsToClient(petClientId: number, selectedClientId: number) {
  return petClientId === selectedClientId;
}

export function buildSaleLines(items: SaleRequestItem[], availableProducts: SaleProduct[]) {
  const uniqueIds = Array.from(new Set(items.map(item => item.productId)));
  if (uniqueIds.length !== items.length) {
    throw new PetShopRuleError("Cada producto debe aparecer una sola vez en la venta.");
  }
  if (!items.length) throw new PetShopRuleError("La venta debe incluir al menos un producto.");

  const lines = items.map(item => {
    if (item.quantity < 1) throw new PetShopRuleError("La cantidad debe ser mayor a cero.");
    const product = availableProducts.find(candidate => candidate.id === item.productId);
    if (!product) throw new PetShopRuleError("Uno de los productos ya no está disponible.");
    if (product.stock < item.quantity) throw new PetShopRuleError(`${product.name} no tiene stock suficiente.`);
    const unitPrice = Number(product.salePrice);
    return { ...item, product, unitPrice, lineTotal: unitPrice * item.quantity };
  });

  return { lines, total: lines.reduce((sum, line) => sum + line.lineTotal, 0) };
}
