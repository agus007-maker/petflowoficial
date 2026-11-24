export type InventoryFilterProduct = {
  name: string;
  sku?: string | null;
  category: string;
  stock: number;
  minStock: number;
};

export type InventoryStockFilter = "all" | "available" | "low" | "out";

export function filterInventoryProducts<T extends InventoryFilterProduct>(
  products: T[],
  search: string,
  category: string,
  stockFilter: InventoryStockFilter,
): T[] {
  const term = search.trim().toLocaleLowerCase();
  return products.filter(product => {
    const matchesSearch = !term || `${product.name} ${product.sku ?? ""}`.toLocaleLowerCase().includes(term);
    const matchesCategory = category === "Todas" || product.category === category;
    const matchesStock = stockFilter === "all"
      || (stockFilter === "available" && product.stock > product.minStock)
      || (stockFilter === "low" && product.stock > 0 && product.stock <= product.minStock)
      || (stockFilter === "out" && product.stock <= 0);
    return matchesSearch && matchesCategory && matchesStock;
  });
}
