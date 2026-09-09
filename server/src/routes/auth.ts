import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, signToken } from "../lib/auth.js";
import { prisma } from "../lib/db.js";

export const authRouter = Router();

const phones = z.string().trim().max(300).regex(/^[\d\s+,\-()]*$/, "الأرقام تحتوي رموزاً غير مسموحة");
const optionalEmail = z.union([z.literal(""), z.string().trim().email("بريد غير صالح").max(120)]);
const password = z.string().min(8, "كلمة المرور ٨ أحرف على الأقل").max(128, "كلمة المرور طويلة جداً");

const registerSchema = z.object({
  name: z.string().trim().min(2, "اسم المكتب قصير").max(120),
  email: z.string().trim().email("بريد غير صالح").max(120),
  password,
  alertPhone: phones.optional(),
});

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });
  const { name, email, password, alertPhone } = parsed.data;
  const exists = await prisma.office.findUnique({ where: { email: email.toLowerCase() } });
  if (exists) return res.status(409).json({ error: "البريد مسجّل مسبقاً" });
  const office = await prisma.office.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 12),
      alertPhones: alertPhone ?? "",
    },
  });
  res.json({ token: signToken(office.id), office: publicOffice(office) });
});

const loginSchema = z.object({ email: z.string().trim().email().max(120), password: z.string().max(128) });

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "بيانات غير صالحة" });
  const office = await prisma.office.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!office || !(await bcrypt.compare(parsed.data.password, office.passwordHash))) {
    return res.status(401).json({ error: "البريد أو كلمة المرور غير صحيحة" });
  }
  res.json({ token: signToken(office.id), office: publicOffice(office) });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const office = await prisma.office.findUnique({ where: { id: req.officeId } });
  if (!office) return res.status(404).json({ error: "المكتب غير موجود" });
  res.json({ office: publicOffice(office) });
});

const settingsSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  alertPhones: phones.optional(),
  notifyOrgContacts: z.boolean().optional(),
  contactPhone: phones.optional(),
  contactEmail: optionalEmail.optional(),
  logoDataUrl: z
    .string()
    .max(600_000, "الشعار كبير جداً")
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, "صيغة الشعار غير مدعومة")
    .nullable()
    .optional(),
});

authRouter.patch("/me", requireAuth, async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });
  const office = await prisma.office.update({ where: { id: req.officeId }, data: parsed.data });
  res.json({ office: publicOffice(office) });
});

const passwordSchema = z.object({ current: z.string().max(128), next: password });

authRouter.post("/password", requireAuth, async (req, res) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });
  const office = await prisma.office.findUniqueOrThrow({ where: { id: req.officeId } });
  if (!(await bcrypt.compare(parsed.data.current, office.passwordHash))) {
    return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
  }
  await prisma.office.update({
    where: { id: office.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.next, 12) },
  });
  res.json({ ok: true });
});

export function publicOffice(o: {
  id: string;
  name: string;
  email: string;
  alertPhones: string;
  notifyOrgContacts: boolean;
  contactPhone: string;
  contactEmail: string;
  timezone: string;
  logoDataUrl: string | null;
  createdAt: Date;
}) {
  return {
    id: o.id,
    name: o.name,
    email: o.email,
    alertPhones: o.alertPhones,
    notifyOrgContacts: o.notifyOrgContacts,
    contactPhone: o.contactPhone,
    contactEmail: o.contactEmail,
    timezone: o.timezone,
    logoDataUrl: o.logoDataUrl,
    createdAt: o.createdAt,
  };
}
