export type CashMovement = { movementType: "sale" | "cash_in" | "cash_out" | "refund" | "opening_adjustment"; paymentMethod: string; amount: number };

export function calculateExpectedCash(openingAmount: number, movements: CashMovement[]): number {
  if (!Number.isFinite(openingAmount) || openingAmount < 0) throw new Error("El monto de apertura no es válido.");
  return movements.reduce((total, movement) => {
    if (!Number.isFinite(movement.amount) || movement.amount <= 0) throw new Error("El movimiento debe ser positivo.");
    if (movement.paymentMethod !== "cash") return total;
    if (movement.movementType === "cash_out" || movement.movementType === "refund") return total - movement.amount;
    return total + movement.amount;
  }, openingAmount);
}

export function calculateCashDifference(expectedCash: number, countedCash: number): number {
  if (!Number.isFinite(expectedCash) || !Number.isFinite(countedCash) || countedCash < 0) throw new Error("El efectivo contado no es válido.");
  return countedCash - expectedCash;
}
