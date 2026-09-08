import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../lib/auth.js";
import { addDaysISO, todayISO } from "../lib/dates.js";
import { prisma } from "../lib/db.js";
import { OBLIGATION_TEMPLATES } from "../lib/obligations.js";

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

const orgSchema = z.object({
  name: z.string().min(2, "اسم المنشأة قصير"),
  crNumber: z.string().optional().default(""),
  city: z.string().optional().default(""),
  contactName: z.string().optional().default(""),
  contactPhone: z.string().optional().default(""),
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

const itemSchema = z.object({
  templateId: z.string(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ غير صالح"),
  note: z.string().optional().default(""),
  estimatedCost: z.number().int().nonnegative().optional(),
  leadDays: z.number().int().positive().optional(),
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
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    note: z.string().optional(),
    done: z.boolean().optional(),
    estimatedCost: z.number().int().nonnegative().optional(),
    leadDays: z.number().int().positive().optional(),
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
