import { Hono } from "hono";
import { cors } from "hono/cors";
import { v1Routes } from "./routes/v1";
import { assertConfig, PORT } from "./config";
import { getAccessToken } from "./auth";
import { chatCompletion } from "./handlers/chat";
import { openaiError } from "./utils";

assertConfig();

const app = new Hono();

// CORS everywhere
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-session-id", "x-session-affinity"],
    maxAge: 86400,
  })
);

app.get("/health", (c) => c.json({ status: "ok" }));
app.get("/", (c) => c.text("cto-proxy → OpenAI-compatible proxy for api.enginelabs.ai\n"));

// OpenAI-compatible paths at root (no /v1 prefix) — some SDKs call these directly
app.post("/chat/completions", (c) => chatCompletion(c.req.raw));
app.get("/models", (c) => c.json({ object: "list", data: [] }));

// Standard /v1 prefix
app.route("/v1", v1Routes);

// Catch-all for debugging unknown paths
app.all("*", (c) => {
  console.log(`[catchall] ${c.req.method} ${c.req.url} — User-Agent: ${c.req.header("user-agent") || "none"}`);
  return openaiError(404, `Not found: ${c.req.method} ${c.req.path}`);
});

// Pre-warm the token on startup
getAccessToken().catch((err) => {
  console.error("[startup] Failed to get initial token:", err.message);
});

console.log(`cto-proxy listening on http://localhost:${PORT}`);
console.log(`Upstream: ${process.env.UPSTREAM_URL || "https://api.enginelabs.ai"}`);

export default { port: PORT, fetch: app.fetch };
