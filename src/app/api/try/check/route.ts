import { NextResponse } from "next/server";
import { hashDemoSelections } from "@/lib/demo-generate";
import type { DemoSceneAnalysis } from "@/lib/demo-scene";
import { getServiceClient } from "@/lib/supabase";

/**
 * Demo per-photo cache check.
 *
 * Returns:
 * - status: "complete" + imageUrl when cached result exists
 * - status: "pending" when __pending__ placeholder exists (generation in progress)
 * - status: "not_found" when no row exists (generation failed or never started)
 * - status: "error" on transient DB errors (keep polling)
 */
export async function POST(request: Request) {
  try {
    const { photoHash, selections, sceneAnalysis } = await request.json() as {
      photoHash?: string;
      selections?: Record<string, string>;
      sceneAnalysis?: DemoSceneAnalysis;
    };

    if (!photoHash || !selections || typeof selections !== "object") {
      return NextResponse.json({ status: "not_found", imageUrl: null });
    }

    const { combinedHash, effectiveSelections } = hashDemoSelections(photoHash, selections, sceneAnalysis);
    if (Object.keys(effectiveSelections).length === 0) {
      return NextResponse.json({ status: "not_found", imageUrl: null });
    }

    const supabase = getServiceClient();
    const { data: row, error: queryError } = await supabase
      .from("generated_images")
      .select("image_path")
      .eq("selections_hash", combinedHash)
      .single();

    if (queryError) {
      // PGRST116 = "no rows returned" from .single() — genuine not_found
      if (queryError.code === "PGRST116") {
        return NextResponse.json({ status: "not_found", imageUrl: null });
      }
      // Anything else is transient — keep polling
      return NextResponse.json({ status: "error", imageUrl: null });
    }

    if (!row) {
      return NextResponse.json({ status: "not_found", imageUrl: null });
    }

    if (row.image_path === "__pending__") {
      return NextResponse.json({ status: "pending", imageUrl: null });
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("demo-generated")
      .getPublicUrl(row.image_path);

    return NextResponse.json({ status: "complete", imageUrl: publicUrl });
  } catch {
    return NextResponse.json({ status: "error", imageUrl: null });
  }
}
