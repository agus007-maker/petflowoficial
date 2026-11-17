import { describe, expect, it } from "vitest";
import { permissionCatalog, roleDefaults } from "./permissions";

describe("PetFlow roles and permissions", () => {
  it("keeps every catalog permission available to the manager role except administration", () => {
    const businessPermissions = permissionCatalog.map(item => item.key).filter(key => key !== "administration.manage");
    expect(roleDefaults.manager).toEqual(businessPermissions);
    expect(roleDefaults.manager).not.toContain("administration.manage");
  });

  it("gives the cashier only operational access", () => {
    expect(roleDefaults.cashier).toContain("pos.sell");
    expect(roleDefaults.cashier).not.toContain("inventory.manage");
    expect(roleDefaults.cashier).not.toContain("administration.manage");
  });
});
