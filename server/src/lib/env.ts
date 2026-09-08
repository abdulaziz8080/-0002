import path from "node:path";

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env var ${name}`);
  return v;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: req("JWT_SECRET", "dev-secret-change-me"),
  reminderCron: req("REMINDER_CRON", "0 8 * * *"),
  timezone: req("TZ", "Asia/Riyadh"),
  waAuthDir: path.resolve(process.env.WA_AUTH_DIR ?? "./data/wa"),
  corsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:3000").split(",").map((s) => s.trim()),
};
