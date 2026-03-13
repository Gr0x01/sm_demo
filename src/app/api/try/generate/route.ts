import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEMO_SUBCATEGORY_IDS, DEMO_OPTION_IDS } from "@/lib/demo-options";
import { hashDemoSelections, DEMO_ORG_ID } from "@/lib/demo-generate";
import type { DemoSceneAnalysis } from "@/lib/demo-scene";
import { getServiceClient } from "@/lib/supabase";
import { inngest } from "@/inngest/client";

const MAX_DEMO_GENERATIONS = 5;

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    // Server-side generation cap: count completed (non-pending) demo rows
    // tied to this session's photo hashes. Use the session cookie as identity.
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("finch_demo_session")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "Missing session" }, { status: 400 });
    }

    const { photoBase64, photoHash, selections, sceneAnalysis } = await request.json() as {
      photoBase64?: string;
      photoHash?: string;
      selections?: Record<string, string>;
      sceneAnalysis?: DemoSceneAnalysis;
    };

    if (!photoBase64 || typeof photoBase64 !== "string") {
      return NextResponse.json({ error: "Missing photo data" }, { status: 400 });
    }
    if (!photoHash || typeof photoHash !== "string") {
      return NextResponse.json({ error: "Missing photo hash" }, { status: 400 });
    }
    if (!selections || typeof selections !== "object") {
      return NextResponse.json({ error: "Invalid selections" }, { status: 400 });
    }

    // Validate selection keys are demo subcategories
    const unknownKeys = Object.keys(selections).filter((k) => !DEMO_SUBCATEGORY_IDS.has(k));
    if (unknownKeys.length > 0) {
      return NextResponse.json(
        { error: `Unknown selection keys: ${unknownKeys.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate option IDs
    const unknownOptions = Object.values(selections).filter((v) => !DEMO_OPTION_IDS.has(v as string));
    if (unknownOptions.length > 0) {
      return NextResponse.json(
        { error: `Unknown option IDs: ${unknownOptions.join(", ")}` },
        { status: 400 }
      );
    }

    // Drop selections for surfaces that are not visible in this photo.
    const { combinedHash, effectiveSelections } = hashDemoSelections(photoHash, selections, sceneAnalysis);
    if (Object.keys(effectiveSelections).length === 0) {
      return NextResponse.json(
        { error: "None of the selected surfaces are visible in this photo." },
        { status: 400 },
      );
    }

    const supabase = getServiceClient();

    // Server-side generation cap: count completed demo generations for this session
    const { count: genCount } = await supabase
      .from("generated_images")
      .select("id", { count: "exact", head: true })
      .eq("org_id", DEMO_ORG_ID)
      .neq("image_path", "__pending__")
      .eq("selections_json->>_source", "demo")
      .eq("selections_json->>session_id", sessionId);

    if ((genCount ?? 0) >= MAX_DEMO_GENERATIONS) {
      return NextResponse.json(
        { error: "Demo generation limit reached" },
        { status: 429 },
      );
    }

    // Cache check
    const { data: cached } = await supabase
      .from("generated_images")
      .select("image_path")
      .eq("selections_hash", combinedHash)
      .neq("image_path", "__pending__")
      .single();

    if (cached?.image_path) {
      const {
        data: { publicUrl },
      } = supabase.storage
        .from("demo-generated")
        .getPublicUrl(cached.image_path);

      return NextResponse.json({ imageUrl: publicUrl, cacheHit: true });
    }

    // --- Claim slot via DB (cross-instance safe, replaces in-memory Set) ---
    const staleThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    await supabase
      .from("generated_images")
      .delete()
      .eq("selections_hash", combinedHash)
      .eq("image_path", "__pending__")
      .lt("created_at", staleThreshold);

    const { error: claimError } = await supabase
      .from("generated_images")
      .insert({
        selections_hash: combinedHash,
        selections_json: { _source: "demo", session_id: sessionId, ...effectiveSelections },
        image_path: "__pending__",
        org_id: DEMO_ORG_ID,
        step_id: null,
      });

    if (claimError) {
      if (claimError.code === "23505") {
        // Already in progress — tell client to poll
        return NextResponse.json(
          { error: "Already being generated", combinedHash },
          { status: 429 }
        );
      }
      console.error("[demo/generate] Claim slot failed:", claimError);
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }

    // Upload user photo to demo-uploads (Inngest function will download it)
    const photoBuffer = Buffer.from(photoBase64, "base64");
    await supabase.storage
      .from("demo-uploads")
      .upload(`${photoHash}.jpg`, photoBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    // --- Dispatch to Inngest ---
    try {
      await inngest.send({
        name: "demo/generate.requested",
        data: {
          combinedHash,
          photoHash,
          sessionId,
          effectiveSelections,
          sceneAnalysis: sceneAnalysis ?? null,
        },
      });
    } catch (sendError) {
      console.error("[demo/generate] Inngest send failed:", sendError);
      // Release slot
      await supabase
        .from("generated_images")
        .delete()
        .eq("selections_hash", combinedHash)
        .eq("image_path", "__pending__");
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }

    return NextResponse.json({ combinedHash }, { status: 202 });
  } catch (error) {
    console.error("[demo/generate] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
