import type { Server as HttpServer, IncomingMessage } from "http";
import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { wsOriginAllowed } from "../middleware/strictCors.js";
import { getDb } from "../lib/db.js";
import { metricInc, logger } from "../lib/log.js";

type Conn = { ws: any; communityId: string; role: string; perms: string[]; userId: string };
const conns = new Set<Conn>();

function parseCookies(req: IncomingMessage) {
  const h = req.headers.cookie || "";
  const out: Record<string,string> = {};
  h.split(";").map(s=>s.trim()).filter(Boolean).forEach(p=>{
    const i = p.indexOf("=");
    if (i>0) out[p.slice(0,i)] = decodeURIComponent(p.slice(i+1));
  });
  return out;
}

export function startWs(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (req, socket, head) => {
    const origin = req.headers.origin;
    if (!wsOriginAllowed(origin)) { socket.write("HTTP/1.1 403 Forbidden\r\n\r\n"); socket.destroy(); return; }

    try {
      const cookieName = process.env.COOKIE_NAME || "opslinkcad_session";
      const cookies = parseCookies(req);
      const token = cookies[cookieName];
      if (!token) throw new Error("no token");
      const payload: any = jwt.verify(token, process.env.JWT_ACCESS_SECRET || "");
      const d = getDb();
      const sess = await d.collection("sessions").findOne({ _id: payload.sid, revokedAt: null });
      if (!sess) throw new Error("no session");
      const user = await d.collection("users").findOne({ _id: payload.sub, communityId: payload.communityId, status: "active" });
      if (!user) throw new Error("no user");

      (req as any).__opslinkcad_ws_user = {
        userId: String(user._id), communityId: String(user.communityId), role: String(user.role), perms: Array.isArray(user.perms)?user.perms:[]
      };

      wss.handleUpgrade(req, socket as any, head, (ws) => wss.emit("connection", ws, req));
    } catch {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    }
  });

  wss.on("connection", (ws, req) => {
    const u = (req as any).__opslinkcad_ws_user;
    const conn: Conn = { ws, communityId: u.communityId, role: u.role, perms: u.perms, userId: u.userId };
    conns.add(conn);
    metricInc("ws_connect");
    ws.send(JSON.stringify({ type: "hello", communityId: conn.communityId }));

    ws.on("message", (buf) => {
      metricInc("ws_in");
      let msg: any;
      try { msg = JSON.parse(String(buf)); } catch { return; }
      if (msg?.type === "ping") { ws.send(JSON.stringify({ type: "pong", ts: Date.now() })); return; }
      if (msg?.type === "subscribe") {
        if (!conn.perms.includes("*") && !conn.perms.includes("ws:subscribe")) {
          ws.send(JSON.stringify({ type: "error", error: "Forbidden" }));
          return;
        }
        ws.send(JSON.stringify({ type: "subscribed", channel: "community" }));
      }
    });

    ws.on("close", () => { conns.delete(conn); metricInc("ws_close"); });
  });

  (globalThis as any).__opslinkcad_ws_ok = true;
  logger.info("WebSocket ready");
}

export function wsBroadcastCommunity(communityId: string, evt: any, permGate?: string) {
  const data = JSON.stringify(evt);
  for (const c of conns) {
    if (c.communityId !== communityId) continue;
    if (permGate && !(c.perms.includes("*") || c.perms.includes(permGate))) continue;
    try { c.ws.send(data); } catch {}
  }
}