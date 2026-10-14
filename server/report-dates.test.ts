import { describe, expect, it } from "vitest";
import { dateInZone, localDayUtcRange, shiftCalendarDate } from "../netlify/functions/_lib/report-dates";

describe("report date windows", () => {
  it("uses the store's local calendar date and its previous date", () => {
    const atUtc = new Date("2026-10-14T02:30:00.000Z");
    const localDate = dateInZone(atUtc, "America/Argentina/Buenos_Aires");
    expect(localDate).toBe("2026-10-13");
    expect(shiftCalendarDate(localDate, -1)).toBe("2026-10-12");
  });

  it("maps a Buenos Aires local day to its UTC interval", () => {
    const { start, end } = localDayUtcRange("2026-10-13", "America/Argentina/Buenos_Aires");
    expect(start.toISOString()).toBe("2026-10-13T03:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-14T03:00:00.000Z");
  });

  it("uses a 25-hour UTC interval on the New York fall DST transition", () => {
    const { start, end } = localDayUtcRange("2026-11-01", "America/New_York");
    expect(start.toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-02T05:00:00.000Z");
  });
});
