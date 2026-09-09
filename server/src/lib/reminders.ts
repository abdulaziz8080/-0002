import type { Item, Office, Org } from "@prisma/client";
import { prisma } from "./db.js";
import { daysBetween, formatArabicDate, normalizePhone, todayISO } from "./dates.js";
import { isConnected, sendText } from "./whatsapp.js";

const nf = new Intl.NumberFormat("en-US");

type ItemWithOrg = Item & { org: Org };

/** يحدد هل يستحق البند تذكيراً اليوم، وما مفتاح المرحلة (لمنع التكرار) */
export function milestoneFor(item: Item, today: string): string | null {
  if (item.done) return null;
  const d = daysBetween(today, item.dueDate);
  if (d < 0) return `overdue:${today}`;
  if (d === 0) return "d0";
  if (d === 7) return "d7";
  if (d === 14) return "d14";
  if (d === 30) return "d30";
  if (d <= item.leadDays && d > 30) return "lead";
  return null;
}

function statusLine(item: Item, today: string) {
  const d = daysBetween(today, item.dueDate);
  if (d < 0) return `⛔ متأخر ${nf.format(-d)} يوم`;
  if (d === 0) return "🔴 يستحق اليوم";
  if (d <= 7) return `🟠 باقي ${nf.format(d)} أيام`;
  return `🟡 باقي ${nf.format(d)} يوم`;
}

export function buildOfficeDigest(office: Office, items: ItemWithOrg[], today: string) {
  const byOrg = new Map<string, ItemWithOrg[]>();
  for (const it of items) {
    const list = byOrg.get(it.orgId) ?? [];
    list.push(it);
    byOrg.set(it.orgId, list);
  }
  const exposure = items.reduce((s, i) => s + i.estimatedCost, 0);
  const lines: string[] = [];
  lines.push(`*تنبيه ملتزم — ${formatArabicDate(today)}*`);
  lines.push(`المكتب: ${office.name}`);
  lines.push(`${nf.format(items.length)} التزام يحتاج متابعة · تعرّض تقديري ${nf.format(exposure)} ريال`);
  lines.push("");
  for (const [, list] of byOrg) {
    const org = list[0].org;
    lines.push(`🏢 *${org.name}*${org.crNumber ? ` (س.ت ${org.crNumber})` : ""}`);
    for (const it of list.sort((a, b) => a.dueDate.localeCompare(b.dueDate))) {
      lines.push(`  • ${it.name} — ${it.authority}`);
      lines.push(`    ${statusLine(it, today)} · الاستحقاق ${formatArabicDate(it.dueDate)}`);
    }
    lines.push("");
  }
  lines.push("ملتزم — تنبيه تنظيمي، والمرجع النهائي هو الجهة المختصة.");
  return lines.join("\n");
}

export function buildOrgMessage(office: Office, org: Org, items: Item[], today: string) {
  const lines: string[] = [];
  lines.push(`*تنبيه من ${office.name}*`);
  lines.push(`المنشأة: ${org.name}`);
  lines.push("");
  for (const it of items.sort((a, b) => a.dueDate.localeCompare(b.dueDate))) {
    lines.push(`• ${it.name} (${it.authority})`);
    lines.push(`  ${statusLine(it, today)} · الاستحقاق ${formatArabicDate(it.dueDate)}`);
  }
  lines.push("");
  lines.push("نرجو التواصل معنا لاستكمال التجديد قبل الموعد.");
  return lines.join("\n");
}

/** أرقام المنشأة التي تستقبل تذكيراتها: أرقامها المسجّلة + رقم المسؤول إن فعّل المكتب ذلك */
export function orgPhones(office: Office, org: Org): string[] {
  if (!org.notifyEnabled) return [];
  const raw = org.alertPhones.split(",");
  if (office.notifyOrgContacts) raw.push(org.contactPhone);
  return [...new Set(raw.map((p) => normalizePhone(p)).filter((p): p is string => !!p))];
}

