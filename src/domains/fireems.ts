import { Router } from "express";
export const fireEmsRoutes = Router();
fireEmsRoutes.get("/incidents", (_req, res) => { res.json({ ok: true, incidents: [] }); });