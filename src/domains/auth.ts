import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import OTPAuth from "otpauth";
import { nanoid } from "nanoid";
import { getDb } from "../lib/db.js";
import { validateBody } from "../middleware/validate.js";
import { authRequired, communityScope } from "../middleware/auth.js";
import { httpError } from "../middleware/errors.js";
import { auditAppend } from "../lib/audit.js";
import { sha256Hex } from "../lib/crypto.js";
import { metricInc } from "../lib/log.js";

export const authRoutes = Router();

const passwordPolicy = (p: string) => p.length >= 12 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p);

function cookieOpts() {
  const domain = process.env.COOKIE_DOMAIN || ".opslinkcad.com";
  return { httpOnly: true, secure: true, sameSite: "none" as const, domain, path: "/" };
}

function signAccess(payload: any) {
  const s = process.env.JWT_ACCESS_SECRET || "";
  if (!s) throw new Error("JWT_ACCESS_SECRET missing");
  return jwt.sign(payload, s, { expiresIn: "20m" });
}

function signRefresh(payload: any) {
  const s = process.env.JWT_REFRESH_SECRET || "";
  if (!s) throw new Error("JWT_REFRESH_SECRET missing");
  return jwt.sign(payload, s, { expiresIn: "30d" });
}

async function recordAuthAttempt(communityId: string, email: string, ip: string, ok: boolean) {
  const d = getDb();
  await d.collection("auth_attempts").insertOne({
    _id: nanoid(),
    communityId,
    email,
    ip,
    ok,
    ts: new Date()
  });
}

async function lockoutCheck(communityId: string, email: string, ip: string) {
  const d = getDb();
  const since = new Date(Date.now() - 15 * 60 * 1000);
  const bad = await d.collection("auth_attempts").countDocuments({ communityId, email, ip, ok: false, ts: { $gte: since } });
  if (bad >= 10) throw httpError(429, "Too many attempts");
}

authRoutes.post("/register", validateBody(z.object({
  communityId: z.string().min(3),
  email: z.string().email(),
  username: z.string().min(3).max(32),
  password: z.string().min(12),
  role: z.string().min(3).default("Civilian")
})), async (req, res, next) => {
  try {
    metricInc("auth_register");
    const d = getDb();
    const { communityId, email, username, password, role } = req.body;
    if (!passwordPolicy(password)) throw httpError(400, "Password does not meet policy");
    const comm = await d.collection("communities").findOne({ _id: communityId, status: "active" });
    if (!comm) throw httpError(400, "Community not found");

    const r = await d.collection("roles").findOne({ communityId, name: role });
    if (!r) throw httpError(400, "Role not found");

    const hash = await bcrypt.hash(password, 12);
    const now = new Date();
    const user = {
      _id: nanoid(),
      communityId,
      email: email.toLowerCase(),
      username,
      passwordHash: hash,
      role,
      perms: r.perms,
      status: "active",
      createdAt: now,
      updatedAt: now
    };
    await d.collection("users").insertOne(user);
    await auditAppend({ communityId, action: "create", entity: "user", entityId: user._id, after: { email: user.email, role }, meta: { by: "self" } });
    res.json({ ok: true, userId: user._id });
  } catch (e) { next(e); }
});

authRoutes.post("/login", validateBody(z.object({
  communityId: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(1),
  deviceName: z.string().min(1).max(64).default("Browser")
})), async (req, res, next) => {
  try {
    metricInc("auth_login");
    const d = getDb();
    const { communityId, email, password, deviceName } = req.body;
    const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "");

    await lockoutCheck(communityId, email.toLowerCase(), ip);

    const user = await d.collection("users").findOne({ communityId, email: email.toLowerCase(), status: "active" });
    if (!user) { await recordAuthAttempt(communityId, email.toLowerCase(), ip, false); throw httpError(401, "Invalid credentials"); }

    const ok = await bcrypt.compare(password, String(user.passwordHash));
    if (!ok) { await recordAuthAttempt(communityId, email.toLowerCase(), ip, false); throw httpError(401, "Invalid credentials"); }

    const mfa = await d.collection("mfa_secrets").findOne({ communityId, userId: String(user._id) });
    if (mfa?.enabled) {
      res.status(202).json({ mfaRequired: true, userId: String(user._id) });
      return;
    }

    await recordAuthAttempt(communityId, email.toLowerCase(), ip, true);

    const sid = nanoid();
    const deviceId = sha256Hex(`${deviceName}:${ip}:${req.headers["user-agent"]||""}`).slice(0, 24);
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000);
    await d.collection("sessions").insertOne({ _id: sid, communityId, userId: String(user._id), deviceId, deviceName, ip, ua: req.headers["user-agent"]||"", createdAt: new Date(), expiresAt, revokedAt: null });
    await d.collection("devices").updateOne({ communityId, userId: String(user._id), deviceId }, { $set: { communityId, userId: String(user._id), deviceId, deviceName, lastSeenAt: new Date() } }, { upsert: true });

    const access = signAccess({ sub: String(user._id), sid, communityId });
    const refreshId = nanoid();
    const refresh = signRefresh({ sub: String(user._id), jti: refreshId, communityId });
    const refreshHash = sha256Hex(refresh);
    await d.collection("refresh_tokens").insertOne({ _id: refreshId, communityId, userId: String(user._id), tokenHash: refreshHash, createdAt: new Date(), expiresAt: new Date(Date.now() + 30*24*3600*1000), revokedAt: null });

    const cookieName = process.env.COOKIE_NAME || "opslinkcad_session";
    res.cookie(cookieName, access, cookieOpts());
    res.cookie(`${cookieName}_refresh`, refreshId, { ...cookieOpts(), maxAge: 30*24*3600*1000 });
    res.json({ ok: true, userId: String(user._id), access, refreshId });
  } catch (e) { next(e); }
});

authRoutes.post("/mfa/verify", validateBody(z.object({ userId: z.string(), code: z.string() })), async (req, res, next) => {
  try {
    const d = getDb();
    const { userId, code } = req.body;
    const mfa = await d.collection("mfa_secrets").findOne({ userId });
    if (!mfa || !mfa.enabled) throw httpError(400, "MFA not configured");
    const ok = new OTPAuth.TOTP({ secret: mfa.secret }).validate({ token: code, window: 1 });
    if (!ok) throw httpError(401, "Invalid code");
    const access = signAccess({ sub: userId });
    const cookieName = process.env.COOKIE_NAME || "opslinkcad_session";
    res.cookie(cookieName, access, cookieOpts());
    res.json({ ok: true });
  } catch (e) { next(e); }
});

authRoutes.post("/logout", authRequired, async (req, res, next) => {
  try {
    metricInc("auth_logout");
    const d = getDb();
    const cookieName = process.env.COOKIE_NAME || "opslinkcad_session";
    res.clearCookie(cookieName, cookieOpts());
    res.clearCookie(`${cookieName}_refresh`, cookieOpts());
    res.json({ ok: true });
  } catch (e) { next(e); }
});

authRoutes.get("/me", authRequired, async (req, res, next) => {
  try {
    const d = getDb();
    const u = await d.collection("users").findOne({ _id: req.user?.userId });
    res.json({ ok: true, user: { id: u?._id, email: u?.email, username: u?.username, role: u?.role } });
  } catch (e) { next(e); }
});