import { describe, expect, it } from "vitest";
import { buildSaleLines, petBelongsToClient, PetShopRuleError } from "./petshopRules";

const products = [
  { id: 1, name: "Alimento adulto", stock: 8, salePrice: "12500.00" },
  { id: 2, name: "Shampoo suave", stock: 1, salePrice: "4200.00" },
];

describe("pet shop rules", () => {
  it("builds a sale total from the live product price and quantity", () => {
    const sale = buildSaleLines([{ productId: 1, quantity: 2 }, { productId: 2, quantity: 1 }], products);
    expect(sale.total).toBe(29200);
    expect(sale.lines.map(line => line.lineTotal)).toEqual([25000, 4200]);
  });

  it("rejects duplicate products and insufficient stock before creating a sale", () => {
    expect(() => buildSaleLines([{ productId: 1, quantity: 1 }, { productId: 1, quantity: 1 }], products)).toThrow(PetShopRuleError);
    expect(() => buildSaleLines([{ productId: 2, quantity: 2 }], products)).toThrow("Shampoo suave no tiene stock suficiente.");
  });

  it("accepts only the relationship between the selected client and its pet", () => {
    expect(petBelongsToClient(23, 23)).toBe(true);
    expect(petBelongsToClient(23, 88)).toBe(false);
  });
});
