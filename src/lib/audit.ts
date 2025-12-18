import { getDb } from "./db.js";
import { sha256Hex } from "./crypto.js";

export async function auditAppend(evt: {
  communityId: string;
  actorUserId?: string;
  actorRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: any;
  after?: any;
  meta?: any;
}) {
  const d = getDb();
  const col = d.collection("audit_events");
  const last = await col.find({ communityId: evt.communityId }).sort({ ts: -1 }).limit(1).toArray();
  const prevHash = last[0]?.hash || "";
  const ts = new Date();
  const payload = {
    _id: `${evt.communityId}_${ts.getTime()}_${Math.random().toString(16).slice(2)}`,
    ts,
    communityId: evt.communityId,
    actorUserId: evt.actorUserId || null,
    actorRole: evt.actorRole || null,
    action: evt.action,
    entity: evt.entity,
    entityId: evt.entityId || null,
    before: evt.before || null,
    after: evt.after || null,
    meta: evt.meta || null,
    prevHash
  };
  const hash = sha256Hex(JSON.stringify(payload));
  await col.insertOne({ ...payload, hash });
  return hash;
}

export async function evidenceChainAppend(evt: {
  communityId: string;
  evidenceId: string;
  actorUserId?: string;
  action: string;
  from?: any;
  to?: any;
  note?: string;
}) {
  const d = getDb();
  const col = d.collection("evidence_chain");
  const last = await col.find({ communityId: evt.communityId, evidenceId: evt.evidenceId }).sort({ ts: -1 }).limit(1).toArray();
  const prevHash = last[0]?.hash || "";
  const ts = new Date();
  const payload = {
    _id: `${evt.communityId}_${evt.evidenceId}_${ts.getTime()}_${Math.random().toString(16).slice(2)}`,
    ts,
    communityId: evt.communityId,
    evidenceId: evt.evidenceId,
    actorUserId: evt.actorUserId || null,
    action: evt.action,
    from: evt.from || null,
    to: evt.to || null,
    note: evt.note || null,
    prevHash
  };
  const hash = sha256Hex(JSON.stringify(payload));
  await col.insertOne({ ...payload, hash });
  return hash;
}