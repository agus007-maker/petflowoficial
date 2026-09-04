import { describe, expect, it } from "vitest";
import { paymentLabel } from "./tickets";

describe("tickets de venta", () => {
  it("presenta un medio de pago legible en los comprobantes", () => {
    expect(paymentLabel("cash")).toBe("Efectivo");
    expect(paymentLabel("card")).toBe("Tarjeta");
    expect(paymentLabel("transfer")).toBe("Transferencia");
    expect(paymentLabel("other")).toBe("Otro");
  });
});
