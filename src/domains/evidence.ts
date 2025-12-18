import { Router } from "express";
export const evidenceRoutes = Router();
evidenceRoutes.get("/", (_req, res) => { res.json({ ok: true, evidence: [] }); });