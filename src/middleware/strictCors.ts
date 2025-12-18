import type { Request, Response, NextFunction } from "express";

const ALLOW = new Set([
  "https://opslinkcad.com",
  "https://safe.opslinksystems.xyz"
]);

export function strictCors(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  if (origin) {
    if (!ALLOW.has(origin)) {
      res.status(403).json({ error: "Origin not allowed" });
      return;
    }
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Community-Id, X-Request-Id");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  }
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  next();
}

export function wsOriginAllowed(origin?: string | string[]) {
  const o = Array.isArray(origin) ? origin[0] : origin;
  if (!o) return false;
  return ALLOW.has(o);
}