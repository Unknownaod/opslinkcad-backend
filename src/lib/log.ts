import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { service: "opslinkcad-backend" },
  formatters: { level: (label) => ({ level: label }) }
});

export function metricInc(key: string, by = 1) {
  const g: any = globalThis as any;
  if (!g.__opslinkcad_metrics) g.__opslinkcad_metrics = { startedAt: Date.now(), counters: {} };
  const c = g.__opslinkcad_metrics.counters;
  c[key] = (c[key] || 0) + by;
}