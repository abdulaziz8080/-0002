import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "./env.js";

export type AuthPayload = { officeId: string };

declare module "express-serve-static-core" {
  interface Request {
    officeId: string;
  }
}

export function signToken(officeId: string) {
  return jwt.sign({ officeId } satisfies AuthPayload, env.jwtSecret, { expiresIn: "30d" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "غير مصرح" });
  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthPayload;
    req.officeId = payload.officeId;
    next();
  } catch {
    return res.status(401).json({ error: "انتهت الجلسة، سجّل الدخول مجدداً" });
  }
}
