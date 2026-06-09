import { getAccessToken, forceRefreshToken } from "./auth";
import { UPSTREAM_URL } from "./config";
import { upstreamHeaders } from "./utils";

const BASE = UPSTREAM_URL || "https://api.enginelabs.ai";
const SAFE_BASE = typeof BASE === "string" && BASE.startsWith("http") ? BASE : "https://api.enginelabs.ai";

export async function fetchUpstream(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers = upstreamHeaders({ Authorization: `Bearer ${token}` });
  for (const [k, v] of Object.entries(init.headers || {})) {
    headers.set(k, v as string);
  }

  const url = `${SAFE_BASE}${path}`;
  console.log(`[upstream] ${init.method || "GET"} ${url}`);

  let res = await fetch(url, { ...init, headers });

  console.log(`[upstream] Response: ${res.status} ${res.statusText}`);

  if (res.status === 401) {
    console.log("[upstream] 401 received, refreshing token and retrying...");
    const fresh = await forceRefreshToken();
    headers.set("Authorization", `Bearer ${fresh}`);
    res = await fetch(url, { ...init, headers });
    console.log(`[upstream] Retry response: ${res.status} ${res.statusText}`);
  }

  return res;
}
