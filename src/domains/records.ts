import { Router } from "express";
export const recordsRoutes = Router();
recordsRoutes.get("/people", (_req, res) => { res.json({ ok: true, people: [] }); });