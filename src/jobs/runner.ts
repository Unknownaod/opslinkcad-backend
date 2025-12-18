import cron from "node-cron";
import { getDb } from "../lib/db.js";
import { logger, metricInc } from "../lib/log.js";

export function startJobs() {
  const run = async () => {
    metricInc("jobs_tick");
    const d = getDb();
    const now = new Date();
    await d.collection("sessions").deleteMany({ expiresAt: { $lt: now } });
    await d.collection("auth_attempts").deleteMany({ ts: { $lt: new Date(Date.now() - 14*24*3600*1000) } });
    await d.collection("notifications").updateMany({ scheduledFor: { $lte: now }, sentAt: null }, { $set: { sentAt: now } });
  };

  cron.schedule("*/2 * * * *", () => run().catch(e => logger.error({ err: String(e) }, "job tick failed")));
  (globalThis as any).__opslinkcad_jobs_ok = true;
  logger.info("Jobs runner started");
}