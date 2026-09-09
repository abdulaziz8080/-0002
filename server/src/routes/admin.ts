import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../lib/auth.js";
import { prisma } from "../lib/db.js";

/** لوحة إدارة الموقع — مدير واحد (role=admin) يدير المكاتب والاشتراكات والدعم */
export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

const officeSelect = {
  id: true,
  name: true,
  email: true,
  contactPhone: true,
  contactEmail: true,
  alertPhones: true,
  role: true,
  plan: true,
  status: true,
  planExpiresAt: true,
  adminNote: true,
  createdAt: true,
  waSession: { select: { status: true, phone: true, connectedAt: true } },
  _count: { select: { orgs: true, tickets: true } },
} as const;

adminRouter.get("/overview", async (_req, res) => {
  const [offices, active, suspended, orgs, items, openTickets, sentToday] = await Promise.all([
    prisma.office.count({ where: { role: "office" } }),
    prisma.office.count({ where: { role: "office", status: "active" } }),
    prisma.office.count({ where: { role: "office", status: "suspended" } }),
    prisma.org.count(),
    prisma.item.count(),
    prisma.supportTicket.count({ where: { status: "open" } }),
    prisma.reminderLog.count({
      where: { status: "sent", sentAt: { gte: new Date(Date.now() - 24 * 3600_000) } },
    }),
  ]);
  const byPlan = await prisma.office.groupBy({
    by: ["plan"],
    where: { role: "office" },
    _count: { _all: true },
  });
  res.json({
    offices,
    active,
    suspended,
    orgs,
    items,
    openTickets,
    sentToday,
    byPlan: Object.fromEntries(byPlan.map((p) => [p.plan, p._count._all])),
  });
});

adminRouter.get("/offices", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";
  const offices = await prisma.office.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : undefined,
    select: officeSelect,
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  res.json({ offices });
});

const officePatch = z.object({
  plan: z.enum(["trial", "basic", "pro"]).optional(),
  status: z.enum(["active", "suspended"]).optional(),
  planExpiresAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((d) => !Number.isNaN(Date.parse(d)))
    .nullable()
    .optional(),
  adminNote: z.string().trim().max(1000).optional(),
});

adminRouter.patch("/offices/:id", async (req, res) => {
  const parsed = officePatch.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "بيانات غير صالحة" });
  const target = await prisma.office.findUnique({ where: { id: req.params.id }, select: { role: true } });
  if (!target) return res.status(404).json({ error: "المكتب غير موجود" });
  if (target.role === "admin") return res.status(400).json({ error: "لا يمكن تعديل حساب المدير من هنا" });
  const { planExpiresAt, ...rest } = parsed.data;
  const office = await prisma.office.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      ...(planExpiresAt !== undefined
        ? { planExpiresAt: planExpiresAt ? new Date(planExpiresAt) : null }
        : {}),
    },
    select: officeSelect,
  });
  res.json({ office });
});

adminRouter.post("/offices/:id/reset-password", async (req, res) => {
  const parsed = z.object({ next: z.string().min(8).max(128) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "كلمة المرور ٨ أحرف على الأقل" });
  const target = await prisma.office.findUnique({ where: { id: req.params.id }, select: { role: true } });
  if (!target) return res.status(404).json({ error: "المكتب غير موجود" });
  if (target.role === "admin") return res.status(400).json({ error: "غيّر كلمة مرورك من الإعدادات" });
  await prisma.office.update({
    where: { id: req.params.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.next, 12) },
  });
  res.json({ ok: true });
});

adminRouter.delete("/offices/:id", async (req, res) => {
  const target = await prisma.office.findUnique({ where: { id: req.params.id }, select: { role: true } });
  if (!target) return res.status(404).json({ error: "المكتب غير موجود" });
  if (target.role === "admin") return res.status(400).json({ error: "لا يمكن حذف حساب المدير" });
  await prisma.office.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

adminRouter.get("/tickets", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const tickets = await prisma.supportTicket.findMany({
    where: status && ["open", "answered", "closed"].includes(status) ? { status } : undefined,
    include: { office: { select: { id: true, name: true, email: true, contactPhone: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  res.json({ tickets });
});

const ticketPatch = z.object({
  reply: z.string().trim().max(4000).optional(),
  status: z.enum(["open", "answered", "closed"]).optional(),
});

adminRouter.patch("/tickets/:id", async (req, res) => {
  const parsed = ticketPatch.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "بيانات غير صالحة" });
  const exists = await prisma.supportTicket.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!exists) return res.status(404).json({ error: "البلاغ غير موجود" });
  const data = { ...parsed.data };
  if (data.reply && !data.status) data.status = "answered";
  const ticket = await prisma.supportTicket.update({
    where: { id: req.params.id },
    data,
    include: { office: { select: { id: true, name: true, email: true, contactPhone: true } } },
  });
  res.json({ ticket });
});

const phones = z.string().trim().max(60).regex(/^[\d\s+\-()]*$/);
const siteSchema = z.object({
  supportPhone: phones.optional(),
  supportWhatsapp: phones.optional(),
  supportEmail: z.union([z.literal(""), z.string().trim().email().max(120)]).optional(),
  supportHours: z.string().trim().max(120).optional(),
  announcement: z.string().trim().max(500).optional(),
});

adminRouter.patch("/site", async (req, res) => {
  const parsed = siteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "بيانات غير صالحة" });
  const settings = await prisma.siteSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...parsed.data },
    update: parsed.data,
  });
  res.json({ settings });
});
