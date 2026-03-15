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
  image_size?: string;
  second_pass?: boolean;
}

type AiEvent = OpenAIEvent | GeminiEvent;

/**
 * Capture an AI event using PostHog's $ai_generation schema so it appears
 * in the LLM Analytics dashboard. Custom Finch properties are passed through
 * alongside the standard $ai_* properties.
 */
export async function captureAiEvent(distinctId: string, properties: AiEvent): Promise<void> {
  const ph = getClient();
  if (!ph) return;

  const groupKey = properties.orgSlug || properties.orgId;

  // Compute cost split — OpenAI image gen is output-only cost,
  // Gemini is token-based (input + output), computed independently
  const isGemini = properties.provider === "google";
  const rates = GEMINI_TOKEN_COST[properties.model] ?? DEFAULT_GEMINI_TOKEN_COST;
  const inputCost = isGemini
    ? ((properties as GeminiEvent).prompt_tokens ?? 0) * rates.input
    : 0;
  const outputCost = isGemini
    ? ((properties as GeminiEvent).completion_tokens ?? 0) * rates.output
    : properties.cost_usd;

  ph.capture({
    distinctId,
    event: "$ai_generation",
    properties: {
      // PostHog LLM Analytics standard properties
      $ai_provider: properties.provider,
      $ai_model: properties.model,
      $ai_latency: properties.duration_ms / 1000, // seconds
      $ai_input_tokens: isGemini ? (properties as GeminiEvent).prompt_tokens : undefined,
      $ai_output_tokens: isGemini ? (properties as GeminiEvent).completion_tokens : undefined,
      $ai_input_cost_usd: inputCost,
      $ai_output_cost_usd: outputCost,
      $ai_total_cost_usd: properties.cost_usd,
      $ai_is_error: false,
      // Finch custom properties (preserved for our own dashboards)
      ...properties,
    },
    ...(groupKey ? { groups: { org: groupKey } } : {}),
  });

  await ph.flush();
}

interface AiErrorEvent {
  provider: "openai" | "google";
  model: string;
  route: string;
  duration_ms: number;
  error: unknown;
  orgId?: string;
  orgSlug?: string;
  floorplanSlug?: string;
}

/** Capture a failed AI call so it appears in PostHog's LLM Analytics error view. */
export async function captureAiError(distinctId: string, properties: AiErrorEvent): Promise<void> {
  const ph = getClient();
  if (!ph) return;

  const groupKey = properties.orgSlug || properties.orgId;
  const errorMessage = properties.error instanceof Error
    ? properties.error.message
    : String(properties.error);

  ph.capture({
    distinctId,
    event: "$ai_generation",
    properties: {
      $ai_provider: properties.provider,
      $ai_model: properties.model,
      $ai_latency: properties.duration_ms / 1000,
      $ai_is_error: true,
      $ai_error: errorMessage,
      $ai_input_cost_usd: 0,
      $ai_output_cost_usd: 0,
      $ai_total_cost_usd: 0,
      // Finch custom properties
      route: properties.route,
      orgId: properties.orgId,
      orgSlug: properties.orgSlug,
      floorplanSlug: properties.floorplanSlug,
    },
    ...(groupKey ? { groups: { org: groupKey } } : {}),
  });

  await ph.flush();
}

/** Capture a generic server-side event (non-AI). */
export async function captureEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  const ph = getClient();
  if (!ph) return;

  ph.capture({ distinctId, event, properties });
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

