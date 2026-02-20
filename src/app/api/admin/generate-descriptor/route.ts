import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { authenticateAdminRequest } from "@/lib/admin-auth";

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

    const { option_name, option_description, subcategory_name, category_name } = parsed.data;

    const descLine = option_description ? `\nDescription: ${option_description}` : "";

    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      prompt: `You are writing a concise, visually descriptive phrase (15-30 words) for a home upgrade option. This phrase will be used by an image generation model to accurately render the option in a room visualization.

Category: ${category_name}
Subcategory: ${subcategory_name}
Option: ${option_name}${descLine}

Write ONLY the descriptive phrase. No quotes, no explanation, no prefix. Focus on visual characteristics: material, color, texture, pattern, finish, and style. Be specific enough that an AI image generator would produce an accurate result.`,
      maxOutputTokens: 100,
    });

    return NextResponse.json({ descriptor: text.trim() });
  } catch (err) {
    console.error("Descriptor generation error:", err);
    return NextResponse.json({ error: "Failed to generate descriptor" }, { status: 500 });
  }
}
