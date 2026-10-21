import { listCalls } from "@/lib/vapi";
import { isAdmin } from "@/lib/auth";

export async function GET(request) {
  if (!isAdmin(request)) {
    return Response.json({ error: "Admin login required" }, { status: 401 });
  }
  try {
    const calls = await listCalls();
    return Response.json({ calls });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
