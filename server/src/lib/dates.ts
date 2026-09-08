export function todayISO(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.UTC(+fromISO.slice(0, 4), +fromISO.slice(5, 7) - 1, +fromISO.slice(8, 10));
  const b = Date.UTC(+toISO.slice(0, 4), +toISO.slice(5, 7) - 1, +toISO.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatArabicDate(iso: string): string {
  return new Intl.DateTimeFormat("ar-SA-u-nu-latn-ca-gregory", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${iso}T00:00:00Z`));
}

/** يقبل 05xxxxxxxx أو 5xxxxxxxx أو 9665xxxxxxxx أو +966... ويعيد 9665xxxxxxxx */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.length === 10 && digits.startsWith("05")) return `966${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith("5")) return `966${digits}`;
  if (digits.length >= 11) return digits;
  return null;
}
