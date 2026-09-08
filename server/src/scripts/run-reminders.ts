/** تشغيل فحص التذكيرات يدوياً: npm run remind:now -- [--dry] */
import { prisma } from "../lib/db.js";
import { runAll } from "../lib/reminders.js";
import { restoreAll } from "../lib/whatsapp.js";

const dryRun = process.argv.includes("--dry");

if (!dryRun) {
  await restoreAll();
  await new Promise((r) => setTimeout(r, 8000));
}
const results = await runAll({ dryRun });
console.table(results);
await prisma.$disconnect();
process.exit(0);
