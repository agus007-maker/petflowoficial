import { TRPCError } from "@trpc/server";
import { parse as parseCookie } from "cookie";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
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

export const petShopRouter = router({
  dashboard: protectedProcedure.query(({ ctx }) => db.getDashboard(ctx.user.id)),

  products: router({
    list: protectedProcedure.query(({ ctx }) => db.listProducts(ctx.user.id)),
    create: protectedProcedure.input(productInput).mutation(({ ctx, input }) => db.createProduct(ctx.user.id, input)),
    changeStock: protectedProcedure.input(z.object({ id: z.number().int().positive(), adjustment: z.number().int().min(-999999).max(999999) })).mutation(({ ctx, input }) => db.changeProductStock(ctx.user.id, input.id, input.adjustment)),
  }),

  clients: router({
    list: protectedProcedure.query(({ ctx }) => db.listClients(ctx.user.id)),
    detail: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(({ ctx, input }) => db.getClientDetail(ctx.user.id, input.id)),
    create: protectedProcedure.input(z.object({ fullName: z.string().trim().min(2).max(160), phone: z.string().trim().max(48).optional(), email: z.string().trim().email().max(320).optional(), notes: z.string().trim().max(2000).optional() })).mutation(({ ctx, input }) => db.createClient(ctx.user.id, input)),
    addPet: protectedProcedure.input(z.object({ clientId: z.number().int().positive(), name: z.string().trim().min(1).max(100), species: z.string().trim().min(2).max(40), breed: z.string().trim().max(100).optional(), notes: z.string().trim().max(2000).optional() })).mutation(({ ctx, input }) => db.addPet(ctx.user.id, input)),
  }),

  appointments: router({
    list: protectedProcedure.input(z.object({ day: z.date().optional() }).optional()).query(({ ctx, input }) => db.listAppointments(ctx.user.id, input?.day)),
    create: protectedProcedure.input(z.object({ clientId: z.number().int().positive(), petId: z.number().int().positive(), service: z.string().trim().min(2).max(100), scheduledAt: z.date(), durationMinutes: z.number().int().min(15).max(480), notes: z.string().trim().max(2000).optional() })).mutation(({ ctx, input }) => db.createAppointment(ctx.user.id, input)),
    updateStatus: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: appointmentStatus })).mutation(async ({ ctx, input }) => {
      const existing = await db.getAppointment(ctx.user.id, input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Turno no encontrado." });
      if (existing.appointment.status === input.status) return { changed: false };
      await db.updateAppointmentStatus(ctx.user.id, input.id, input.status);
      const title = `Turno ${appointmentStatusLabel[input.status].toLowerCase()}`;
      const content = `${existing.petName} (${existing.clientName}) quedó marcado como ${appointmentStatusLabel[input.status].toLowerCase()}.`;
      await db.recordNotification(ctx.user.id, { appointmentId: input.id, type: "appointment_status", title, content });
      await notifyOwner({ title, content });
      return { changed: true };
    }),
  }),

  sales: router({
    create: protectedProcedure.input(z.object({ clientId: z.number().int().positive().nullable().optional(), paymentMethod: z.enum(["cash", "card", "transfer", "other"]), items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive().max(999) })).min(1).max(99) })).mutation(({ ctx, input }) => db.createSale(ctx.user.id, input)),
  }),

  notifications: router({
    list: protectedProcedure.query(({ ctx }) => db.listNotifications(ctx.user.id)),
    markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => db.markNotificationRead(ctx.user.id, input.id)),
    settings: protectedProcedure.query(({ ctx }) => db.getNotificationSettings(ctx.user.id)),
    saveSettings: protectedProcedure.input(z.object({ remindersEnabled: z.boolean(), reminderLeadMinutes: z.number().int().min(15).max(240) })).mutation(({ ctx, input }) => db.saveNotificationSettings(ctx.user.id, input)),
    activateReminders: protectedProcedure.mutation(async ({ ctx }) => {
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      if (!sessionToken) throw new TRPCError({ code: "UNAUTHORIZED", message: "Inicia sesión nuevamente para activar los recordatorios automáticos." });
      const settings = await db.getNotificationSettings(ctx.user.id);
      const description = "Revisa turnos próximos y avisa al responsable de PetFlow.";
      if (settings.scheduleCronTaskUid) {
        await updateHeartbeatJob(settings.scheduleCronTaskUid, { cron: "0 */15 * * * *", path: "/api/scheduled/appointment-reminders", description, enable: settings.remindersEnabled }, sessionToken);
        return { active: settings.remindersEnabled, alreadyConfigured: true };
      }
      const job = await createHeartbeatJob({ name: `petflow-reminders-${ctx.user.id}`, cron: "0 */15 * * * *", path: "/api/scheduled/appointment-reminders", description }, sessionToken);
      await db.saveScheduleTaskUid(ctx.user.id, job.taskUid);
      return { active: true, alreadyConfigured: false, nextExecutionAt: job.nextExecutionAt ?? null };
    }),
  }),
});
