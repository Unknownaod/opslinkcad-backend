// dist/index.js
// OpsLink CAD Backend — Production Entry Point
// Generated to exactly match build-opslink-backend.ps1 output

import http from "http";
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

/* =========================================================
   GLOBAL SAFETY FLAGS
   ========================================================= */
globalThis.__opslinkcad_ws_ok = false;
globalThis.__opslinkcad_jobs_ok = false;
globalThis.__opslinkcad_metrics = {
  startedAt: Date.now(),
  counters: {}
};

/* =========================================================
   EXPRESS APP SETUP
   ========================================================= */
const app = express();
app.disable("x-powered-by");

app.use(
  pinoHttp({
    logger,
    customLogLevel(res, err) {
      if (res.statusCode >= 500 || err) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    }
  })
);

app.use(helmet());

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());
app.use(strictCors);

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false
  })
);

/* =========================================================
   HEALTH & METRICS
   ========================================================= */
app.get("/health", async (_req, res) => {
  const out = {
    ok: true,
    api: true,
    db: false,
    ws: false,
    jobs: false,
    ts: new Date().toISOString()
  };

  try {
    await connectDb();
    out.db = true;
  } catch {
    out.db = false;
  }

  out.ws = globalThis.__opslinkcad_ws_ok === true;
  out.jobs = globalThis.__opslinkcad_jobs_ok === true;

  if (!out.db || !out.ws || !out.jobs) out.ok = false;

  res.status(out.ok ? 200 : 503).json(out);
});

app.get("/metrics", (_req, res) => {
  const m = globalThis.__opslinkcad_metrics || {
    startedAt: Date.now(),
    counters: {}
  };

  res.json({
    startedAt: new Date(m.startedAt).toISOString(),
    uptimeSec: Math.floor((Date.now() - m.startedAt) / 1000),
    counters: m.counters
  });
});

/* =========================================================
   ROUTES
   ========================================================= */
mountRoutes(app);

/* =========================================================
   ERROR HANDLING
   ========================================================= */
app.use(notFound);
app.use(errorHandler);

/* =========================================================
   SERVER + WEBSOCKET
   ========================================================= */
const PORT = Number(process.env.PORT || 10000);
const server = http.createServer(app);

/* =========================================================
   BOOTSTRAP SEQUENCE
   ========================================================= */
async function bootstrap() {
  try {
    logger.info("Starting OpsLink CAD backend…");

    await connectDb();

    startWs(server);
    startJobs();

    server.listen(PORT, () => {
      logger.info(
        { port: PORT },
        "OpsLink CAD backend listening"
      );
    });
  } catch (err) {
    logger.fatal(
      { err: String(err) },
      "Fatal startup error"
    );
    process.exit(1);
  }
}

bootstrap();

/* =========================================================
   PROCESS SAFETY
   ========================================================= */
process.on("unhandledRejection", (r) => {
  logger.error({ err: String(r) }, "Unhandled rejection");
});

process.on("uncaughtException", (e) => {
  logger.fatal({ err: String(e) }, "Uncaught exception");
  process.exit(1);
});
