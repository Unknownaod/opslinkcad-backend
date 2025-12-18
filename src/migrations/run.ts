import { connectDb, getDb } from "../lib/db.js";
import { ensureKeyVault } from "../lib/fle.js";
import { logger } from "../lib/log.js";

type Ix = { key: any; opts?: any };

const collections: Record<string, { idx: Ix[] }> = {
  communities: { idx: [{ key: { name: 1 }, opts: { unique: true } }, { key: { createdAt: -1 } }] },
  users: { idx: [{ key: { communityId: 1, email: 1 }, opts: { unique: true } }, { key: { communityId: 1, role: 1 } }, { key: { communityId: 1, status: 1 } }] },
  roles: { idx: [{ key: { communityId: 1, name: 1 }, opts: { unique: true } }] },
  perms: { idx: [{ key: { key: 1 }, opts: { unique: true } }] },
  sessions: { idx: [{ key: { communityId: 1, userId: 1 } }, { key: { expiresAt: 1 }, opts: { expireAfterSeconds: 0 } }, { key: { revokedAt: 1 } }] },
  devices: { idx: [{ key: { communityId: 1, userId: 1, deviceId: 1 }, opts: { unique: true } }] },
  refresh_tokens: { idx: [{ key: { communityId: 1, userId: 1 } }, { key: { tokenHash: 1 }, opts: { unique: true } }, { key: { expiresAt: 1 }, opts: { expireAfterSeconds: 0 } }] },
  mfa_secrets: { idx: [{ key: { communityId: 1, userId: 1 }, opts: { unique: true } }] },
  ip_allow: { idx: [{ key: { communityId: 1, ip: 1 }, opts: { unique: true } }] },
  feature_flags: { idx: [{ key: { communityId: 1, key: 1 }, opts: { unique: true } }] },
  config_versions: { idx: [{ key: { communityId: 1, domain: 1, version: -1 } }, { key: { communityId: 1, domain: 1, createdAt: -1 } }] },
  audit_events: { idx: [{ key: { communityId: 1, ts: -1 } }, { key: { communityId: 1, entity: 1, entityId: 1 } }, { key: { hash: 1 }, opts: { unique: true } }] },
  evidence_chain: { idx: [{ key: { communityId: 1, evidenceId: 1, ts: -1 } }, { key: { hash: 1 }, opts: { unique: true } }] },
  notifications: { idx: [{ key: { communityId: 1, userId: 1, createdAt: -1 } }, { key: { scheduledFor: 1 } }, { key: { sentAt: 1 } }] },

  calls: { idx: [{ key: { communityId: 1, status: 1, createdAt: -1 } }, { key: { communityId: 1, callId: 1 }, opts: { unique: true } }] },
  call_events: { idx: [{ key: { communityId: 1, callId: 1, ts: 1 } }] },
  units: { idx: [{ key: { communityId: 1, unitId: 1 }, opts: { unique: true } }, { key: { communityId: 1, status: 1 } }] },
  status_codes: { idx: [{ key: { communityId: 1, code: 1 }, opts: { unique: true } }] },
  bolos: { idx: [{ key: { communityId: 1, active: 1, createdAt: -1 } }] },
  bulletins: { idx: [{ key: { communityId: 1, createdAt: -1 } }] },
  acknowledgements: { idx: [{ key: { communityId: 1, bulletinId: 1, userId: 1 }, opts: { unique: true } }] },
  premise_notes: { idx: [{ key: { communityId: 1, propertyId: 1 } }] },
  safety_flags: { idx: [{ key: { communityId: 1, personId: 1 } }] },

  traffic_stops: { idx: [{ key: { communityId: 1, createdAt: -1 } }, { key: { communityId: 1, stopId: 1 }, opts: { unique: true } }] },
  field_contacts: { idx: [{ key: { communityId: 1, createdAt: -1 } }] },
  citations: { idx: [{ key: { communityId: 1, citationNo: 1 }, opts: { unique: true } }, { key: { communityId: 1, status: 1 } }] },
  arrests: { idx: [{ key: { communityId: 1, createdAt: -1 } }] },
  bookings: { idx: [{ key: { communityId: 1, bookingNo: 1 }, opts: { unique: true } }, { key: { communityId: 1, inmateId: 1 } }] },
  incident_reports: { idx: [{ key: { communityId: 1, reportNo: 1 }, opts: { unique: true } }, { key: { communityId: 1, createdAt: -1 } }] },
  supplements: { idx: [{ key: { communityId: 1, reportNo: 1, createdAt: 1 } }] },
  use_of_force: { idx: [{ key: { communityId: 1, createdAt: -1 } }] },
  cases: { idx: [{ key: { communityId: 1, caseNo: 1 }, opts: { unique: true } }] },

  fireems_incidents: { idx: [{ key: { communityId: 1, createdAt: -1 } }, { key: { communityId: 1, incidentNo: 1 }, opts: { unique: true } }] },
  patient_care: { idx: [{ key: { communityId: 1, incidentNo: 1 } }] },
  transports: { idx: [{ key: { communityId: 1, createdAt: -1 } }] },

  people: { idx: [{ key: { communityId: 1, lastName: 1, firstName: 1 } }, { key: { communityId: 1, personId: 1 }, opts: { unique: true } }] },
  vehicles: { idx: [{ key: { communityId: 1, plate: 1 }, opts: { unique: true, sparse: true } }, { key: { communityId: 1, vin: 1 }, opts: { unique: true, sparse: true } }] },
  firearms: { idx: [{ key: { communityId: 1, serial: 1 }, opts: { unique: true, sparse: true } }] },
  properties: { idx: [{ key: { communityId: 1, address: 1 } }, { key: { communityId: 1, propertyId: 1 }, opts: { unique: true } }] },
  court_dates: { idx: [{ key: { communityId: 1, courtDate: 1 } }, { key: { communityId: 1, personId: 1 } }] },

  evidence: { idx: [{ key: { communityId: 1, evidenceNo: 1 }, opts: { unique: true } }, { key: { communityId: 1, status: 1 } }] },
  evidence_storage: { idx: [{ key: { communityId: 1, locationCode: 1 }, opts: { unique: true } }] },
  evidence_checkouts: { idx: [{ key: { communityId: 1, evidenceId: 1, createdAt: -1 } }] },
  property_items: { idx: [{ key: { communityId: 1, propertyNo: 1 }, opts: { unique: true } }] },

  inmates: { idx: [{ key: { communityId: 1, inmateId: 1 }, opts: { unique: true } }, { key: { communityId: 1, status: 1 } }] },
  holds: { idx: [{ key: { communityId: 1, inmateId: 1 } }, { key: { communityId: 1, active: 1 } }] },
  releases: { idx: [{ key: { communityId: 1, inmateId: 1, createdAt: -1 } }] },

  civilian_accounts: { idx: [{ key: { communityId: 1, email: 1 }, opts: { unique: true } }] },
  report_requests: { idx: [{ key: { communityId: 1, createdAt: -1 } }, { key: { communityId: 1, status: 1 } }] },
  appointment_requests: { idx: [{ key: { communityId: 1, createdAt: -1 } }] },
  payments: { idx: [{ key: { communityId: 1, createdAt: -1 } }, { key: { communityId: 1, status: 1 } }] },
  exports: { idx: [{ key: { communityId: 1, createdAt: -1 } }, { key: { communityId: 1, type: 1 } }] },
  webhooks: { idx: [{ key: { communityId: 1, createdAt: -1 } }, { key: { communityId: 1, active: 1 } }] },
  webhook_deliveries: { idx: [{ key: { communityId: 1, webhookId: 1, createdAt: -1 } }] },
  auth_attempts: { idx: [{ key: { communityId: 1, email: 1, ts: -1 } }, { key: { ip: 1, ts: -1 } }] }
};

