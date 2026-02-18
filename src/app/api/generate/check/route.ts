import { NextResponse } from "next/server";
import { hashSelections } from "@/lib/generate";
import { getServiceClient } from "@/lib/supabase";
import { getVisualSubCategoryIds } from "@/lib/options-data";

export async function POST(request: Request) {
  try {
    const { selections, model } = await request.json();

    if (!selections || typeof selections !== "object") {
      return NextResponse.json({ imageUrl: null });
    }

    // Filter to only visual selections
    const validIds = getVisualSubCategoryIds();
    const visualSelections: Record<string, string> = {};
    for (const [k, v] of Object.entries(selections)) {
      if (validIds.has(k)) visualSelections[k] = v as string;
    }

    if (Object.keys(visualSelections).length === 0) {
      return NextResponse.json({ imageUrl: null });
    }

    // Include model in hash to match /api/generate
    const modelName = model === "gpt-5.2" ? "gpt-5.2" : "gpt-image-1.5";
    const selectionsHash = hashSelections({ ...visualSelections, _model: modelName });
    const supabase = getServiceClient();

    const { data: cached } = await supabase
      .from("generated_images")
      .select("image_path")
      .eq("selections_hash", selectionsHash)
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
