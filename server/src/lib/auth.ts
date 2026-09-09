import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "./db.js";
import { env } from "./env.js";

export type Role = "office" | "admin";
export type AuthPayload = { officeId: string; role: Role };

declare module "express-serve-static-core" {
  interface Request {
    officeId: string;
    role: Role;
  }
}

export function signToken(officeId: string, role: Role) {
  return jwt.sign({ officeId, role } satisfies AuthPayload, env.jwtSecret, { expiresIn: "30d" });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "غير مصرح" });
  let payload: AuthPayload;
  try {
    payload = jwt.verify(token, env.jwtSecret) as AuthPayload;
  } catch {
    return res.status(401).json({ error: "انتهت الجلسة، سجّل الدخول مجدداً" });
  }
  const office = await prisma.office.findUnique({
    where: { id: payload.officeId },
    select: { role: true, status: true },
  });
  if (!office) return res.status(401).json({ error: "الحساب غير موجود" });
  if (office.status === "suspended") {
    return res.status(403).json({ error: "الحساب موقوف — تواصل مع إدارة ملتزم" });
  }
  req.officeId = payload.officeId;
  req.role = office.role === "admin" ? "admin" : "office";
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.role !== "admin") return res.status(403).json({ error: "صلاحية المدير مطلوبة" });
  next();
}
