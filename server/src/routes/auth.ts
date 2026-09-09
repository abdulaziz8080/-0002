import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, signToken } from "../lib/auth.js";
import { prisma } from "../lib/db.js";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(2, "اسم المكتب قصير"),
  email: z.string().email("بريد غير صالح"),
  password: z.string().min(6, "كلمة المرور ٦ أحرف على الأقل"),
  alertPhone: z.string().optional(),
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
      passwordHash: await bcrypt.hash(password, 10),
      alertPhones: alertPhone ?? "",
    },
  });
  res.json({ token: signToken(office.id), office: publicOffice(office) });
});

const loginSchema = z.object({ email: z.string().email(), password: z.string() });

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
  name: z.string().min(2).optional(),
  alertPhones: z.string().optional(),
  notifyOrgContacts: z.boolean().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  logoDataUrl: z.string().nullable().optional(),
});

authRouter.patch("/me", requireAuth, async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });
  if (parsed.data.logoDataUrl && parsed.data.logoDataUrl.length > 600_000) {
    return res.status(400).json({ error: "الشعار كبير جداً" });
  }
  const office = await prisma.office.update({ where: { id: req.officeId }, data: parsed.data });
  res.json({ office: publicOffice(office) });
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
