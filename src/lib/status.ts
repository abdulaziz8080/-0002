import type { Item, Org } from "./api";

export type Status = "متأخر" | "قريب" | "تنبيه" | "آمن" | "منجز";

export const STATUS_ORDER: Record<Status, number> = { متأخر: 0, قريب: 1, تنبيه: 2, آمن: 3, منجز: 4 };

export const STATUS_STYLE: Record<Status, { bg: string; text: string }> = {
  متأخر: { bg: "#fdeceb", text: "#b3261e" },
  قريب: { bg: "#fff6e0", text: "#9a6700" },
  تنبيه: { bg: "#e9f0fb", text: "#1a5fb4" },
  آمن: { bg: "#e8f6ee", text: "#1a7f45" },
  منجز: { bg: "#eef2f9", text: "#5f7189" },
};

export function daysUntil(iso: string) {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${iso}T00:00:00`).getTime() - t.getTime()) / 864e5);
}

export function statusOf(item: Item): Status {
  if (item.done) return "منجز";
  const d = daysUntil(item.dueDate);
  if (d < 0) return "متأخر";
  if (d <= 14) return "قريب";
  if (d <= item.leadDays) return "تنبيه";
  return "آمن";
}

const num = new Intl.NumberFormat("ar-SA");
export const fmtNum = (n: number) => num.format(n);
export const fmtMoney = (n: number) => `${num.format(n)} ريال`;

export function fmtCount(n: number) {
  if (n === 0) return "لا التزامات";
  if (n === 1) return "التزام واحد";
  if (n === 2) return "التزامان";
  return n <= 10 ? `${fmtNum(n)} التزامات` : `${fmtNum(n)} التزاماً`;
}

export function fmtDays(n: number) {
  if (n === 0) return "اليوم";
  if (n === 1) return "يوم واحد";
  if (n === 2) return "يومان";
  return n <= 10 ? `${fmtNum(n)} أيام` : `${fmtNum(n)} يوماً`;
}

export function relDue(d: number) {
  return d < 0 ? `متأخر ${fmtDays(Math.abs(d))}` : `بعد ${fmtDays(d)}`;
}

const dateFmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { year: "numeric", month: "long", day: "numeric" });
export const fmtDate = (iso?: string | null) => (iso ? dateFmt.format(new Date(`${iso}T00:00:00`)) : "—");

export function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
}

export type Flat = { org: Org; item: Item; status: Status };

export function flatten(orgs: Org[]): Flat[] {
  return orgs
    .flatMap((org) => org.items.map((item) => ({ org, item, status: statusOf(item) })))
    .sort((a, b) => daysUntil(a.item.dueDate) - daysUntil(b.item.dueDate));
}

export function summarize(orgs: Org[]) {
  const all = flatten(orgs);
  const overdue = all.filter((f) => f.status === "متأخر");
  const soon = all.filter((f) => {
    const d = daysUntil(f.item.dueDate);
    return d >= 0 && d <= 30 && !f.item.done;
  });
  const risky = [...overdue, ...soon];
  return {
    orgCount: orgs.length,
    total: all.length,
    overdue: overdue.length,
    soon: soon.length,
    exposure: risky.reduce((s, f) => s + f.item.estimatedCost, 0),
    atRiskOrgs: new Set(risky.map((f) => f.org.id)).size,
  };
}

export function orgSummary(org: Org) {
  const open = org.items.filter((i) => !i.done);
  const overdue = open.filter((i) => daysUntil(i.dueDate) < 0);
  const soon = open.filter((i) => {
    const d = daysUntil(i.dueDate);
    return d >= 0 && d <= 30;
  });
  const worst = open.reduce<Status>((acc, i) => (STATUS_ORDER[statusOf(i)] < STATUS_ORDER[acc] ? statusOf(i) : acc), "منجز");
  return {
    org,
    total: org.items.length,
    overdue: overdue.length,
    soon: soon.length,
    exposure: [...overdue, ...soon].reduce((s, i) => s + i.estimatedCost, 0),
    nearest: open.length ? Math.min(...open.map((i) => daysUntil(i.dueDate))) : null,
    worst: open.length ? worst : ("منجز" as Status),
  };
}

export function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob(["\uFEFF", content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function csvCell(v: unknown) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
