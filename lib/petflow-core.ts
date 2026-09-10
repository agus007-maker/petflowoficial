export type BulkPriceMode = "percent" | "fixed";
export type BulkPriceRule = {
  mode: BulkPriceMode;
  amount: number;
  roundTo?: number;
};

export type ProductForPriceUpdate = {
  id: string;
  name: string;
  category?: string | null;
  brand?: string | null;
  supplier?: string | null;
  sale_price: number | string;
  active?: boolean;
};

export function matchesPriceFilter(
  product: ProductForPriceUpdate,
  filter: { category?: string; brand?: string; supplier?: string; ids?: string[] } = {},
): boolean {
  if (filter.ids?.length && !filter.ids.includes(product.id)) return false;
  if (filter.category && filter.category !== "all" && product.category !== filter.category) return false;
  if (filter.brand && filter.brand !== "all" && product.brand !== filter.brand) return false;
  if (filter.supplier && filter.supplier !== "all" && product.supplier !== filter.supplier) return false;
  return true;
}

export function calculateBulkPrice(price: number, rule: BulkPriceRule): number {
  if (!Number.isFinite(price) || price < 0) throw new Error("El precio actual no es válido.");
  if (!Number.isFinite(rule.amount) || rule.amount < 0) throw new Error("El ajuste debe ser un número positivo.");
  const next = rule.mode === "percent" ? price * (1 + rule.amount / 100) : price + rule.amount;
  const roundTo = rule.roundTo ?? 1;
  if (!Number.isFinite(roundTo) || roundTo <= 0) throw new Error("El redondeo debe ser mayor que cero.");
  return Math.round(next / roundTo) * roundTo;
}

export function previewBulkPriceUpdate(
  products: ProductForPriceUpdate[],
  rule: BulkPriceRule,
  filter?: Parameters<typeof matchesPriceFilter>[1],
) {
  return products
    .filter((product) => matchesPriceFilter(product, filter))
    .map((product) => ({ ...product, previousPrice: Number(product.sale_price), newPrice: calculateBulkPrice(Number(product.sale_price), rule) }));
}

export type PetFlowRole = "owner" | "manager" | "seller";
export type PetFlowAction = "view_sales" | "view_profit" | "change_prices" | "manage_products" | "manage_stock" | "create_users" | "manage_permissions" | "view_reports" | "manage_cash" | "void_sales" | "refund_sales" | "manage_settings" | "sell" | "manage_clients" | "close_cash" | "print_ticket";

const permissions: Record<PetFlowRole, readonly PetFlowAction[]> = {
  owner: ["view_sales", "view_profit", "change_prices", "manage_products", "manage_stock", "create_users", "manage_permissions", "view_reports", "manage_cash", "void_sales", "refund_sales", "manage_settings", "sell", "manage_clients", "close_cash", "print_ticket"],
  manager: ["view_sales", "manage_stock", "view_reports", "sell", "manage_clients", "close_cash", "print_ticket"],
  seller: ["sell", "manage_clients", "print_ticket"],
};

export function can(role: PetFlowRole, action: PetFlowAction): boolean {
  return permissions[role].includes(action);
}

export type DiagnosticResult = { name: string; ok: boolean; severity: "info" | "warning" | "critical"; detail: string; durationMs: number };

export function summarizeDiagnostics(results: DiagnosticResult[]) {
  return {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    warnings: results.filter((result) => !result.ok && result.severity === "warning").length,
    critical: results.filter((result) => !result.ok && result.severity === "critical").length,
  };
}

export function diagnosticFingerprint(result: DiagnosticResult): string {
  return `${result.name}:${result.severity}:${result.detail}`.toLowerCase().replace(/\s+/g, " ").trim();
}

export function shouldNotifyFailure(current: DiagnosticResult, previousFingerprints: readonly string[]): boolean {
  return !current.ok && !previousFingerprints.includes(diagnosticFingerprint(current));
}
