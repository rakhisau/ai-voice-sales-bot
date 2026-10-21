// Minimal admin login for the Call History page.
// If ADMIN_PASSWORD is not set, history is left open (handy for local development).
import { createHash, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "admin_session";

function hash(value) {
  return createHash("sha256").update(`flowdesk:${value}`).digest();
}

export function adminToken() {
  return hash(process.env.ADMIN_PASSWORD).toString("hex");
}

export function checkPassword(password) {
  if (!process.env.ADMIN_PASSWORD || typeof password !== "string") return false;
  return timingSafeEqual(hash(password), hash(process.env.ADMIN_PASSWORD));
}

export function isAdmin(request) {
  if (!process.env.ADMIN_PASSWORD) return true;
  return request.cookies.get(ADMIN_COOKIE)?.value === adminToken();
}
