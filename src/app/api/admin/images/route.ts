import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { getServiceClient } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("org_id") ?? "";

    const auth = await authenticateAdminRequest({ org_id: orgId });
    if ("error" in auth) return auth.error;

    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("generated_images")
      .select("selections_hash, selections_json, image_path, prompt, created_at")
      .eq("org_id", auth.orgId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const images = (data ?? []).map((row) => {
      const {
        data: { publicUrl },
      } = supabase.storage.from("generated-images").getPublicUrl(row.image_path);

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
    const body = await request.json();
    const { selections_hash, deleteAll } = body;

    const auth = await authenticateAdminRequest(body);
    if ("error" in auth) return auth.error;

    const supabase = getServiceClient();

    if (deleteAll) {
      // Fetch all image paths for this org
      const { data: allRows } = await supabase
        .from("generated_images")
        .select("image_path")
        .eq("org_id", auth.orgId);

      if (allRows && allRows.length > 0) {
        const paths = allRows.map((r) => r.image_path);
        await supabase.storage.from("generated-images").remove(paths);
        await supabase
          .from("generated_images")
          .delete()
          .eq("org_id", auth.orgId);
      }

      return NextResponse.json({ success: true, deleted: allRows?.length ?? 0 });
    }

    if (!selections_hash) {
      return NextResponse.json(
        { error: "Missing selections_hash" },
        { status: 400 }
      );
    }

    // Verify the row belongs to this org and get its image_path
    const { data: row, error: lookupErr } = await supabase
      .from("generated_images")
      .select("image_path")
      .eq("selections_hash", selections_hash)
      .eq("org_id", auth.orgId)
      .single();

    if (lookupErr || !row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete storage file using the verified path from DB
    await supabase.storage.from("generated-images").remove([row.image_path]);

    // Delete DB row
    const { error } = await supabase
      .from("generated_images")
      .delete()
      .eq("selections_hash", selections_hash)
      .eq("org_id", auth.orgId);

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
