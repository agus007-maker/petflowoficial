import { describe, expect, it } from "vitest";
import { calculateCashDifference, calculateExpectedCash } from "./cash-rules";

describe("cash closing rules", () => {
  it("calculates expected cash using only cash movements", () => {
    expect(calculateExpectedCash(10000, [
      { movementType: "sale", paymentMethod: "cash", amount: 5000 },
      { movementType: "sale", paymentMethod: "card", amount: 7000 },
      { movementType: "cash_out", paymentMethod: "cash", amount: 1500 },
      { movementType: "refund", paymentMethod: "cash", amount: 500 },
    ])).toBe(13000);
  });

  it("reports surplus and shortage without mutating the register", () => {
    expect(calculateCashDifference(13000, 13200)).toBe(200);
    expect(calculateCashDifference(13000, 12800)).toBe(-200);
  });
});
