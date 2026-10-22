// Server-only helpers that read call data (recording, transcript, analysis) from the Vapi API.
import { APP_TAG, ASSISTANT_NAME, SALES_STATUSES } from "./salesConfig";

const API_URL = "https://api.vapi.ai";
const ID_PATTERN = /^[0-9a-zA-Z-]{8,64}$/;

async function vapiGet(path) {
  const key = process.env.VAPI_PRIVATE_KEY;
  if (!key) throw new Error("VAPI_PRIVATE_KEY is not set on the server");
  const res = await fetch(API_URL + path, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Vapi API error ${res.status}: ${await res.text()}`);
  return res.json();
}

function isOurCall(call) {
  return call.assistant?.metadata?.app === APP_TAG || call.assistant?.name === ASSISTANT_NAME;
}

export function normalizeCall(call) {
  // In-progress calls can return messages in other shapes, so only trust real arrays.
  const rawMessages = [call.artifact?.messages, call.messages].find(Array.isArray) ?? [];
  const transcript = rawMessages
    .filter((m) => (m?.role === "bot" || m?.role === "user") && typeof m.message === "string" && m.message)
    .map((m) => ({
      role: m.role === "bot" ? "assistant" : "user",
      text: m.message,
      at: m.secondsFromStart ?? null,
    }));

  const data = call.analysis?.structuredData ?? {};
  const customerSpoke = transcript.some((m) => m.role === "user");
  let salesStatus = SALES_STATUSES.includes(data.salesStatus) ? data.salesStatus : null;
  if (!customerSpoke && call.status === "ended") salesStatus = "No Response";

  const started = call.startedAt ? new Date(call.startedAt) : null;
  const ended = call.endedAt ? new Date(call.endedAt) : null;
  const hasAnalysis = Boolean(call.analysis?.summary || call.analysis?.structuredData);
  // Analysis normally lands a few seconds after the call; stop waiting after 2 minutes.
  const analysisTimedOut = ended && Date.now() - ended.getTime() > 120_000;

  return {
    id: call.id,
    createdAt: call.createdAt,
    startedAt: call.startedAt ?? null,
    endedAt: call.endedAt ?? null,
    durationSec: started && ended ? Math.max(0, Math.round((ended - started) / 1000)) : 0,
    callStatus: call.status,
    endedReason: call.endedReason ?? null,
    // Vapi recordings are private; our route swaps in a fresh signed URL on each play.
    recordingUrl: call.artifact?.recordingUrl || call.recordingUrl ? `/api/calls/${call.id}/recording` : null,
    transcript,
    customerName: data.customerName || "",
    summary: data.summary || call.analysis?.summary || "",
    requirements: Array.isArray(data.requirements) ? data.requirements : [],
    objections: Array.isArray(data.objections) ? data.objections : [],
    nextSteps: data.nextSteps || "",
    salesStatus: salesStatus ?? (hasAnalysis || analysisTimedOut ? "Follow-up Required" : null),
    analysisReady: call.status === "ended" && (hasAnalysis || !customerSpoke || Boolean(analysisTimedOut)),
  };
}

export async function listCalls() {
  const calls = await vapiGet("/call?limit=100");
  // Skip a single malformed call instead of failing the whole history page.
  return calls.filter(isOurCall).flatMap((call) => {
    try {
      return [normalizeCall(call)];
    } catch (err) {
      console.error("Skipping call", call.id, err);
      return [];
    }
  });
}

async function getRawCall(id) {
  if (!ID_PATTERN.test(id)) throw new Error("Invalid call id");
  const call = await vapiGet(`/call/${id}`);
  if (!isOurCall(call)) throw new Error("Call not found");
  return call;
}

export async function getCall(id) {
  return normalizeCall(await getRawCall(id));
}

// Signed links expire after about an hour, so fetch a fresh one every time.
export async function getRecordingUrl(id) {
  const call = await getRawCall(id);
  return call.artifact?.presignedMonoUrl ?? null;
}
