import { createServer } from "http";
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { logger } from "./lib/log.js";
import { strictCors } from "./middleware/strictCors.js";
import { notFound, errorHandler } from "./middleware/errors.js";
import { connectDb } from "./lib/db.js";
import { mountRoutes } from "./routes.js";
import { startWs } from "./ws/server.js";
import { startJobs } from "./jobs/runner.js";

const app = express();
app.disable("x-powered-by");
app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(strictCors);
app.use(rateLimit({ windowMs: 60_000, limit: 600, standardHeaders: true, legacyHeaders: false }));

app.get("/health", async (_req, res) => {
  const out: any = { ok: true, api: true, db: false, ws: false, jobs: false, ts: new Date().toISOString() };
  try { out.db = await connectDb().then(() => true).catch(() => false); } catch { out.db = false; }
  out.ws = globalThis.__opslinkcad_ws_ok === true;
  out.jobs = globalThis.__opslinkcad_jobs_ok === true;
  res.status(out.ok ? 200 : 503).json(out);
});

app.get("/metrics", async (_req, res) => {
  const m = globalThis.__opslinkcad_metrics || { startedAt: Date.now(), counters: {} as Record<string, number> };
  res.json({
    startedAt: new Date(m.startedAt).toISOString(),
    uptimeSec: Math.floor((Date.now() - m.startedAt) / 1000),
    counters: m.counters
  });
});

mountRoutes(app);
app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT || 10000);
const server = createServer(app);

await connectDb();
startWs(server);
startJobs();

server.listen(port, () => logger.info({ port }, "OpsLink CAD backend listening"));