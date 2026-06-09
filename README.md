# cto-proxy

OpenAI-compatible proxy for api.enginelabs.ai — runs locally, handles token auth automatically, and lets you use any OpenAI-compatible client without dealing with the custom auth flow.

## Quick start

```bash
# 1. Install dependencies
bun install

# 2. Set your refresh token
cp .env.example .env
# Edit .env → paste your ENGINELABS_REFRESH_TOKEN

# 3. Run
bun dev
```

The proxy listens on `http://localhost:3112`. Point any OpenAI-compatible client at it and it just works.

## Getting your refresh token

Capture traffic with Proxyman while the cto/opencode CLI is running — look for `POST /oauth/token` on `api.enginelabs.ai`. The request body contains the `refresh_token`.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/chat/completions` | Chat completions (also available at `/chat/completions`) |
| `GET`  | `/v1/models` | List models (also available at `/models`) |
| `GET`  | `/health` | Health check |

## Config

| Variable | Default | Description |
|----------|---------|-------------|
| `ENGINELABS_REFRESH_TOKEN` | — | Refresh token (required) |
| `UPSTREAM_URL` | `https://api.enginelabs.ai` | Upstream API base URL |
| `PORT` | `3112` | Proxy listen port |

## Tech stack

- Runtime: [Bun](https://bun.sh)
- Framework: [Hono](https://hono.dev)
