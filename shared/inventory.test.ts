import { describe, expect, it } from "vitest";
import { filterInventoryProducts } from "./inventory";

const products = [
  { name: "Alimento Premium", sku: "AL-01", category: "Alimentos", stock: 8, minStock: 3 },
  { name: "Juguete Kong", sku: "JK-02", category: "Juguetes", stock: 2, minStock: 3 },
  { name: "Shampoo", sku: "SH-03", category: "Higiene y salud", stock: 0, minStock: 2 },
];

describe("filtros de inventario", () => {
  it("busca por nombre o SKU y filtra por categoría", () => {
    expect(filterInventoryProducts(products, "jk-02", "Juguetes", "all")).toHaveLength(1);
    expect(filterInventoryProducts(products, "", "Alimentos", "all")[0]?.name).toBe("Alimento Premium");
  });

  it("separa productos disponibles, bajo mínimo y sin stock", () => {
    expect(filterInventoryProducts(products, "", "Todas", "available")).toHaveLength(1);
    expect(filterInventoryProducts(products, "", "Todas", "low")).toHaveLength(1);
    expect(filterInventoryProducts(products, "", "Todas", "out")).toHaveLength(1);
  });
});
