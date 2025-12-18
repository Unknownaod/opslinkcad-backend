import { Router } from "express";
import { z } from "zod";
import { getDb } from "../lib/db.js";
import { authRequired, requirePerm, communityScope } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { auditAppend } from "../lib/audit.js";
import { nanoid } from "nanoid";

export const communityRoutes = Router();

communityRoutes.get("/", authRequired, async (req, res, next) => {
  try {
    const d = getDb();
    const comms = await d.collection("communities").find({ status: "active" }).toArray();
    res.json({ ok: true, communities: comms });
  } catch (e) { next(e); }
});

communityRoutes.get("/:id", authRequired, async (req, res, next) => {
  try {
    const d = getDb();
    const c = await d.collection("communities").findOne({ _id: req.params.id });
    res.json({ ok: true, community: c });
  } catch (e) { next(e); }
});