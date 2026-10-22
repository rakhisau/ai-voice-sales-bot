import { getRecordingUrl } from "@/lib/vapi";

export async function GET(_request, { params }) {
  const { id } = await params;
  try {
    const url = await getRecordingUrl(id);
    if (!url) return Response.json({ error: "Recording not available" }, { status: 404 });
    return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "no-store" } });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 404 });
  }
}
