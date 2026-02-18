import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("generated_images")
      .select("selections_hash, selections_json, image_path, prompt, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const images = (data ?? []).map((row) => {
      const {
        data: { publicUrl },
      } = supabase.storage.from("kitchen-images").getPublicUrl(row.image_path);

      return { ...row, publicUrl };
    });

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Admin images GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { selections_hash, image_path, deleteAll } = await request.json();
    const supabase = getServiceClient();

    if (deleteAll) {
      // Fetch all image paths first
      const { data: allRows } = await supabase
        .from("generated_images")
        .select("image_path");

      if (allRows && allRows.length > 0) {
        const paths = allRows.map((r) => r.image_path);
        await supabase.storage.from("kitchen-images").remove(paths);
        await supabase.from("generated_images").delete().neq("selections_hash", "");
      }

      return NextResponse.json({ success: true, deleted: allRows?.length ?? 0 });
    }

    if (!selections_hash || !image_path) {
      return NextResponse.json(
        { error: "Missing selections_hash or image_path" },
        { status: 400 }
      );
    }

    // Delete storage file
    await supabase.storage.from("kitchen-images").remove([image_path]);

    // Delete DB row
    const { error } = await supabase
      .from("generated_images")
      .delete()
      .eq("selections_hash", selections_hash);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin images DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}
