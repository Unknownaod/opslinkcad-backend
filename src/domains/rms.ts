import { Router } from "express";
export const rmsRoutes = Router();
rmsDomain.get("/stops", (_req, res) => { res.json({ ok: true, stops: [] }); });