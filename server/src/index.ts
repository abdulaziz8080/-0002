import cors from "cors";
import express from "express";
import cron from "node-cron";
import { env } from "./lib/env.js";
import { runAll } from "./lib/reminders.js";
import { restoreAll } from "./lib/whatsapp.js";
import { authRouter } from "./routes/auth.js";
import { orgsRouter } from "./routes/orgs.js";
import { whatsappRouter } from "./routes/whatsapp.js";

const app = express();
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use("/api/auth", authRouter);
app.use("/api/orgs", orgsRouter);
app.use("/api/whatsapp", whatsappRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "خطأ داخلي في الخادم" });
});

app.listen(env.port, async () => {
  console.log(`multazim server on :${env.port}`);
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
