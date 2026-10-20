import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export function adminPasswordConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function verifyAdminPassword(candidate: string) {
  const configured = process.env.ADMIN_PASSWORD;
  if (!configured) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(candidate);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function signature(timestamp: string) {
  return createHmac("sha256", process.env.ADMIN_PASSWORD ?? "")
    .update(timestamp)
    .digest("hex");
}

export function createAdminSession() {
  const timestamp = String(Math.floor(Date.now() / 1000));
  return `${timestamp}.${signature(timestamp)}`;
}

export function verifyAdminSession(value?: string) {
  if (!value || !process.env.ADMIN_PASSWORD) return false;
  const [timestamp, suppliedSignature, extra] = value.split(".");
  if (!timestamp || !suppliedSignature || extra !== undefined) return false;
  const issuedAt = Number(timestamp);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isInteger(issuedAt) || issuedAt > now || now - issuedAt > SESSION_MAX_AGE_SECONDS) {
    return false;
  }
  const expected = Buffer.from(signature(timestamp));
  const supplied = Buffer.from(suppliedSignature);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export const ADMIN_SESSION_COOKIE = "support_admin_session";
export const ADMIN_SESSION_MAX_AGE = SESSION_MAX_AGE_SECONDS;
