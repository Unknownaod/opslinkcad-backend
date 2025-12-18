import type { Express } from "express";
import { authRoutes } from "./domains/auth.js";
import { communityRoutes } from "./domains/communities.js";
import { cadRoutes } from "./domains/cad.js";
import { rmsRoutes } from "./domains/rms.js";
import { fireEmsRoutes } from "./domains/fireems.js";
import { recordsRoutes } from "./domains/records.js";
import { evidenceRoutes } from "./domains/evidence.js";
import { jailRoutes } from "./domains/jail.js";
import { civilianRoutes } from "./domains/civilian.js";
import { reportsRoutes } from "./domains/reports.js";
import { opsRoutes } from "./domains/ops.js";

export function mountRoutes(app: Express) {
  app.use("/auth", authRoutes);
  app.use("/communities", communityRoutes);
  app.use("/cad", cadRoutes);
  app.use("/rms", rmsRoutes);
  app.use("/fireems", fireEmsRoutes);
  app.use("/records", recordsRoutes);
  app.use("/evidence", evidenceRoutes);
  app.use("/jail", jailRoutes);
  app.use("/civilian", civilianRoutes);
  app.use("/reports", reportsRoutes);
  app.use("/ops", opsRoutes);
}