import type { appointmentStatusValues } from "../drizzle/schema";

export type AppointmentStatus = (typeof appointmentStatusValues)[number];

export const appointmentStatusLabel: Record<AppointmentStatus, string> = {
  scheduled: "Programado",
  confirmed: "Confirmado",
  in_progress: "En servicio",
  completed: "Completado",
  cancelled: "Cancelado",
  no_show: "No asistió",
};

export function shouldSendReminder(
  scheduledAt: Date,
  now: Date,
  leadMinutes: number,
  reminderSentAt: Date | null
) {
  if (reminderSentAt || leadMinutes < 5) return false;
  const minutesUntilAppointment = (scheduledAt.getTime() - now.getTime()) / 60_000;
  return minutesUntilAppointment > 0 && minutesUntilAppointment <= leadMinutes;
}

export function formatAppointmentMoment(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
