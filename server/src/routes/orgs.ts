import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../lib/auth.js";
import { addDaysISO, todayISO } from "../lib/dates.js";
import { prisma } from "../lib/db.js";
import { OBLIGATION_TEMPLATES } from "../lib/obligations.js";
import { buildOrgMessage, milestoneFor, orgPhones } from "../lib/reminders.js";
import * as wa from "../lib/whatsapp.js";

export const orgsRouter = Router();
orgsRouter.use(requireAuth);

const orgInclude = { items: { include: { renewals: { orderBy: { createdAt: "desc" as const } } } } };

orgsRouter.get("/", async (req, res) => {
  const orgs = await prisma.org.findMany({
    where: { officeId: req.officeId },
    include: orgInclude,
    orderBy: { createdAt: "asc" },
  });
  res.json({ orgs });
});

const short = (max: number) => z.string().trim().max(max).optional().default("");
const phones = z.string().trim().max(300).regex(/^[\d\s+,\-()]*$/, "الأرقام تحتوي رموزاً غير مسموحة");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ غير صالح").refine((d) => !Number.isNaN(Date.parse(d)), "تاريخ غير صالح");
const days = z.number().int().positive().max(3650);
const money = z.number().int().nonnegative().max(1_000_000_000);

const orgSchema = z.object({
  name: z.string().trim().min(2, "اسم المنشأة قصير").max(120),
  crNumber: short(30),
  city: short(60),
  contactName: short(80),
  contactPhone: phones.optional().default(""),
  contactEmail: z.union([z.literal(""), z.string().trim().email("بريد غير صالح").max(120)]).optional().default(""),
  alertPhones: phones.optional().default(""),
  notifyEnabled: z.boolean().optional().default(true),
});

orgsRouter.post("/", async (req, res) => {
  const parsed = orgSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });
  const org = await prisma.org.create({
    data: { ...parsed.data, officeId: req.officeId },
    include: orgInclude,
  });
  res.status(201).json({ org });
});

orgsRouter.patch("/:orgId", async (req, res) => {
  const parsed = orgSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });
  const owned = await prisma.org.findFirst({ where: { id: req.params.orgId, officeId: req.officeId } });
  if (!owned) return res.status(404).json({ error: "المنشأة غير موجودة" });
  const org = await prisma.org.update({ where: { id: owned.id }, data: parsed.data, include: orgInclude });
  res.json({ org });
});

orgsRouter.delete("/:orgId", async (req, res) => {
  const owned = await prisma.org.findFirst({ where: { id: req.params.orgId, officeId: req.officeId } });
  if (!owned) return res.status(404).json({ error: "المنشأة غير موجودة" });
  await prisma.org.delete({ where: { id: owned.id } });
  res.json({ ok: true });
});

async function ownedOrg(orgId: string, officeId: string) {
  return prisma.org.findFirst({ where: { id: orgId, officeId }, include: { items: true } });
}

/** معاينة رسالة اليوم الخاصة بالمنشأة والأرقام التي ستستقبلها */
orgsRouter.get("/:orgId/whatsapp/preview", async (req, res) => {
  const org = await ownedOrg(req.params.orgId, req.officeId);
  if (!org) return res.status(404).json({ error: "المنشأة غير موجودة" });
  const office = await prisma.office.findUniqueOrThrow({ where: { id: req.officeId } });
  const today = todayISO(office.timezone);
  const due = org.items.filter((i) => milestoneFor(i, today));
  res.json({
    today,
    dueCount: due.length,
    recipients: orgPhones(office, org),
    message: due.length ? buildOrgMessage(office, org, due, today) : null,
  });
});

/** إرسال تذكير المنشأة الآن إلى أرقامها (خارج جدول Cron، بدون قيد التكرار) */
orgsRouter.post("/:orgId/whatsapp/send", async (req, res) => {
  const org = await ownedOrg(req.params.orgId, req.officeId);
  if (!org) return res.status(404).json({ error: "المنشأة غير موجودة" });
  const office = await prisma.office.findUniqueOrThrow({ where: { id: req.officeId } });
  if (!wa.isConnected(office.id)) return res.status(409).json({ error: "واتساب المكتب غير متصل" });
  const today = todayISO(office.timezone);
  const due = org.items.filter((i) => milestoneFor(i, today));
  if (due.length === 0) return res.json({ sent: 0, recipients: [], message: "لا توجد التزامات تستحق التنبيه اليوم" });
  const recipients = orgPhones(office, org);
  if (recipients.length === 0) return res.status(400).json({ error: "لا توجد أرقام واتساب مسجّلة للمنشأة" });
  const message = buildOrgMessage(office, org, due, today);
  let sent = 0;
  const errors: string[] = [];
  for (const to of recipients) {
    const milestone = `manual:${Date.now()}`;
    try {
      await wa.sendText(office.id, to, message);
      sent += 1;
      await prisma.reminderLog.create({
        data: { officeId: office.id, itemId: due[0].id, milestone, to, message, status: "sent" },
      });
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      errors.push(`${to}: ${err}`);
      await prisma.reminderLog.create({
        data: { officeId: office.id, itemId: due[0].id, milestone, to, message, status: "failed", error: err },
      });
    }
  }
  res.json({ sent, recipients, errors });
});

