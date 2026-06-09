import { Hono } from "hono";
import { cors } from "hono/cors";
import { listModels } from "../handlers/models";
import { chatCompletion } from "../handlers/chat";

const v1 = new Hono();

v1.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-session-id", "x-session-affinity"],
    maxAge: 86400,
  })
);

v1.get("/models", (c) => listModels());
v1.post("/chat/completions", (c) => chatCompletion(c.req.raw));

export { v1 as v1Routes };
