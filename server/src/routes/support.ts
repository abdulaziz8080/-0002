import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../lib/auth.js";
import { prisma } from "../lib/db.js";

/** الدعم: أرقام خدمة العملاء (عامة) + بلاغات المكاتب لإدارة الموقع */
export const supportRouter = Router();

export async function getSiteSettings() {
  return (
    (await prisma.siteSettings.findUnique({ where: { id: 1 } })) ??
    (await prisma.siteSettings.create({ data: { id: 1 } }))
  );
}

/** عام — يُعرض في الصفحة الرئيسية وصفحة الدعم */
supportRouter.get("/contact", async (_req, res) => {
  const s = await getSiteSettings();
  res.json({
    supportPhone: s.supportPhone,
    supportWhatsapp: s.supportWhatsapp,
    supportEmail: s.supportEmail,
    supportHours: s.supportHours,
    announcement: s.announcement,
  });
});

supportRouter.get("/tickets", requireAuth, async (req, res) => {
  const tickets = await prisma.supportTicket.findMany({
    where: { officeId: req.officeId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json({ tickets });
});

const ticketSchema = z.object({
  type: z.enum(["issue", "billing", "question"]).default("issue"),
  subject: z.string().trim().min(3, "العنوان قصير").max(150),
  body: z.string().trim().min(10, "اشرح المشكلة بعشرة أحرف على الأقل").max(4000),
});

supportRouter.post("/tickets", requireAuth, async (req, res) => {
  const parsed = ticketSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });
  const open = await prisma.supportTicket.count({ where: { officeId: req.officeId, status: "open" } });
  if (open >= 10) return res.status(429).json({ error: "لديك بلاغات مفتوحة كثيرة — انتظر الرد عليها أولاً" });
  const ticket = await prisma.supportTicket.create({ data: { officeId: req.officeId, ...parsed.data } });
  res.status(201).json({ ticket });
});

supportRouter.post("/tickets/:id/close", requireAuth, async (req, res) => {
  const r = await prisma.supportTicket.updateMany({
    where: { id: String(req.params.id), officeId: req.officeId },
    data: { status: "closed" },
  });
  if (!r.count) return res.status(404).json({ error: "البلاغ غير موجود" });
  res.json({ ok: true });
});
