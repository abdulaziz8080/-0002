import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cron from "node-cron";
import { env } from "./lib/env.js";
import { runAll } from "./lib/reminders.js";
import { restoreAll } from "./lib/whatsapp.js";
import { ensureAdmin } from "./lib/admin.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { orgsRouter } from "./routes/orgs.js";
import { supportRouter } from "./routes/support.js";
import { whatsappRouter } from "./routes/whatsapp.js";

const app = express();
app.disable("x-powered-by");
if (env.trustProxy) app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "same-site" } }));
app.use(cors({ origin: env.corsOrigin, methods: ["GET", "POST", "PATCH", "DELETE"] }));
app.use(express.json({ limit: "1mb" }));

// حد عام لكل الطلبات + حد مشدّد لمحاولات الدخول والتسجيل والإرسال
const limited = (max: number, windowMs: number) =>
  rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false, message: { error: "طلبات كثيرة — حاول بعد قليل" } });
app.use("/api", limited(600, 15 * 60_000));
app.use(["/api/auth/login", "/api/auth/register"], limited(20, 15 * 60_000));
app.use(["/api/whatsapp/test", "/api/whatsapp/run-now", /^\/api\/orgs\/[^/]+\/whatsapp\/send$/], limited(30, 60 * 60_000));

app.get("/api/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use("/api/auth", authRouter);
app.use("/api/orgs", orgsRouter);
app.use("/api/whatsapp", whatsappRouter);
app.use("/api/support", supportRouter);
app.use("/api/admin", adminRouter);

app.use((_req, res) => res.status(404).json({ error: "غير موجود" }));

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (typeof err === "object" && err && "type" in err && err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "صيغة الطلب غير صالحة" });
  }
  if (typeof err === "object" && err && "type" in err && err.type === "entity.too.large") {
    return res.status(413).json({ error: "حجم الطلب كبير جداً" });
  }
  console.error(err instanceof Error ? err.message : err);
  res.status(500).json({ error: "خطأ داخلي في الخادم" });
});

app.listen(env.port, async () => {
  console.log(`multazim server on :${env.port}`);
  await ensureAdmin();
  await restoreAll();

  cron.schedule(
    env.reminderCron,
    async () => {
      console.log(`[cron] reminders run ${new Date().toISOString()}`);
      const results = await runAll();
      for (const r of results) {
        console.log(
          `[cron] ${r.officeName}: due=${r.dueItems} sent=${r.sent}${r.skipped ? ` skipped=${r.skipped}` : ""}`,
        );
      }
    },
    { timezone: env.timezone },
  );
  console.log(`[cron] scheduled "${env.reminderCron}" (${env.timezone})`);
});
