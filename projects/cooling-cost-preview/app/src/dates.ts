const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export function koreaDate(now = new Date()): string {
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function addDays(date: string, days: number): string {
  const time = new Date(`${date}T00:00:00Z`);
  time.setUTCDate(time.getUTCDate() + days);
  return time.toISOString().slice(0, 10);
}
export const monthOf = (date: string) => date.slice(0, 7);
export const monthStart = (date: string) => `${monthOf(date)}-01`;
export function daysInMonth(date: string): number {
  const [year, month] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
