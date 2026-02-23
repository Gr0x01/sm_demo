import { PostHog } from "posthog-node";

let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (client) return client;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  client = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });
  return client;
}

// Cost constants (USD) — update when changing models in models.ts
const OPENAI_IMAGE_COST: Record<string, number> = {
  "gpt-image-1.5": 0.20, // high quality, 1536x1024
  "gpt-image-1": 0.08,
};
const DEFAULT_OPENAI_IMAGE_COST = 0.20;

const GEMINI_TOKEN_COST: Record<string, { input: number; output: number }> = {
  "gemini-3-flash-preview": { input: 0.50 / 1_000_000, output: 3.00 / 1_000_000 },
  "gemini-2.5-flash": { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
};
const DEFAULT_GEMINI_TOKEN_COST = { input: 0.50 / 1_000_000, output: 3.00 / 1_000_000 };

interface BaseEvent {
  provider: "openai" | "google";
  model: string;
  route: string;
  duration_ms: number;
  cost_usd: number;
  orgId?: string;
  orgSlug?: string;
  floorplanSlug?: string;
}

interface OpenAIEvent extends BaseEvent {
  provider: "openai";
  image_size?: string;
  image_quality?: string;
  second_pass?: boolean;
}

interface GeminiEvent extends BaseEvent {
  provider: "google";
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

type AiEvent = OpenAIEvent | GeminiEvent;

export async function captureAiEvent(distinctId: string, properties: AiEvent): Promise<void> {
  const ph = getClient();
  if (!ph) return;

  // Use orgSlug as group key to match client-side posthog.group("org", orgSlug)
  const groupKey = properties.orgSlug || properties.orgId;

  ph.capture({
    distinctId,
    event: "ai_generation",
    properties,
    ...(groupKey ? { groups: { org: groupKey } } : {}),
  });

  await ph.flush();
}

export function estimateOpenAICost(model: string, passes: number): number {
  return (OPENAI_IMAGE_COST[model] ?? DEFAULT_OPENAI_IMAGE_COST) * passes;
}

export function estimateGeminiCost(model: string, usage: { inputTokens?: number; outputTokens?: number }): number {
  const rates = GEMINI_TOKEN_COST[model] ?? DEFAULT_GEMINI_TOKEN_COST;
  return (
    (usage.inputTokens ?? 0) * rates.input +
    (usage.outputTokens ?? 0) * rates.output
  );
}
