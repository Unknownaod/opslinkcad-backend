import crypto from "node:crypto";

export function sha256Hex(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export function hmacHex(secret: string, payload: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function randId(prefix = "") {
  const b = crypto.randomBytes(16).toString("hex");
  return prefix ? `${prefix}_${b}` : b;
}