export function openaiError(status: number, message: string, code?: string) {
  return Response.json(
    {
      error: {
        message,
        type: code || "api_error",
        code: code || "internal_error",
      },
    },
    { status }
  );
}

export function upstreamHeaders(extra: Record<string, string> = {}): Headers {
  const h = new Headers({
    "Accept-Encoding": "gzip, deflate, br, zstd",
    Connection: "keep-alive",
    Host: "api.enginelabs.ai",
    "User-Agent": "opencode/1.15.0 ai-sdk/provider-utils/4.0.23 runtime/bun/1.3.13",
    Accept: "*/*",
    ...extra,
  });
  return h;
}
