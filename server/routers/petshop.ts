import { TRPCError } from "@trpc/server";
import { parse as parseCookie } from "cookie";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import type { PermissionKey } from "@shared/permissions";
import { createHeartbeatJob, updateHeartbeatJob } from "../_core/heartbeat";
import { notifyOwner } from "../_core/notification";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { appointmentStatusLabel } from "../reminders";

const productInput = z.object({
  name: z.string().trim().min(2).max(160),
  sku: z.string().trim().max(80).optional(),
  category: z.string().trim().min(2).max(48),
  stock: z.number().int().min(0).max(999999),
  minStock: z.number().int().min(0).max(999999),
  costPrice: z.number().min(0).max(99999999),
  salePrice: z.number().positive().max(99999999),
});

const appointmentStatus = z.enum(["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"]);

async function authorizedOwner(userId: number, permission: PermissionKey) {
  const ownerUserId = await db.getShopOwnerUserId(userId);
  if (!(await db.hasPermission(userId, ownerUserId, permission))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Tu rol no tiene permiso para realizar esta acción." });
  }
  return ownerUserId;
}

export const petShopRouter = router({
  dashboard: protectedProcedure.query(async ({ ctx }) => db.getDashboard(await authorizedOwner(ctx.user.id, "dashboard.view"))),

  products: router({
    list: protectedProcedure.query(async ({ ctx }) => db.listProducts(await authorizedOwner(ctx.user.id, "inventory.view"))),
    create: protectedProcedure.input(productInput).mutation(async ({ ctx, input }) => db.createProduct(await authorizedOwner(ctx.user.id, "inventory.manage"), input)),
    changeStock: protectedProcedure.input(z.object({ id: z.number().int().positive(), adjustment: z.number().int().min(-999999).max(999999) })).mutation(async ({ ctx, input }) => db.changeProductStock(await authorizedOwner(ctx.user.id, "inventory.manage"), input.id, input.adjustment)),
  }),

  clients: router({
    list: protectedProcedure.query(async ({ ctx }) => db.listClients(await authorizedOwner(ctx.user.id, "clients.view"))),
    detail: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => db.getClientDetail(await authorizedOwner(ctx.user.id, "clients.view"), input.id)),
    create: protectedProcedure.input(z.object({ fullName: z.string().trim().min(2).max(160), phone: z.string().trim().max(48).optional(), email: z.string().trim().email().max(320).optional(), notes: z.string().trim().max(2000).optional() })).mutation(async ({ ctx, input }) => db.createClient(await authorizedOwner(ctx.user.id, "clients.manage"), input)),
    addPet: protectedProcedure.input(z.object({ clientId: z.number().int().positive(), name: z.string().trim().min(1).max(100), species: z.string().trim().min(2).max(40), breed: z.string().trim().max(100).optional(), notes: z.string().trim().max(2000).optional() })).mutation(async ({ ctx, input }) => db.addPet(await authorizedOwner(ctx.user.id, "clients.manage"), input)),
  }),

  appointments: router({
    list: protectedProcedure.input(z.object({ day: z.date().optional() }).optional()).query(async ({ ctx, input }) => db.listAppointments(await authorizedOwner(ctx.user.id, "agenda.view"), input?.day)),
    create: protectedProcedure.input(z.object({ clientId: z.number().int().positive(), petId: z.number().int().positive(), service: z.string().trim().min(2).max(100), scheduledAt: z.date(), durationMinutes: z.number().int().min(15).max(480), notes: z.string().trim().max(2000).optional() })).mutation(async ({ ctx, input }) => db.createAppointment(await authorizedOwner(ctx.user.id, "agenda.manage"), input)),
    updateStatus: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: appointmentStatus })).mutation(async ({ ctx, input }) => {
      const ownerUserId = await authorizedOwner(ctx.user.id, "agenda.manage");
      const existing = await db.getAppointment(ownerUserId, input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Turno no encontrado." });
      if (existing.appointment.status === input.status) return { changed: false };
      await db.updateAppointmentStatus(ownerUserId, input.id, input.status);
      const title = `Turno ${appointmentStatusLabel[input.status].toLowerCase()}`;
      const content = `${existing.petName} (${existing.clientName}) quedó marcado como ${appointmentStatusLabel[input.status].toLowerCase()}.`;
      await db.recordNotification(ownerUserId, { appointmentId: input.id, type: "appointment_status", title, content });
      await notifyOwner({ title, content });
      return { changed: true };
    }),
  }),

  sales: router({
    create: protectedProcedure.input(z.object({ clientId: z.number().int().positive().nullable().optional(), paymentMethod: z.enum(["cash", "card", "transfer", "other"]), items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive().max(999) })).min(1).max(99) })).mutation(async ({ ctx, input }) => db.createSale(await authorizedOwner(ctx.user.id, "pos.sell"), input)),
  }),

  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => db.listNotifications(await authorizedOwner(ctx.user.id, "alerts.view"))),
    markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => db.markNotificationRead(await authorizedOwner(ctx.user.id, "alerts.view"), input.id)),
    settings: protectedProcedure.query(async ({ ctx }) => db.getNotificationSettings(await authorizedOwner(ctx.user.id, "alerts.view"))),
    saveSettings: protectedProcedure.input(z.object({ remindersEnabled: z.boolean(), reminderLeadMinutes: z.number().int().min(15).max(240) })).mutation(async ({ ctx, input }) => db.saveNotificationSettings(await authorizedOwner(ctx.user.id, "alerts.manage"), input)),
    activateReminders: protectedProcedure.mutation(async ({ ctx }) => {
      const ownerUserId = await authorizedOwner(ctx.user.id, "alerts.manage");
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      if (!sessionToken) throw new TRPCError({ code: "UNAUTHORIZED", message: "Inicia sesión nuevamente para activar los recordatorios automáticos." });
      const settings = await db.getNotificationSettings(ownerUserId);
      const description = "Revisa turnos próximos y avisa al responsable de PetFlow.";
      if (settings.scheduleCronTaskUid) {
        await updateHeartbeatJob(settings.scheduleCronTaskUid, { cron: "0 */15 * * * *", path: "/api/scheduled/appointment-reminders", description, enable: settings.remindersEnabled }, sessionToken);
        return { active: settings.remindersEnabled, alreadyConfigured: true };
      }
      const job = await createHeartbeatJob({ name: `petflow-reminders-${ownerUserId}`, cron: "0 */15 * * * *", path: "/api/scheduled/appointment-reminders", description }, sessionToken);
      await db.saveScheduleTaskUid(ownerUserId, job.taskUid);
      return { active: true, alreadyConfigured: false, nextExecutionAt: job.nextExecutionAt ?? null };
    }),
  }),
});
