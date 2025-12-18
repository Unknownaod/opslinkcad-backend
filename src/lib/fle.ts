import crypto from "node:crypto";
import { getDb } from "./db.js";

export function ensureFleMasterKey() {
  if (!process.env.FLE_MASTERKEY_B64) throw new Error("FLE_MASTERKEY_B64 missing");
  const b = Buffer.from(process.env.FLE_MASTERKEY_B64, "base64");
  if (b.length !== 96) throw new Error("FLE_MASTERKEY_B64 must be 96 bytes (base64)");
  return b;
}

export function fleEncryptDeterministic(plain: string): { alg: string; iv: string; ct: string; tag: string } {
  const key = ensureFleMasterKey().subarray(0, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from("opslinkcad_fle"));
  const ct = Buffer.concat([cipher.update(Buffer.from(plain, "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { alg: "A256GCM", iv: iv.toString("base64"), ct: ct.toString("base64"), tag: tag.toString("base64") };
}

export function fleDecrypt(obj: any): string {
  if (!obj || obj.alg !== "A256GCM") throw new Error("Invalid FLE blob");
  const key = ensureFleMasterKey().subarray(0, 32);
  const iv = Buffer.from(obj.iv, "base64");
  const ct = Buffer.from(obj.ct, "base64");
  const tag = Buffer.from(obj.tag, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(Buffer.from("opslinkcad_fle"));
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

export async function ensureKeyVault() {
  const d = getDb();
  await d.collection("keyvault").createIndex({ keyAltNames: 1 }, { unique: true, sparse: true });
}