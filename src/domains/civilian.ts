import { Router } from "express";
export const civilianRoutes = Router();
civilianRoutes.get("/", (_req, res) => { res.json({ ok: true, ok: true }); });