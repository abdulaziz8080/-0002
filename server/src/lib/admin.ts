import bcrypt from "bcryptjs";
import { prisma } from "./db.js";
import { env } from "./env.js";

/**
 * يضمن وجود حساب مدير الموقع (من ADMIN_EMAIL / ADMIN_PASSWORD في .env).
 * كلمة المرور الأولية تُستخدم مرة واحدة عند الإنشاء فقط — بعدها يغيّرها المدير من الإعدادات.
 */
export async function ensureAdmin() {
  const email = env.adminEmail?.toLowerCase();
  if (!email) return;
  const existing = await prisma.office.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "admin") {
      await prisma.office.update({ where: { id: existing.id }, data: { role: "admin", plan: "pro", status: "active" } });
      console.log(`[admin] رُقّي الحساب ${email} إلى مدير`);
    }
    return;
  }
  if (!env.adminPassword || env.adminPassword.length < 8) {
    console.warn("[admin] ADMIN_PASSWORD غير مضبوط (٨ أحرف على الأقل) — لم يُنشأ حساب المدير");
    return;
  }
  await prisma.office.create({
    data: {
      name: "إدارة ملتزم",
      email,
      passwordHash: await bcrypt.hash(env.adminPassword, 12),
      role: "admin",
      plan: "pro",
    },
  });
  console.log(`[admin] أُنشئ حساب المدير ${email}`);
}
