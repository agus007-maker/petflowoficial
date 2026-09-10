import { describe, expect, it } from "vitest";
import { calculateBulkPrice, can, diagnosticFingerprint, previewBulkPriceUpdate, shouldNotifyFailure, summarizeDiagnostics } from "./petflow-core";

describe("PetFlow core rules", () => {
  it("previews percentage and fixed price updates with rounding", () => {
    const products = [{ id: "1", name: "Alimento", category: "Alimentos", sale_price: 35000 }];
    expect(calculateBulkPrice(35000, { mode: "percent", amount: 10, roundTo: 100 })).toBe(38500);
    expect(calculateBulkPrice(35000, { mode: "fixed", amount: 500, roundTo: 100 })).toBe(35500);
    expect(previewBulkPriceUpdate(products, { mode: "percent", amount: 10, roundTo: 100 })[0]).toMatchObject({ previousPrice: 35000, newPrice: 38500 });
  });

  it("enforces owner, manager and seller permissions", () => {
    expect(can("owner", "change_prices")).toBe(true);
    expect(can("manager", "change_prices")).toBe(false);
    expect(can("seller", "void_sales")).toBe(false);
    expect(can("seller", "sell")).toBe(true);
  });

  it("summarizes failures and avoids duplicate notifications", () => {
    const failure = { name: "database", ok: false, severity: "critical" as const, detail: "timeout", durationMs: 30 };
    expect(summarizeDiagnostics([failure, { name: "auth", ok: true, severity: "info", detail: "ok", durationMs: 4 }])).toEqual({ total: 2, passed: 1, warnings: 0, critical: 1 });
    expect(shouldNotifyFailure(failure, [])).toBe(true);
    expect(shouldNotifyFailure(failure, [diagnosticFingerprint(failure)])).toBe(false);
  });
});
