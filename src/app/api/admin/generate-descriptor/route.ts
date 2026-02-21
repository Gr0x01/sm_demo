import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { captureAiEvent, estimateGeminiCost } from "@/lib/posthog-server";
import { VISION_MODEL } from "@/lib/models";

const schema = z.object({
  org_id: z.string(),
  option_name: z.string().min(1),
  option_description: z.string().optional(),
  subcategory_name: z.string().min(1),
  category_name: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const auth = await authenticateAdminRequest(body);
    if ("error" in auth) return auth.error;

    const { user, orgId, orgSlug } = auth;
    const { option_name, option_description, subcategory_name, category_name } = parsed.data;

    const descLine = option_description ? `\nDescription: ${option_description}` : "";

    const start = performance.now();
    const { text, usage } = await generateText({
      model: google(VISION_MODEL),
      prompt: `You are writing a concise, visually descriptive phrase (15-30 words) for a home upgrade option. This phrase will be used by an image generation model to accurately render the option in a room visualization.

Category: ${category_name}
Subcategory: ${subcategory_name}
Option: ${option_name}${descLine}

Write ONLY the descriptive phrase. No quotes, no explanation, no prefix. Focus on visual characteristics: material, color, texture, pattern, finish, and style. Be specific enough that an AI image generator would produce an accurate result.`,
      maxOutputTokens: 100,
    });
    const duration_ms = Math.round(performance.now() - start);

    await captureAiEvent(user.id, {
      provider: "google",
      model: VISION_MODEL,
      route: "/api/admin/generate-descriptor",
      duration_ms,
      cost_usd: estimateGeminiCost(VISION_MODEL, usage),
      orgId,
      orgSlug,
      prompt_tokens: usage.inputTokens,
      completion_tokens: usage.outputTokens,
      total_tokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
    });

    return NextResponse.json({ descriptor: text.trim() });
  } catch (err) {
    console.error("Descriptor generation error:", err);
    return NextResponse.json({ error: "Failed to generate descriptor" }, { status: 500 });
  }
}
