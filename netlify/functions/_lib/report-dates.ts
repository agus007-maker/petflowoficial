export function dateInZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function shiftCalendarDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days, 12));
  return shifted.toISOString().slice(0, 10);
}

function localMidnightUtc(date: string, timeZone: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const targetAsUtc = Date.UTC(year, month - 1, day, 0, 0, 0);
  let candidate = targetAsUtc;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(candidate));
    const get = (type: string) => Number(parts.find(part => part.type === type)?.value);
    const representedAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    const correction = targetAsUtc - representedAsUtc;
    candidate += correction;
    if (correction === 0) break;
  }
  return new Date(candidate);
}

export function localDayUtcRange(date: string, timeZone: string): { start: Date; end: Date } {
  return {
    start: localMidnightUtc(date, timeZone),
    end: localMidnightUtc(shiftCalendarDate(date, 1), timeZone),
  };
}
