import { readFileSync, existsSync, mkdirSync } from "fs";
import { homedir } from "os";

const rawUpstream = process.env.UPSTREAM_URL;
export const UPSTREAM_URL =
  rawUpstream && rawUpstream !== "undefined" ? rawUpstream : "https://api.enginelabs.ai";
export const PORT = parseInt(process.env.PORT || "3112", 10);

// Proxy's own credential store — independent of cto CLI
export const PROXY_CREDENTIALS_PATH =
  process.env.CTO_PROXY_CREDENTIALS ||
  `${homedir()}/.cto-proxy/credentials.json`;

// Seed source — read once on first startup, then proxy manages its own tokens
export const CTO_CREDENTIALS_PATH =
  process.env.CTO_CREDENTIALS_PATH || `${process.env.HOME}/.cto/credentials`;

interface StoredCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export function readCredentials(path: string): StoredCredentials | null {
  try {
    if (!existsSync(path)) return null;
    const raw = readFileSync(path, "utf-8");
    const data = JSON.parse(raw);
    if (data.refreshToken) return data;
    return null;
  } catch {
    return null;
  }
}

export function assertConfig() {
  const proxyCreds = readCredentials(PROXY_CREDENTIALS_PATH);
  const ctoCreds = readCredentials(CTO_CREDENTIALS_PATH);
  const envToken = process.env.ENGINELABS_REFRESH_TOKEN;

  if (!proxyCreds && !ctoCreds && !envToken) {
    console.error(
      "No credentials found. Provide one of:\n" +
        `  - Run \`cto\` once to seed ${CTO_CREDENTIALS_PATH}\n` +
        `  - Or set ENGINELABS_REFRESH_TOKEN env var\n` +
        `  Tokens will be stored independently in ${PROXY_CREDENTIALS_PATH} after first startup.`
    );
    process.exit(1);
  }
}
