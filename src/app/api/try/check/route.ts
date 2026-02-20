import { NextResponse } from "next/server";
import { hashDemoSelections } from "@/lib/demo-generate";
import type { DemoSceneAnalysis } from "@/lib/demo-scene";
import { getServiceClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { photoHash, selections, sceneAnalysis } = await request.json() as {
      photoHash?: string;
      selections?: Record<string, string>;
      sceneAnalysis?: DemoSceneAnalysis;
    };

    if (!photoHash || !selections || typeof selections !== "object") {
      return NextResponse.json({ imageUrl: null });
    }

    const { combinedHash, effectiveSelections } = hashDemoSelections(photoHash, selections, sceneAnalysis);
    if (Object.keys(effectiveSelections).length === 0) {
      return NextResponse.json({ imageUrl: null });
    }

    const supabase = getServiceClient();
    const { data: cached } = await supabase
      .from("generated_images")
      .select("image_path")
      .eq("selections_hash", combinedHash)
      .single();

    if (cached?.image_path) {
      const {
        data: { publicUrl },
      } = supabase.storage
        .from("kitchen-images")
        .getPublicUrl(cached.image_path);

      return NextResponse.json({ imageUrl: publicUrl });
    }

    return NextResponse.json({ imageUrl: null });
  } catch {
    return NextResponse.json({ imageUrl: null });
  }
}
