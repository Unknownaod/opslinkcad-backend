import { Router } from "express";
export const cadRoutes = Router();
cadRoutes.get("/calls", (_req, res) => { res.json({ ok: true, calls: [] }); });