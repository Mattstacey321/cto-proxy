import { fetchUpstream } from "../upstream";
import { openaiError } from "../utils";
import { UPSTREAM_URL } from "../config";

let defaultSessionId = "";

export async function chatCompletion(req: Request): Promise<Response> {
  const client = req.headers.get("user-agent") || req.headers.get("x-client-id") || "unknown";
  console.log(`[chat] Request from: ${client}`);

  let upstreamBody: string;
  try {
    upstreamBody = await req.text();
  } catch {
    console.log("[chat] Failed to read request body");
    upstreamBody = "";
  }

  if (!upstreamBody) {
    console.log("[chat] Empty request body!");
    return openaiError(400, "Empty request body");
  }

  // Log truncated body for debugging
  const preview = upstreamBody.length > 200 ? upstreamBody.slice(0, 200) + "..." : upstreamBody;
  console.log(`[chat] Body (${upstreamBody.length}B): ${preview}`);

  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (!defaultSessionId) {
    defaultSessionId = `ses_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }
  headers["x-session-id"] = req.headers.get("x-session-id") || defaultSessionId;
  headers["x-session-affinity"] = req.headers.get("x-session-affinity") || defaultSessionId;

  console.log(`[chat] Upstream URL: ${UPSTREAM_URL}/chat/completions`);

  const res = await fetchUpstream("/chat/completions", {
    method: "POST",
    headers,
    body: upstreamBody,
  });

  if (!res.ok) {
    const body = await res.text();
    return openaiError(res.status, `Upstream error: ${body}`);
  }

  const upstreamCt = res.headers.get("content-type") || "";
  const isStream = upstreamCt.includes("text/event-stream") || upstreamCt.includes("application/x-ndjson");

  const responseHeaders: Record<string, string> = { Connection: "keep-alive" };
  if (isStream) {
    responseHeaders["Content-Type"] = "text/event-stream";
    responseHeaders["Cache-Control"] = "no-cache";
  } else {
    responseHeaders["Content-Type"] = "application/json";
  }

  return new Response(res.body, {
    status: res.status,
    headers: responseHeaders,
  });
}
