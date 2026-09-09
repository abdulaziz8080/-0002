import path from "node:path";

const isProd = process.env.NODE_ENV === "production";

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env var ${name}`);
  return v;
}

function jwtSecret(): string {
  const v = process.env.JWT_SECRET;
  if (!v || v.length < 32 || v === "change-me-to-a-long-random-string") {
    if (isProd) throw new Error("JWT_SECRET must be set to a random string of at least 32 characters");
    console.warn("[env] JWT_SECRET ضعيف أو غير مضبوط — مقبول للتطوير فقط");
    return v ?? "dev-secret-change-me";
  }
  return v;
}

export const env = {
  isProd,
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: jwtSecret(),
  reminderCron: req("REMINDER_CRON", "0 8 * * *"),
  timezone: req("TZ", "Asia/Riyadh"),
  waAuthDir: path.resolve(process.env.WA_AUTH_DIR ?? "./data/wa"),
  corsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:3000").split(",").map((s) => s.trim()),
  trustProxy: process.env.TRUST_PROXY === "1",
};
