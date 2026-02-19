import { NextResponse } from "next/server";
import { hashSelections } from "@/lib/generate";
import { getServiceClient } from "@/lib/supabase";
import { getVisualSubCategoryIdsFromDb } from "@/lib/db-queries";

// Hardcoded org for SM demo — will be dynamic in Phase 2
const SM_ORG_SLUG = "stone-martin";

export async function POST(request: Request) {
  try {
    const { selections, model } = await request.json();

    if (!selections || typeof selections !== "object") {
      return NextResponse.json({ imageUrl: null });
    }

    // Resolve org from DB
    const supabase = getServiceClient();
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", SM_ORG_SLUG)
      .single();

    if (!org) {
      return NextResponse.json({ imageUrl: null });
    }

    // Filter to only visual selections
    const validIds = await getVisualSubCategoryIdsFromDb(org.id);
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