export type RunResult = {
  officeId: string;
  officeName: string;
  dueItems: number;
  sent: number;
  skipped: string | null;
};

async function alreadyLogged(itemId: string, milestone: string, to: string) {
  return (await prisma.reminderLog.findUnique({
    where: { itemId_milestone_to: { itemId, milestone, to } },
  })) !== null;
}

async function log(
  officeId: string,
  itemId: string,
  milestone: string,
  to: string,
  message: string,
  status: "sent" | "failed" | "skipped",
  error?: string,
) {
  await prisma.reminderLog.upsert({
    where: { itemId_milestone_to: { itemId, milestone, to } },
    create: { officeId, itemId, milestone, to, message, status, error },
    update: { status, error, sentAt: new Date() },
  });
}

/** يفحص مكتباً واحداً ويرسل ما يستحق. dryRun = يحسب فقط بدون إرسال */
export async function runForOffice(office: Office, opts: { dryRun?: boolean } = {}): Promise<RunResult> {
  const today = todayISO(office.timezone);
  const items = await prisma.item.findMany({
    where: { org: { officeId: office.id }, done: false },
    include: { org: true },
  });

  const due: { item: ItemWithOrg; milestone: string }[] = [];
  for (const item of items) {
    const m = milestoneFor(item, today);
    if (m) due.push({ item, milestone: m });
  }

  const result: RunResult = {
    officeId: office.id,
    officeName: office.name,
    dueItems: due.length,
    sent: 0,
    skipped: null,
  };
  if (due.length === 0) return result;

  const phones = office.alertPhones
    .split(",")
    .map((p) => normalizePhone(p))
    .filter((p): p is string => !!p);

  if (!isConnected(office.id)) {
    result.skipped = "واتساب المكتب غير متصل";
    return result;
  }
  if (opts.dryRun) return result;

  // رسالة مجمّعة للمكتب — تُرسل فقط للبنود التي لم تُسجَّل لهذه المرحلة
  for (const to of phones) {
    const fresh: typeof due = [];
    for (const d of due) {
      if (!(await alreadyLogged(d.item.id, d.milestone, to))) fresh.push(d);
    }
    if (fresh.length === 0) continue;
    const message = buildOfficeDigest(
      office,
      fresh.map((f) => f.item),
      today,
    );
    try {
      await sendText(office.id, to, message);
      result.sent += 1;
      for (const f of fresh) await log(office.id, f.item.id, f.milestone, to, message, "sent");
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      for (const f of fresh) await log(office.id, f.item.id, f.milestone, to, message, "failed", err);
    }
  }

  // رسائل خاصة بكل منشأة إلى أرقامها المسجّلة
  const byOrg = new Map<string, typeof due>();
  for (const d of due) {
    const list = byOrg.get(d.item.orgId) ?? [];
    list.push(d);
    byOrg.set(d.item.orgId, list);
  }
  for (const [, list] of byOrg) {
    const org = list[0].item.org;
    for (const to of orgPhones(office, org)) {
      const fresh: typeof due = [];
      for (const d of list) {
        if (!(await alreadyLogged(d.item.id, d.milestone, to))) fresh.push(d);
      }
      if (fresh.length === 0) continue;
      const message = buildOrgMessage(
        office,
        org,
        fresh.map((f) => f.item),
        today,
      );
      try {
        await sendText(office.id, to, message);
        result.sent += 1;
        for (const f of fresh) await log(office.id, f.item.id, f.milestone, to, message, "sent");
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        for (const f of fresh) await log(office.id, f.item.id, f.milestone, to, message, "failed", err);
      }
    }
  }

  return result;
}

export async function runAll(opts: { dryRun?: boolean } = {}) {
  const offices = await prisma.office.findMany({ where: { role: "office", status: "active" } });
  const results: RunResult[] = [];
  for (const office of offices) {
    try {
      results.push(await runForOffice(office, opts));
    } catch (e) {
      results.push({
        officeId: office.id,
        officeName: office.name,
        dueItems: 0,
        sent: 0,
        skipped: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return results;
}
