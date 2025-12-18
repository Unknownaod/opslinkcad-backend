import { Router } from "express";
export const opsRoutes = Router();
opsRoutes.get("/health", (_req, res) => { res.json({ ok: true }); });