const globalPerms = [
  "ws:subscribe",
  "auth:read","auth:write",
  "community:read","community:write",
  "cad:read","cad:write",
  "rms:read","rms:write",
  "fireems:read","fireems:write",
  "records:read","records:write",
  "evidence:read","evidence:write",
  "jail:read","jail:write",
  "civilian:read","civilian:write",
  "reports:read","reports:write",
  "ops:read","ops:write"
];

const roleTemplates: Record<string, string[]> = {
  "Community Owner": ["*"],
  "Community Admin": globalPerms,
  "Dispatcher": ["cad:read","cad:write","ws:subscribe","reports:read"],
  "Officer": ["cad:read","cad:write","rms:read","rms:write","records:read","evidence:read","ws:subscribe"],
  "Records": ["records:read","records:write","reports:read","reports:write"],
  "Fire": ["fireems:read","fireems:write","cad:read","ws:subscribe"],
  "EMS": ["fireems:read","fireems:write","cad:read","ws:subscribe"],
  "Civilian": ["civilian:read","civilian:write"]
};

async function ensureCollections() {
  const d = getDb();
  for (const [name, def] of Object.entries(collections)) {
    await d.createCollection(name).catch(() => {});
    for (const ix of def.idx) await d.collection(name).createIndex(ix.key, ix.opts || {}).catch(() => {});
  }
  await ensureKeyVault();
}

async function ensurePerms() {
  const d = getDb();
  for (const key of globalPerms) await d.collection("perms").updateOne({ key }, { $setOnInsert: { key, createdAt: new Date() } }, { upsert: true });
}

async function ensureRoles() {
  const d = getDb();
  const comms = await d.collection("communities").find({}).project({ _id: 1 }).toArray();
  for (const c of comms) {
    for (const [name, perms] of Object.entries(roleTemplates)) {
      await d.collection("roles").updateOne(
        { communityId: String(c._id), name },
        { $setOnInsert: { communityId: String(c._id), name, perms, createdAt: new Date() } },
        { upsert: true }
      );
    }
  }
}

async function ensureBootstrapCommunity() {
  const d = getDb();
  const existing = await d.collection("communities").findOne({ name: "OpsLink CAD Community" });
  if (existing) return;
  const now = new Date();
  const r = await d.collection("communities").insertOne({
    name: "OpsLink CAD Community",
    status: "active",
    createdAt: now,
    updatedAt: now
  });
  await d.collection("feature_flags").insertMany([
    { communityId: String(r.insertedId), key: "civilianServices", enabled: true, updatedAt: now },
    { communityId: String(r.insertedId), key: "webhooks", enabled: true, updatedAt: now }
  ]);
}

export async function runMigrations() {
  await connectDb();
  await ensureCollections();
  await ensurePerms();
  await ensureBootstrapCommunity();
  await ensureRoles();
  logger.info("Migrations complete");
}

await runMigrations();