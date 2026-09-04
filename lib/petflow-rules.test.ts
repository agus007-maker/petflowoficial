import { describe, expect, it } from "vitest";
import { assertPetMatchesClient, prepareSaleRequest, ticketFilename, validateProductDraft } from "./petflow-rules";

describe("reglas operativas de PetFlow", () => {
  it("consolida líneas de venta repetidas sin exceder el stock", () => {
    expect(prepareSaleRequest([
      { productId: "a", quantity: 1, availableStock: 3 },
      { productId: "a", quantity: 2, availableStock: 3 },
      { productId: "b", quantity: 1, availableStock: 1 },
    ])).toEqual([{ product_id: "a", quantity: 3 }, { product_id: "b", quantity: 1 }]);
  });

  it("rechaza ventas sin artículos, cantidades inválidas o stock insuficiente", () => {
    expect(() => prepareSaleRequest([])).toThrow("al menos un producto");
    expect(() => prepareSaleRequest([{ productId: "a", quantity: 0, availableStock: 1 }])).toThrow("entero mayor a cero");
    expect(() => prepareSaleRequest([{ productId: "a", quantity: 2, availableStock: 1 }])).toThrow("supera el stock");
  });

  it("valida la edición de inventario y el vínculo entre cliente y mascota", () => {
    expect(() => validateProductDraft({ name: "", category: "General", stock: 1, minStock: 0, costPrice: 0, salePrice: 10 })).toThrow("obligatorio");
    expect(() => validateProductDraft({ name: "Shampoo", category: "Higiene", stock: -1, minStock: 0, costPrice: 10, salePrice: 20 })).toThrow("negativos");
    expect(() => assertPetMatchesClient("client-1", "client-2")).toThrow("no pertenece");
    expect(() => assertPetMatchesClient("client-1", "client-1")).not.toThrow();
  });

  it("crea nombres de archivo consistentes para los tickets descargables", () => {
    expect(ticketFilename("d1b4c7a5-0000-0000-0000-000000000000")).toBe("petflow-ticket-D1B4C7A5.pdf");
  });
});
