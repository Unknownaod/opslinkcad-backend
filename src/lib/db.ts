import { MongoClient, type Db } from "mongodb";
import { logger } from "./log.js";

let client: MongoClient | null = null;
let db: Db | null = null;

export function getDb(): Db {
  if (!db) throw new Error("DB not connected");
  return db;
}

export async function connectDb() {
  if (db && client) return db;
  const uri = process.env.ATLAS_URI;
  if (!uri) throw new Error("ATLAS_URI missing");
  if (!uri.includes("tls=true") || !uri.includes("retryWrites=true") || !uri.includes("w=majority")) {
    throw new Error("ATLAS_URI must include tls=true, retryWrites=true, w=majority");
  }
  client = new MongoClient(uri, {
    retryWrites: true,
    appName: "opslinkcad-backend",
    serverSelectionTimeoutMS: 8000
  });
  await client.connect();
  db = client.db();
  logger.info({ db: db.databaseName }, "MongoDB connected");
  return db;
}

export async function pingDb() {
  const d = await connectDb();
  await d.command({ ping: 1 });
  return true;
}