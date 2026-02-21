export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import sharp from "sharp";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { getServiceClient } from "@/lib/supabase";
import { captureAiEvent, estimateGeminiCost } from "@/lib/posthog-server";
import { VISION_MODEL } from "@/lib/models";

const requestSchema = z.object({
  org_id: z.string(),
  step_photo_id: z.string(),
});

const checkSchema = z.object({
  isInteriorRoom: z.boolean(),
  hasAdequateLighting: z.boolean(),
  isReasonablyClear: z.boolean(),
  roomType: z.string(),
  framing: z.enum(["good", "partial", "extreme_angle"]),
  feedback: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const auth = await authenticateAdminRequest(body);
    if ("error" in auth) return auth.error;

    const { supabase, user, orgId, orgSlug } = auth;
    const { step_photo_id } = parsed.data;

    // Fetch step_photo
    const { data: photo, error: photoErr } = await supabase
      .from("step_photos")
      .select("id, image_path, step_id")
      .eq("id", step_photo_id)
      .eq("org_id", orgId)
      .single();

    if (photoErr || !photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Download image from storage
    const serviceClient = getServiceClient();
    const { data: fileData, error: downloadErr } = await serviceClient.storage
      .from("rooms")
      .download(photo.image_path);

    if (downloadErr || !fileData) {
      return NextResponse.json({ error: "Failed to download image" }, { status: 500 });
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    // Server-side dimension check
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height || metadata.width < 1024 || metadata.height < 1024) {
      const result = {
        check_result: "fail" as const,
        check_feedback: `Image resolution too low (${metadata.width || 0}x${metadata.height || 0}). Minimum 1024x1024.`,
      };

      await supabase
        .from("step_photos")
        .update({
          check_result: result.check_result,
          check_feedback: result.check_feedback,
          checked_at: new Date().toISOString(),
        })
        .eq("id", step_photo_id)
        .eq("org_id", orgId);

      return NextResponse.json(result);
    }

    // Resize to max 1536px for vision model (saves tokens/memory)
    const resized = await sharp(buffer)
      .resize(1536, 1536, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    const base64 = resized.toString("base64");
    const mimeType = "image/jpeg";

    // Call vision model
    const start = performance.now();
    const { object, usage } = await generateObject({
      model: google(VISION_MODEL),
      schema: checkSchema,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", image: `data:${mimeType};base64,${base64}` },
            {
              type: "text",
              text: "Analyze this photo for use as a room photo in a home builder upgrade visualization tool. Check: Is it an interior room? Is lighting adequate? Is the image clear (not blurry)? What type of room is it? How is the framing? Provide brief feedback.",
            },
          ],
        },
      ],
    });
    const duration_ms = Math.round(performance.now() - start);

    await captureAiEvent(user.id, {
      provider: "google",
      model: VISION_MODEL,
      route: "/api/admin/photo-check",
      duration_ms,
      cost_usd: estimateGeminiCost(VISION_MODEL, usage),
      orgId,
      orgSlug,
      prompt_tokens: usage.inputTokens,
      completion_tokens: usage.outputTokens,
      total_tokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
    });

    // Derive result
    let check_result: "pass" | "warn" | "fail";
    if (!object.isInteriorRoom || !object.isReasonablyClear) {
      check_result = "fail";
    } else if (!object.hasAdequateLighting || object.framing !== "good") {
      check_result = "warn";
    } else {
      check_result = "pass";
    }

    const check_feedback = object.feedback;

    // Update step_photos row
    await supabase
      .from("step_photos")
      .update({
        check_result,
        check_feedback,
        check_raw_response: object,
        checked_at: new Date().toISOString(),
      })
      .eq("id", step_photo_id)
      .eq("org_id", orgId);

    return NextResponse.json({ check_result, check_feedback });
  } catch (error) {
    console.error("[photo-check] Error:", error);
    return NextResponse.json({ error: "Failed to check photo" }, { status: 500 });
  }
}
