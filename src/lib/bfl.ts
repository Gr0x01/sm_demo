import sharp from "sharp";

/**
 * BFL (Black Forest Labs) Flux 2 API client.
 *
 * Async pattern: POST submit → poll polling_url → download signed result URL.
 * Auth: x-key header (not Bearer).
 */

const BFL_API_URL = "https://api.bfl.ai/v1";

function getApiKey(): string {
  const key = process.env.BFL_API_KEY;
  if (!key) throw new Error("Missing BFL_API_KEY environment variable");
  return key;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BflModel = "flux-2-max" | "flux-2-pro" | "flux-2-flex" | "flux-2-klein-4b" | "flux-2-klein-9b";

interface SubmitResponse {
  id: string;
  polling_url: string;
  cost?: number;
}

type PollStatus =
  | "Pending"
  | "Ready"
  | "Error"
  | "Task not found"
  | "Request Moderated"
  | "Content Moderated";

interface PollResponse {
  id: string;
  status: PollStatus;
  result?: { sample?: string } & Record<string, unknown>;
  progress?: number | null;
}

/**
 * Thrown when BFL rejects the request due to content moderation.
 * Deterministic — retrying the same prompt will fail again.
 */
export class BflContentModerationError extends Error {
  constructor(status: string) {
    super(`BFL content moderated (${status})`);
    this.name = "BflContentModerationError";
  }
}

export interface GenerateImageParams {
  model: BflModel;
  prompt: string;
  inputImage: Buffer;
  /** Reference swatch images. Max supports up to 7, Flex up to 9, Klein 4B up to 3. */
  referenceImages?: Buffer[];
  width?: number;
  height?: number;
  /** Override max poll wait (default 90s). Use shorter values in two-pass splits. */
  maxWaitMs?: number;
  /** Inference steps (Flex only). More steps = higher quality, slower. */
  steps?: number;
  /** Guidance scale (Flex only). Higher = stricter prompt following. */
  guidance?: number;
}

export interface GenerateImageResult {
  imageBuffer: Buffer;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Reference image limits per model
// ---------------------------------------------------------------------------

const MAX_REFERENCES: Record<BflModel, number> = {
  "flux-2-max": 7,
  "flux-2-pro": 7,
  "flux-2-flex": 9,
  "flux-2-klein-4b": 3,
  "flux-2-klein-9b": 3,
};

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

async function submitImageEdit(
  model: BflModel,
  prompt: string,
  inputImage: Buffer,
  referenceImages: Buffer[] = [],
  width = 1536,
  height = 1024,
  steps?: number,
  guidance?: number,
): Promise<{ taskId: string; pollingUrl: string; cost?: number }> {
  const limit = MAX_REFERENCES[model];
  if (referenceImages.length > limit) {
    throw new Error(
      `[bfl] ${model} supports ${limit} reference images but got ${referenceImages.length}. ` +
        `Truncation is silent data loss — split the work into multiple passes or use a model with a higher reference limit.`,
    );
  }

  const body: Record<string, unknown> = {
    prompt,
    input_image: inputImage.toString("base64"),
    width,
    height,
    output_format: "jpeg",
    safety_tolerance: 5, // High permissiveness — inputs are always kitchen/room photos + material swatches (6 requires BFL authorization)
  };

  // Disable prompt upsampling when swatch references are present — BFL's
  // enhancement rewrites the prompt and can shift colors away from swatches.
  // Not available on Klein models (they ignore it).
  if (referenceImages.length > 0 && !model.includes("klein")) {
    body.prompt_upsampling = false;
  }

  // Flex-only parameters
  if (steps !== undefined) body.steps = steps;
  if (guidance !== undefined) body.guidance = guidance;

  for (let i = 0; i < referenceImages.length; i++) {
    body[`input_image_${i + 2}`] = referenceImages[i].toString("base64");
  }

  const res = await fetch(`${BFL_API_URL}/${model}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-key": getApiKey(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`BFL submit failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as SubmitResponse;
  return { taskId: data.id, pollingUrl: data.polling_url, cost: data.cost };
}

// ---------------------------------------------------------------------------
// Poll
// ---------------------------------------------------------------------------

async function pollForResult(
  pollingUrl: string,
  maxWaitMs = 90_000,
  intervalMs = 1_500,
): Promise<string> {
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const res = await fetch(pollingUrl, {
      headers: { "x-key": getApiKey() },
    });

    // 404 is normal during brief registration delay
    if (res.status === 404) {
      await sleep(intervalMs);
      continue;
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`BFL poll failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as PollResponse;

    switch (data.status) {
      case "Ready": {
        const sampleUrl = data.result?.sample;
        if (!sampleUrl) throw new Error("BFL returned Ready but no sample URL");
        return sampleUrl;
      }
      case "Error":
        throw new Error(`BFL generation failed: ${JSON.stringify(data.result)}`);
      case "Request Moderated":
      case "Content Moderated":
        throw new BflContentModerationError(data.status);
      case "Pending":
      case "Task not found":
        // Still processing — wait and retry
        break;
    }

    await sleep(intervalMs);
  }

  throw new Error(`BFL poll timed out after ${maxWaitMs}ms`);
}

// ---------------------------------------------------------------------------
// Download + convert
// ---------------------------------------------------------------------------

async function downloadResultImage(sampleUrl: string): Promise<Buffer> {
  const res = await fetch(sampleUrl);
  if (!res.ok) {
    throw new Error(`BFL image download failed (${res.status})`);
  }
  const arrayBuffer = await res.arrayBuffer();
  // Re-encode at q95 for consistent file size (~300-500KB). BFL's default
  // JPEG quality is unknown and could produce oversized files for storage/CDN.
  return sharp(Buffer.from(arrayBuffer))
    .resize(1536, 1024, { fit: "fill" })
    .jpeg({ quality: 95 })
    .toBuffer();
}

// ---------------------------------------------------------------------------
// High-level convenience
// ---------------------------------------------------------------------------

/**
 * Generate or edit an image via BFL Flux 2.
 * Handles the full submit → poll → download lifecycle.
 */
export async function generateImage(
  params: GenerateImageParams,
): Promise<GenerateImageResult> {
  const start = performance.now();

  const { taskId, pollingUrl } = await submitImageEdit(
    params.model,
    params.prompt,
    params.inputImage,
    params.referenceImages,
    params.width,
    params.height,
    params.steps,
    params.guidance,
  );

  console.log(`[bfl] Submitted ${params.model} task ${taskId}, polling...`);

  const sampleUrl = await pollForResult(pollingUrl, params.maxWaitMs);
  const imageBuffer = await downloadResultImage(sampleUrl);
  const durationMs = Math.round(performance.now() - start);

  console.log(`[bfl] ${params.model} task ${taskId} complete in ${durationMs}ms`);

  return { imageBuffer, durationMs };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
