# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# architecture
- The proxy should handle auth independently without depending on the cto CLI's credentials file. Confidence: 0.60
- Proactively refresh tokens before expiry to maintain chat continuity during streaming. Confidence: 0.60
- When configuring OpenCode providers to route through the local proxy, use a novel provider name (not "cto" or other names OpenCode has built-in handlers for) to force OpenCode to treat it as a generic OpenAI-compatible endpoint and respect the baseURL. Confidence: 0.70

# code-style
- Keep route files thin — extract business logic into separate handler modules (e.g., handlers/chat.ts, handlers/models.ts) and shared utilities (e.g., upstream.ts for fetch + auth). Confidence: 0.65

