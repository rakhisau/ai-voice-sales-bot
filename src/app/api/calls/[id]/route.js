import { getCall } from "@/lib/vapi";

export async function GET(_request, { params }) {
  const { id } = await params;
  try {
    const call = await getCall(id);
    return Response.json({ call });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 404 });
  }
}
