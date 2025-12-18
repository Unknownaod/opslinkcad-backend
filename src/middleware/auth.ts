import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { httpError } from "./errors.js";
import { getDb } from "../lib/db.js";

export type SessionUser = {
  userId: string;
  communityId: string;
  role: string;
  perms: string[];
};

declare global {
  namespace Express { interface Request { user?: SessionUser; } }
}

export const authRequired: RequestHandler = async (req, _res, next) => {
  const cookieName = process.env.COOKIE_NAME || "opslinkcad_session";
  const token = req.cookies?.[cookieName];
  if (!token) return next(httpError(401, "Unauthorized"));
  try {
    const payload: any = jwt.verify(token, process.env.JWT_ACCESS_SECRET || "");
    const d = getDb();
    const s = await d.collection("sessions").findOne({ _id: payload.sid, revokedAt: null });
    if (!s) return next(httpError(401, "Unauthorized"));
    const u = await d.collection("users").findOne({ _id: payload.sub, communityId: payload.communityId, status: "active" });
    if (!u) return next(httpError(401, "Unauthorized"));
    req.user = { userId: String(u._id), communityId: String(u.communityId), role: String(u.role), perms: Array.isArray(u.perms) ? u.perms : [] };
    next();
  } catch {
    next(httpError(401, "Unauthorized"));
  }
};

export function requirePerm(entity: string, action: string): RequestHandler {
  const key = `${entity}:${action}`;
  return (req, _res, next) => {
    if (!req.user) return next(httpError(401, "Unauthorized"));
    if (req.user.perms.includes("*") || req.user.perms.includes(key)) return next();
    return next(httpError(403, "Forbidden"));
  };
}

export function communityScope(req: any) {
  const cid = req.headers["x-community-id"] || req.user?.communityId;
  if (!cid) throw httpError(400, "Community required");
  return String(cid);
}