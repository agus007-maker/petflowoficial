import type { Request, Response } from "express";
import * as db from "./db";
import { notifyOwner } from "./_core/notification";
import { sdk } from "./_core/sdk";
import { formatAppointmentMoment, shouldSendReminder } from "./reminders";

export async function handleAppointmentReminders(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });

    const settings = await db.getSettingsByTaskUid(user.taskUid);
    if (!settings || !settings.remindersEnabled) return res.json({ ok: true, skipped: "inactive-or-orphan" });

    const now = new Date();
    const candidates = await db.findReminderCandidates(settings.ownerUserId, settings.reminderLeadMinutes, now);
    let notified = 0;
    for (const candidate of candidates) {
      if (!shouldSendReminder(candidate.appointment.scheduledAt, now, settings.reminderLeadMinutes, candidate.appointment.reminderSentAt)) continue;
      const title = "Turno próximo";
      const content = `${candidate.petName} de ${candidate.clientName} tiene ${candidate.appointment.service.toLowerCase()} ${formatAppointmentMoment(candidate.appointment.scheduledAt)}.`;
      await db.markReminderSent(settings.ownerUserId, candidate.appointment.id, now);
      await db.recordNotification(settings.ownerUserId, { appointmentId: candidate.appointment.id, type: "appointment_reminder", title, content });
      await notifyOwner({ title, content });
      notified += 1;
    }
    return res.json({ ok: true, notified });
  } catch (error) {
    const detail = error instanceof Error ? { error: error.message, stack: error.stack } : { error: String(error) };
    console.error("[Appointment reminders]", detail);
    return res.status(500).json({ ...detail, context: { url: req.originalUrl }, timestamp: new Date().toISOString() });
  }
}
