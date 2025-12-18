import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/log.js";

export function notFound(req: Request, res: Response) {
  res.status(404).json({ error: "Not Found", path: req.path });
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const status = Number(err?.status || 500);
  const code = err?.code || "error";
  const msg = err?.message || "Server Error";
  logger.error({ status, code, msg, path: req.path }, "request failed");
  res.status(status).json({ error: msg, code });
}

export function httpError(status: number, message: string, code?: string) {
  const e: any = new Error(message);
  e.status = status;
  if (code) e.code = code;
  return e;
}