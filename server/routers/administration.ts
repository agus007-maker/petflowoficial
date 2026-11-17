import { z } from "zod";
import { permissionCatalog, roleDefaults, type MembershipRole, type PermissionKey } from "@shared/permissions";
import { adminProcedure, router } from "../_core/trpc";
import * as db from "../db";

const permissionKeys = permissionCatalog.map(item => item.key) as [PermissionKey, ...PermissionKey[]];
const roles = ["owner", "manager", "cashier", "assistant", "viewer"] as const;
const memberInput = z.object({
  userId: z.number().int().positive(),
  role: z.enum(roles),
  permissions: z.array(z.object({ permission: z.enum(permissionKeys), enabled: z.boolean() })).max(permissionCatalog.length),
});

export const administrationRouter = router({
  catalog: adminProcedure.query(() => ({ permissionCatalog, roleDefaults })),
  members: adminProcedure.query(async ({ ctx }) => {
    const members = await db.listShopMembers(ctx.user.id);
    const enriched = await Promise.all(members.map(async row => ({
      ...row,
      permissions: await db.getMemberPermissions(ctx.user.id, row.membership.id),
    })));
    return { members: enriched, availableUsers: await db.listAvailableUsers(ctx.user.id) };
  }),
  saveMember: adminProcedure.input(memberInput).mutation(({ ctx, input }) => db.saveShopMember(ctx.user.id, input)),
  suspendMember: adminProcedure.input(z.object({ membershipId: z.number().int().positive() })).mutation(({ ctx, input }) => db.suspendShopMember(ctx.user.id, input.membershipId)),
});

export type AdministrationRole = MembershipRole;
