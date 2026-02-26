import { GoogleGenAI } from "@google/genai";
import type { Option, SubCategory } from "@/types";

// Max swatch images per Gemini pass (14 total input images - 1 room photo = 13 swatches)
export const MAX_GEMINI_SWATCHES = 13;

// Gemini needs explicit output format constraints that OpenAI's `size` param handles.
const GEMINI_OUTPUT_PREAMBLE = `OUTPUT FORMAT: Return a single, seamless photograph — NOT a collage, NOT a split-screen, NOT a before-and-after comparison, NOT multiple panels. No borders, no dividers, no side-by-side layout. One unified landscape-orientation image preserving the original photo's full field of view, camera angle, and spatial composition.
GEOMETRY LOCK: Preserve the exact input framing and camera geometry (no crop, zoom, tilt, pan, lens shift, or vanishing-point drift). Edit only targeted surfaces in-place.

`;

export function wrapPromptForGemini(productionPrompt: string): string {
  return GEMINI_OUTPUT_PREAMBLE + productionPrompt;
}

// Singleton client
let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (client) return client;
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("Missing env var: GOOGLE_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY");
  client = new GoogleGenAI({ apiKey });
  return client;
}

export async function generateImageWithGemini({
  roomBuffer,
  roomMimeType,
  swatches,
  prompt,
  model,
}: {
  roomBuffer: Buffer;
  roomMimeType: string;
  swatches: Array<{ buffer: Buffer; mediaType: string }>;
  prompt: string;
  model: string;
}): Promise<{ b64: string; mimeType: string }> {
  const ai = getClient();

  const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [];

  // Room photo first (base image to edit)
  parts.push({ inlineData: { mimeType: roomMimeType, data: roomBuffer.toString("base64") } });

  // Swatch images in deterministic order (matches prompt swatch #N references)
  for (const swatch of swatches) {
    parts.push({ inlineData: { mimeType: swatch.mediaType, data: swatch.buffer.toString("base64") } });
  }

  // Text prompt last
  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio: "3:2",
        imageSize: "1K",
      },
    },
  });

  const candidate = response.candidates?.[0];
  if (!candidate?.content?.parts) throw new Error("No response parts from Gemini");

  for (const part of candidate.content.parts) {
    if ((part as any).inlineData) {
      const { data, mimeType } = (part as any).inlineData;
      return { b64: data, mimeType: mimeType || "image/png" };
    }
  }

  throw new Error("No image in Gemini response");
}

/**
 * Split selections into batches where each batch has <= MAX_GEMINI_SWATCHES swatch-bearing selections.
 * Non-swatch selections (appliances, hex-only) go in batch 1 only (text-only instructions).
 */
export function splitSelectionsForGemini(
  selections: Record<string, string>,
  optionLookup: Map<string, { option: Option; subCategory: SubCategory }>,
): Record<string, string>[] {
  const swatchBearing: [string, string][] = [];
  const nonSwatch: [string, string][] = [];

  for (const [subSlug, optSlug] of Object.entries(selections)) {
    const found = optionLookup.get(`${subSlug}:${optSlug}`);
    if (found?.option.swatchUrl) {
      swatchBearing.push([subSlug, optSlug]);
    } else {
      nonSwatch.push([subSlug, optSlug]);
    }
  }

  // No splitting needed
  if (swatchBearing.length <= MAX_GEMINI_SWATCHES) {
    return [selections];
  }

  // Chunk swatch-bearing into groups of MAX_GEMINI_SWATCHES
  const batches: Record<string, string>[] = [];
  for (let i = 0; i < swatchBearing.length; i += MAX_GEMINI_SWATCHES) {
    const chunk = swatchBearing.slice(i, i + MAX_GEMINI_SWATCHES);
    const batch = Object.fromEntries(chunk);
    // Non-swatch selections go in batch 1 only
    if (i === 0) {
      Object.assign(batch, Object.fromEntries(nonSwatch));
    }
    batches.push(batch);
  }

  return batches;
}
