import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../lib/auth.js";
import { formatArabicDate, normalizePhone, todayISO } from "../lib/dates.js";
import { prisma } from "../lib/db.js";
import { buildOfficeDigest, milestoneFor, runForOffice } from "../lib/reminders.js";
import * as wa from "../lib/whatsapp.js";

export const whatsappRouter = Router();
whatsappRouter.use(requireAuth);

whatsappRouter.get("/status", (req, res) => {
  res.json(wa.getStatus(req.officeId));
});

whatsappRouter.post("/connect", async (req, res) => {
  try {
    await wa.connect(req.officeId);
    res.json(wa.getStatus(req.officeId));
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "تعذّر بدء الجلسة" });
  }
});

whatsappRouter.post("/logout", async (req, res) => {
  await wa.logout(req.officeId);
  res.json(wa.getStatus(req.officeId));
});

/** رسالة تجريبية لرقم معيّن من جلسة المكتب */
whatsappRouter.post("/test", async (req, res) => {
  const parsed = z.object({ phone: z.string().min(9) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "رقم غير صالح" });
  const to = normalizePhone(parsed.data.phone);
  if (!to) return res.status(400).json({ error: "رقم غير صالح" });
  const office = await prisma.office.findUniqueOrThrow({ where: { id: req.officeId } });
  const today = todayISO(office.timezone);
  const text = [
    `*تنبيه ملتزم — ${formatArabicDate(today)}*`,
    `المكتب: ${office.name}`,
    "",
    "هذه رسالة تجريبية للتأكد من ربط واتساب المكتب بنجاح ✅",
    "ستصلك التذكيرات اليومية بهذا الشكل على هذا الرقم.",
    "",
    "ملتزم — تنبيه تنظيمي، والمرجع النهائي هو الجهة المختصة.",
  ].join("\n");
  try {
    await wa.sendText(req.officeId, to, text);
    await prisma.reminderLog.create({
      data: { officeId: req.officeId, milestone: `test:${Date.now()}`, to, message: text, status: "sent" },
    });
    res.json({ ok: true, to });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "فشل الإرسال" });
  }
});

/** معاينة رسالة اليوم كما سيرسلها النظام (بدون إرسال) */
whatsappRouter.get("/preview", async (req, res) => {
  const office = await prisma.office.findUniqueOrThrow({ where: { id: req.officeId } });
  const today = todayISO(office.timezone);
  const items = await prisma.item.findMany({
    where: { org: { officeId: office.id }, done: false },
    include: { org: true },
  });
  const due = items.filter((i) => milestoneFor(i, today));
  res.json({
    today,
    dueCount: due.length,
    message: due.length ? buildOfficeDigest(office, due, today) : null,
  });
});

/** تشغيل الفحص الآن لهذا المكتب (إرسال حقيقي) */
whatsappRouter.post("/run-now", async (req, res) => {
  const office = await prisma.office.findUniqueOrThrow({ where: { id: req.officeId } });
  const result = await runForOffice(office);
  res.json(result);
});

whatsappRouter.get("/log", async (req, res) => {
  const logs = await prisma.reminderLog.findMany({
    where: { officeId: req.officeId },
    orderBy: { sentAt: "desc" },
    take: 200,
    include: { item: { select: { name: true, org: { select: { name: true } } } } },
  });
  res.json({ logs });
});
