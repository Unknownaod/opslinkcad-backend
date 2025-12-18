import { Router } from "express";
export const reportsRoutes = Router();
reportsRoutes.get("/", (_req, res) => { res.json({ ok: true, reports: [] }); });