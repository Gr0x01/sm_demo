export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import sharp from "sharp";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { getServiceClient } from "@/lib/supabase";

const requestSchema = z.object({
  org_id: z.string(),
  step_photo_id: z.string(),
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

    const { supabase, orgId } = auth;
    const { step_photo_id } = parsed.data;

    // Fetch step_photo
    const { data: photo, error: photoErr } = await supabase
      .from("step_photos")
      .select("id, image_path")
      .eq("id", step_photo_id)
      .eq("org_id", orgId)
      .single();

    if (photoErr || !photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Download image
    const serviceClient = getServiceClient();
    const { data: fileData, error: downloadErr } = await serviceClient.storage
      .from("rooms")
      .download(photo.image_path);

    if (downloadErr || !fileData) {
      return NextResponse.json({ error: "Failed to download image" }, { status: 500 });
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    // Resize to max 1536px for vision model (saves tokens/memory)
    const resized = await sharp(buffer)
      .resize(1536, 1536, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    const base64 = resized.toString("base64");
    const mimeType = "image/jpeg";

    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      messages: [
        {
          role: "user",
          content: [
            { type: "image", image: `data:${mimeType};base64,${base64}` },
            {
              type: "text",
              text: "Describe the spatial layout of this room photo for an AI image editing system. Include: where major fixtures/appliances sit, cabinet locations, countertop visibility, window positions, alcoves or cutouts. Write 1-3 sentences of concise spatial facts.",
            },
          ],
        },
      ],
    });

    return NextResponse.json({ spatial_hint: text });
  } catch (error) {
    console.error("[spatial-hint] Error:", error);
    return NextResponse.json({ error: "Failed to generate spatial hint" }, { status: 500 });
  }
}