orgsRouter.get("/:orgId/whatsapp/log", async (req, res) => {
  const org = await ownedOrg(req.params.orgId, req.officeId);
  if (!org) return res.status(404).json({ error: "المنشأة غير موجودة" });
  const logs = await prisma.reminderLog.findMany({
    where: { officeId: req.officeId, item: { orgId: org.id } },
    orderBy: { sentAt: "desc" },
    take: 100,
    include: { item: { select: { name: true, org: { select: { name: true } } } } },
  });
  res.json({ logs });
});

const itemSchema = z.object({
  templateId: z.string().max(40),
  dueDate: isoDate,
  note: short(1000),
  reference: short(80),
  estimatedCost: money.optional(),
  leadDays: days.optional(),
});

orgsRouter.post("/:orgId/items", async (req, res) => {
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });
  const owned = await prisma.org.findFirst({ where: { id: req.params.orgId, officeId: req.officeId } });
  if (!owned) return res.status(404).json({ error: "المنشأة غير موجودة" });
  const t = OBLIGATION_TEMPLATES.find((x) => x.id === parsed.data.templateId);
  if (!t) return res.status(400).json({ error: "نوع الالتزام غير معروف" });
  const item = await prisma.item.create({
    data: {
      orgId: owned.id,
      templateId: t.id,
      name: t.name,
      authority: t.authority,
      category: t.category,
      dueDate: parsed.data.dueDate,
      leadDays: parsed.data.leadDays ?? t.leadDays,
      cycleDays: t.cycleDays,
      estimatedCost: parsed.data.estimatedCost ?? t.estimatedCost,
      reference: parsed.data.reference,
      note: parsed.data.note,
    },
    include: { renewals: true },
  });
  res.status(201).json({ item });
});

async function ownedItem(itemId: string, officeId: string) {
  return prisma.item.findFirst({ where: { id: itemId, org: { officeId } } });
}

orgsRouter.patch("/:orgId/items/:itemId", async (req, res) => {
  const schema = z.object({
    dueDate: isoDate.optional(),
    note: z.string().trim().max(1000).optional(),
    reference: z.string().trim().max(80).optional(),
    done: z.boolean().optional(),
    estimatedCost: money.optional(),
    leadDays: days.optional(),
    cycleDays: days.optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });
  const it = await ownedItem(req.params.itemId, req.officeId);
  if (!it) return res.status(404).json({ error: "البند غير موجود" });
  const item = await prisma.item.update({ where: { id: it.id }, data: parsed.data, include: { renewals: true } });
  res.json({ item });
});

/** جُدِّد: يحسب الاستحقاق التالي حسب دورة الجهة ويسجّل التجديد */
orgsRouter.post("/:orgId/items/:itemId/renew", async (req, res) => {
  const it = await ownedItem(req.params.itemId, req.officeId);
  if (!it) return res.status(404).json({ error: "البند غير موجود" });
  const office = await prisma.office.findUniqueOrThrow({ where: { id: req.officeId } });
  const today = todayISO(office.timezone);
  const from = it.dueDate > today ? it.dueDate : today;
  const newDue = addDaysISO(from, it.cycleDays);
  const item = await prisma.item.update({
    where: { id: it.id },
    data: {
      dueDate: newDue,
      done: false,
      renewals: { create: { previousDue: it.dueDate, newDue } },
    },
    include: { renewals: { orderBy: { createdAt: "desc" } } },
  });
  res.json({ item });
});

orgsRouter.delete("/:orgId/items/:itemId", async (req, res) => {
  const it = await ownedItem(req.params.itemId, req.officeId);
  if (!it) return res.status(404).json({ error: "البند غير موجود" });
  await prisma.item.delete({ where: { id: it.id } });
  res.json({ ok: true });
});
