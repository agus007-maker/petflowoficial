import { describe, expect, it } from "vitest";
import { appointmentStatusLabel, shouldSendReminder } from "./reminders";

describe("appointment reminders", () => {
  const now = new Date("2026-08-31T12:00:00.000Z");

  it("marks a pending appointment inside the configured lead time as eligible", () => {
    expect(shouldSendReminder(new Date("2026-08-31T12:45:00.000Z"), now, 60, null)).toBe(true);
  });

  it("does not notify an appointment already notified or outside the configured lead time", () => {
    expect(shouldSendReminder(new Date("2026-08-31T12:45:00.000Z"), now, 60, new Date())).toBe(false);
    expect(shouldSendReminder(new Date("2026-08-31T13:30:00.000Z"), now, 60, null)).toBe(false);
  });

  it("exposes human-readable status labels for operational notifications", () => {
    expect(appointmentStatusLabel.completed).toBe("Completado");
    expect(appointmentStatusLabel.in_progress).toBe("En servicio");
  });
});
