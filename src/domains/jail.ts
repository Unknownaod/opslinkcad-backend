import { Router } from "express";
export const jailRoutes = Router();
jailRoutes.get("/inmates", (_req, res) => { res.json({ ok: true, inmates: [] }); });