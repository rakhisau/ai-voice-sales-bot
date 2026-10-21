import { ADMIN_COOKIE, adminToken, checkPassword } from "@/lib/auth";

export async function POST(request) {
  const { password } = await request.json().catch(() => ({}));
  if (!checkPassword(password)) {
    return Response.json({ error: "Wrong password" }, { status: 401 });
  }
  const res = Response.json({ ok: true });
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.headers.set(
    "Set-Cookie",
    `${ADMIN_COOKIE}=${adminToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${secure}`
  );
  return res;
}

export async function DELETE() {
  const res = Response.json({ ok: true });
  res.headers.set("Set-Cookie", `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return res;
}
