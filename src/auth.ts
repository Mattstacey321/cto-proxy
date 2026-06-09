import { writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname } from "path";
import {
  UPSTREAM_URL,
  PROXY_CREDENTIALS_PATH,
  CTO_CREDENTIALS_PATH,
  readCredentials,
} from "./config";

const OAUTH_URL = `${UPSTREAM_URL || "https://api.enginelabs.ai"}/oauth/token`;

interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const REFRESH_BUFFER_MS = 120_000;
const TOKEN_VALID_MS = 30_000;

let tokenSet: TokenSet | null = null;
let refreshPromise: Promise<TokenSet> | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function loadFromProxyStore(): TokenSet | null {
  const creds = readCredentials(PROXY_CREDENTIALS_PATH);
  if (creds?.refreshToken) return creds;
  return null;
}

function saveTokens(ts: TokenSet) {
  const payload = JSON.stringify(
    { accessToken: ts.accessToken, refreshToken: ts.refreshToken, expiresAt: ts.expiresAt },
    null,
    2
  ) + "\n";
  try {
    const dir = dirname(PROXY_CREDENTIALS_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(PROXY_CREDENTIALS_PATH, payload, { mode: 0o600 });
  } catch (err) {
    console.error("[auth] Could not save credentials:", err);
  }
}

function isTokenFresh(ts: TokenSet): boolean {
  return Date.now() < ts.expiresAt - TOKEN_VALID_MS;
}

function scheduleRefresh(ts: TokenSet) {
  if (refreshTimer) clearTimeout(refreshTimer);
  const delay = Math.max(0, ts.expiresAt - Date.now() - REFRESH_BUFFER_MS);
  const run = () => performRefresh().catch((err) => console.error("[auth] Scheduled refresh failed:", err.message));
  if (delay <= 0) {
    run();
    return;
  }
  refreshTimer = setTimeout(run, delay);
}

async function performRefresh(): Promise<TokenSet> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = doRefreshChain();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function doRefreshChain(): Promise<TokenSet> {
  // Try sources in order: proxy store → cto store → env var
  const sources = [
    { name: "proxy", fn: loadFromProxyStore },
    { name: "cto", fn: () => readCredentials(CTO_CREDENTIALS_PATH) },
    { name: "env", fn: () => process.env.ENGINELABS_REFRESH_TOKEN ? { accessToken: "", refreshToken: process.env.ENGINELABS_REFRESH_TOKEN, expiresAt: 0 } : null },
  ];

  for (const source of sources) {
    const creds = source.fn();
    if (!creds?.refreshToken) continue;

    try {
      const ts = await exchangeRefreshToken(creds.refreshToken);
      saveTokens(ts);
      tokenSet = ts;
      scheduleRefresh(ts);
      if (source.name !== "proxy") {
        console.log(`[auth] Recovered from ${source.name} store.`);
      }
      console.log(`[auth] Token refreshed, expires in ${Math.round((ts.expiresAt - Date.now()) / 1000)}s`);
      return ts;
    } catch (err: any) {
      const msg: string = err.message || "";
      console.log(`[auth] Refresh from ${source.name} store failed:`, msg.slice(0, 120));
    }
  }

  throw new Error("All refresh sources exhausted. Run `cto login` to re-seed credentials.");
}

async function exchangeRefreshToken(refreshToken: string): Promise<TokenSet> {
  const res = await fetch(OAUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "*/*",
      "User-Agent": "opencode/1.15.0",
      Connection: "keep-alive",
      Host: "api.enginelabs.ai",
      "Accept-Encoding": "gzip, deflate, br, zstd",
    },
    body: JSON.stringify({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });

  if (!res.ok) throw new Error(await res.text());

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + (data.expires_in || 900) * 1000,
  };
}

export async function getAccessToken(): Promise<string> {
  if (tokenSet && isTokenFresh(tokenSet)) {
    return tokenSet.accessToken;
  }

  const disk = loadFromProxyStore();
  if (disk && isTokenFresh(disk)) {
    tokenSet = disk;
    scheduleRefresh(disk);
    return disk.accessToken;
  }

  if (refreshPromise) {
    const ts = await refreshPromise;
    return ts.accessToken;
  }

  const ts = await performRefresh();
  return ts.accessToken;
}

export async function forceRefreshToken(): Promise<string> {
  tokenSet = null;
  return getAccessToken();
}
