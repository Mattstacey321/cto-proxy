import { fetchUpstream } from "../upstream";
import { openaiError } from "../utils";

let cache: { data: unknown; timestamp: number } | null = null;
const TTL = 5 * 60 * 1000;

export async function listModels(): Promise<Response> {
  if (cache && Date.now() - cache.timestamp < TTL) {
    return Response.json(cache.data);
  }

  const res = await fetchUpstream("/models", {
    headers: { Accept: "application/json", "Content-Type": "application/json" },
  });

  if (res.ok) {
    const data = await res.json();
    cache = { data, timestamp: Date.now() };
    return Response.json(data);
  }

  const body = await res.text();
  return openaiError(res.status, `Upstream /models failed: ${body}`);
}
