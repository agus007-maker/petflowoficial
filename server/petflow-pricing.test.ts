import { describe, expect, it } from "vitest";
import { previewPriceIncrease, type PriceCandidate } from "../client/src/lib/petflow-rules";

const products: PriceCandidate[] = [
  { id: "1", name: "Alimento", category: "Alimentos", sale_price: 1000, active: true },
  { id: "2", name: "Pelota", category: "Juguetes", sale_price: "250.00", active: true },
  { id: "3", name: "Inactivo", category: "Alimentos", sale_price: 500, active: false },
  { id: "4", name: "Sin cargo", category: "Alimentos", sale_price: 0, active: true },
];

describe("previewPriceIncrease", () => {
  it("aplica el porcentaje al catálogo activo y no incluye inactivos", () => {
    const result = previewPriceIncrease(products, { kind: "all-active" }, "percent", 10);
    expect(result.rows.map(row => [row.id, row.newPrice])).toEqual([["1", 1100], ["2", 275]]);
    expect(result.eligibleCount).toBe(3);
    expect(result.unchangedCount).toBe(1);
  });

  it("aplica un importe fijo únicamente a la categoría elegida", () => {
    const result = previewPriceIncrease(products, { kind: "category", category: "Juguetes" }, "fixed", 99.9);
    expect(result.rows).toEqual([{ id: "2", name: "Pelota", category: "Juguetes", previousPrice: 250, newPrice: 349.9, increase: 99.9 }]);
    expect(result.eligibleCount).toBe(1);
  });

  it("redondea a centavos para moneda ARS", () => {
    const result = previewPriceIncrease([{ ...products[0], sale_price: 19.99 }], { kind: "all-active" }, "percent", 10);
    expect(result.rows[0].newPrice).toBe(21.99);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("rechaza valores de aumento inválidos: %s", value => {
    expect(() => previewPriceIncrease(products, { kind: "all-active" }, "fixed", value)).toThrow("mayor a cero");
  });

  it("no devuelve productos para una categoría vacía", () => {
    expect(() => previewPriceIncrease(products, { kind: "category", category: "" }, "fixed", 10)).toThrow("Elegí una categoría");
  });
});
