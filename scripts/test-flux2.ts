/**
 * FLUX.2 Flex Edit proof-of-concept — compare speed & quality vs gpt-image-1.5
 *
 * Tests fal.ai's FLUX.2 Flex Edit (up to 10 reference images) against our
 * existing OpenAI pipeline using the same room photo + swatch images.
 *
 * Setup:
 *   1. Sign up at fal.ai/dashboard, grab an API key
 *   2. Add FAL_KEY=fal-... to .env.local
 *   3. npm install @fal-ai/client (dev dependency)
 *
 * Usage:
 *   npx tsx scripts/test-flux2.ts                    # run both models, compare
 *   npx tsx scripts/test-flux2.ts --flux-only        # FLUX.2 only
 *   npx tsx scripts/test-flux2.ts --openai-only      # OpenAI only (baseline)
 *   npx tsx scripts/test-flux2.ts --photo kitchen    # specific photo (default: kitchen)
 */

import dotenv from "dotenv";
import dotenvLocal from "dotenv";
dotenv.config({ path: ".env" });
dotenvLocal.config({ path: ".env.local", override: true });
import fs from "fs";
import path from "path";
import sharp from "sharp";
import OpenAI, { toFile } from "openai";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const FAL_KEY = process.env.FAL_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Use the Demo org's kitchen photo (Stylecraft prospect — good test case)
// Override with --org and --photo flags
const DEFAULT_ORG_SLUG = "demo";

// Output directory for side-by-side comparison
const OUTPUT_DIR = path.join(__dirname, "../.flux-test-output");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SwatchInfo {
  label: string;
  buffer: Buffer;
  mediaType: string;
  anchorHex?: string;
}

interface TestResult {
  model: string;
  durationMs: number;
  outputPath: string;
  swatchCount: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function downloadFromStorage(bucket: string, storagePath: string): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(bucket).download(storagePath);
  if (error || !data) throw new Error(`Download failed: ${bucket}/${storagePath}: ${error?.message}`);
  return Buffer.from(await data.arrayBuffer());
}

async function extractAnchorHex(buffer: Buffer): Promise<string | null> {
  try {
    const stats = await sharp(buffer).removeAlpha().resize(64, 64, { fit: "inside" }).stats();
    const [r, g, b] = stats.channels;
    if (!r || !g || !b) return null;
    const hex = (n: number) => Math.round(n).toString(16).padStart(2, "0").toUpperCase();
    return `#${hex(r.mean)}${hex(g.mean)}${hex(b.mean)}`;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Load test data from Supabase (real room photo + real swatches)
// ---------------------------------------------------------------------------

async function loadTestData(orgSlug: string, photoLabel?: string) {
  // Find the org
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", orgSlug)
    .single();
  if (!org) throw new Error(`Org not found: ${orgSlug}`);

  // Find a kitchen step_photo (or the requested photo)
  const searchLabel = photoLabel || "kitchen";

  // Two-step query: get floorplan IDs for this org, then find matching photos
  const { data: floorplans } = await supabase
    .from("floorplans")
    .select("id, slug")
    .eq("org_id", org.id);
  if (!floorplans?.length) throw new Error(`No floorplans found for org ${orgSlug}`);
  const floorplanIds = floorplans.map((f) => f.id);

  const { data: steps } = await supabase
    .from("steps")
    .select("id, sections, floorplan_id, scene_description, spatial_hints")
    .in("floorplan_id", floorplanIds);
  const stepIds = (steps || []).map((s) => s.id);

  const { data: photos } = await supabase
    .from("step_photos")
    .select("id, label, image_path, photo_baseline, spatial_hint, step_id")
    .in("step_id", stepIds)
    .ilike("label", `%${searchLabel}%`)
    .limit(1);

  if (!photos?.length) {
    const { data: allPhotos } = await supabase
      .from("step_photos")
      .select("id, label")
      .in("step_id", stepIds);
    console.log("Available photos:", allPhotos?.map((p) => p.label));
    throw new Error(`No "${searchLabel}" photo found for org ${orgSlug}`);
  }
  const photo = photos[0];
  const photoStep = (steps || []).find((s) => s.id === photo.step_id);
  const photoFloorplan = floorplans.find((f) => f.id === photoStep?.floorplan_id);
  console.log(`Using photo: "${photo.label}" (${photo.id})`);

  // Download hero image
  const heroBuffer = await downloadFromStorage("rooms", photo.image_path);
  const heroExt = photo.image_path.split(".").pop()?.toLowerCase() || "webp";
  const needsConvert = !["png", "jpg", "jpeg", "webp", "gif"].includes(heroExt);
  const imageBuffer = needsConvert ? await sharp(heroBuffer).png().toBuffer() : heroBuffer;
  const heroMime = needsConvert ? "image/png" : heroExt === "jpg" ? "image/jpeg" : `image/${heroExt}`;

  // Get scoped subcategory slugs from step sections
  const sections = (photoStep?.sections as any[]) || [];
  const subcategorySlugs: string[] = [];
  for (const section of sections) {
    const ids = section.subcategory_ids || section.subcategoryIds || [];
    subcategorySlugs.push(...ids);
  }

  // Get subcategories with their options
  const { data: subcategories } = await supabase
    .from("subcategories")
    .select(`
      id, slug, name, generation_hint, generation_rules, generation_rules_when_not_selected, is_appliance,
      options(id, slug, name, swatch_url, swatch_color, prompt_descriptor, generation_rules, is_default)
    `)
    .eq("categories.org_id", org.id)
    .in("slug", subcategorySlugs);

  // For each subcategory, pick the default option (or first with a swatch)
  const swatches: SwatchInfo[] = [];
  const listLines: string[] = [];
  let listIndex = 1;
  let swatchIndex = 1;

  // If we can't match by slug join, load subcategories differently
  const { data: allSubcats } = await supabase
    .from("subcategories")
    .select(`
      id, slug, name, generation_hint, generation_rules, generation_rules_when_not_selected, is_appliance,
      category:categories!inner(org_id),
      options(id, slug, name, swatch_url, swatch_color, prompt_descriptor, generation_rules, is_default)
    `)
    .eq("categories.org_id", org.id)
    .in("slug", subcategorySlugs);

  const subcatMap = new Map((allSubcats || []).map((s) => [s.slug, s]));

  for (const slug of subcategorySlugs) {
    const sub = subcatMap.get(slug);
    if (!sub) continue;

    // Pick a non-default option with a swatch (more interesting for viz test)
    const options = (sub.options || []) as any[];
    const nonDefault = options.find((o: any) => !o.is_default && o.swatch_url);
    const defaultOpt = options.find((o: any) => o.is_default);
    const picked = nonDefault || defaultOpt;
    if (!picked) continue;

    const hint = sub.generation_hint;
    const targetLabel = hint ? `${sub.name} → apply to ${hint}` : sub.name;

    if (picked.swatch_url) {
      try {
        // Extract storage path from swatch URL
        let storagePath = picked.swatch_url;
        if (storagePath.startsWith("http")) {
          const match = storagePath.match(/\/object\/public\/swatches\/(.+)$/);
          if (match) storagePath = match[1];
        }
        if (storagePath.startsWith("/swatches/")) storagePath = storagePath.slice("/swatches/".length);

        const swatchBuffer = await downloadFromStorage("swatches", storagePath);
        const ext = storagePath.split(".").pop()?.toLowerCase() || "png";
        const mediaType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
        const anchorHex = await extractAnchorHex(swatchBuffer);

        swatches.push({ label: targetLabel, buffer: swatchBuffer, mediaType, anchorHex: anchorHex ?? undefined });
        const anchorSuffix = anchorHex ? `; color anchor ${anchorHex}` : "";
        listLines.push(`${listIndex}. ${targetLabel} (use swatch #${swatchIndex}${anchorSuffix})`);
        swatchIndex++;
      } catch (e) {
        listLines.push(`${listIndex}. ${targetLabel}: ${picked.name} (no swatch available)`);
      }
    } else {
      const hex = picked.swatch_color?.trim();
      if (hex) {
        listLines.push(`${listIndex}. ${targetLabel} (target color ${hex})`);
      } else {
        listLines.push(`${listIndex}. ${targetLabel}: ${picked.name}`);
      }
    }
    listIndex++;
  }

  // Build prompt (simplified version of buildEditPrompt)
  const sceneDescription = photoStep?.scene_description as string | null;
  const photoSpatialHint = photo.spatial_hint as string | null;
  const sceneBlock = sceneDescription ? `SCENE: ${sceneDescription}\n` : "";
  const layoutBlock = photoSpatialHint ? `PHOTO_LAYOUT: ${photoSpatialHint}\n` : "";
  const swatchMapping = swatches.length > 0
    ? `Swatch mapping: after the base room photo, attached swatches are ordered #1..#${swatches.length}.`
    : "No swatch attachments; use text only.";

  const prompt = `${sceneBlock}${layoutBlock}
Edit this room photo. Change ONLY the color/texture of these surfaces — nothing else:

${listLines.join("\n")}

RULES:
- ${swatchMapping}
- For each item marked "(use swatch #N)", match that swatch's color, pattern, and texture EXACTLY on the specified surface.
- The "→ apply to" text tells you WHERE in the photo to apply each change.
- Do NOT add, remove, or move any object.
- Keep the exact camera angle, perspective, lighting, and room layout.
- Photorealistic result with accurate shadows and reflections.`;

  return {
    org,
    photo,
    imageBuffer,
    heroMime,
    swatches,
    prompt,
    listLines,
  };
}

// ---------------------------------------------------------------------------
// OpenAI generation (baseline)
// ---------------------------------------------------------------------------

async function runOpenAI(
  imageBuffer: Buffer,
  heroMime: string,
  swatches: SwatchInfo[],
  prompt: string,
): Promise<TestResult> {
  if (!OPENAI_KEY) return { model: "gpt-image-1.5", durationMs: 0, outputPath: "", swatchCount: swatches.length, error: "No OPENAI_API_KEY" };

  const openai = new OpenAI();

  // Convert non-standard formats to PNG (matches production pipeline)
  const preparedSwatches: { buffer: Buffer; mediaType: string; label: string }[] = [];
  for (const s of swatches) {
    let buffer = s.buffer;
    let mime = s.mediaType;
    if (mime.includes("svg") || !["image/png", "image/jpeg", "image/webp"].includes(mime)) {
      try { buffer = await sharp(buffer).png().toBuffer(); mime = "image/png"; } catch { continue; }
    }
    preparedSwatches.push({ buffer, mediaType: mime, label: s.label });
  }

  const inputImages = [
    await toFile(imageBuffer, "room.png", { type: heroMime }),
    ...await Promise.all(
      preparedSwatches.map((s) => {
        const ext = s.mediaType.split("/")[1] || "png";
        return toFile(s.buffer, `${s.label.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`, { type: s.mediaType });
      }),
    ),
  ];

  console.log(`\n--- OpenAI gpt-image-1.5 ---`);
  console.log(`Sending ${inputImages.length} images (1 room + ${swatches.length} swatches)`);

  const start = performance.now();
  try {
    const result = await openai.images.edit({
      model: "gpt-image-1.5",
      image: inputImages,
      prompt,
      quality: "medium",
      size: "1536x1024",
      input_fidelity: "high",
    });

    const durationMs = Math.round(performance.now() - start);
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image generated");

    const outputPath = path.join(OUTPUT_DIR, "openai-result.png");
    fs.writeFileSync(outputPath, Buffer.from(b64, "base64"));

    console.log(`Done in ${(durationMs / 1000).toFixed(1)}s → ${outputPath}`);
    return { model: "gpt-image-1.5", durationMs, outputPath, swatchCount: swatches.length };
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    return { model: "gpt-image-1.5", durationMs, outputPath: "", swatchCount: swatches.length, error: String(err) };
  }
}

// ---------------------------------------------------------------------------
// FLUX.2 Flex Edit via fal.ai
// ---------------------------------------------------------------------------

async function runFlux2(
  imageBuffer: Buffer,
  swatches: SwatchInfo[],
  prompt: string,
): Promise<TestResult> {
  if (!FAL_KEY) return { model: "flux2-flex-edit", durationMs: 0, outputPath: "", swatchCount: swatches.length, error: "No FAL_KEY in .env.local" };

  // Use the queue API directly (the JS client's subscribe has timeout issues).
  const FAL_QUEUE_BASE = "https://queue.fal.run";
  const authHeader = { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" };

  // Upload images to fal.ai storage first (data URIs in the request body
  // can exceed payload limits). Use fal's upload endpoint for buffers.
  const { fal } = await import("@fal-ai/client");
  fal.config({ credentials: FAL_KEY! });

  console.log(`\n--- FLUX.2 Flex Edit (fal.ai) ---`);
  console.log(`Uploading ${1 + swatches.length} images to fal.ai storage...`);

  // Upload room photo
  const roomBlob = new Blob([imageBuffer], { type: "image/png" });
  const roomUrl = await fal.storage.upload(new File([roomBlob], "room.png", { type: "image/png" }));
  console.log(`  Room photo uploaded`);

  // Upload swatches — convert non-standard formats (SVG, etc.) to PNG first
  const swatchUrls: string[] = [];
  const uploadedSwatches: SwatchInfo[] = [];
  for (const s of swatches) {
    let buffer = s.buffer;
    let mime = s.mediaType;

    // Convert SVG and other non-raster formats to PNG
    if (mime.includes("svg") || mime === "image/svg+xml" || !["image/png", "image/jpeg", "image/webp"].includes(mime)) {
      try {
        buffer = await sharp(buffer).png().toBuffer();
        mime = "image/png";
      } catch (e) {
        console.log(`  Skipping swatch "${s.label}" — conversion failed`);
        continue;
      }
    }

    // Skip very small images that are likely corrupt
    if (buffer.length < 1000) {
      console.log(`  Skipping swatch "${s.label}" — too small (${buffer.length} bytes)`);
      continue;
    }

    const ext = mime.split("/")[1] || "png";
    const blob = new Blob([buffer], { type: mime });
    const url = await fal.storage.upload(new File([blob], `swatch.${ext}`, { type: mime }));
    swatchUrls.push(url);
    uploadedSwatches.push(s);
  }
  console.log(`  ${swatchUrls.length} swatches uploaded (${swatches.length - swatchUrls.length} skipped)`);

  const imageUrls = [roomUrl, ...swatchUrls];

  // Build prompt using only the swatches that were actually uploaded
  const fluxListLines = uploadedSwatches.map((s) => {
    const anchorSuffix = s.anchorHex ? ` (target color ${s.anchorHex})` : "";
    return `- ${s.label}${anchorSuffix}`;
  });

  const fluxPrompt = `The first image is a room photo. The remaining ${uploadedSwatches.length} images are material/color swatches. Edit the room photo to apply each swatch to its corresponding surface:

${fluxListLines.join("\n")}

Match each swatch's color, pattern, and texture EXACTLY on the specified surface. Keep the exact camera angle, perspective, lighting, and room layout. Do NOT add, remove, or move any object. Photorealistic result with accurate shadows and reflections.`;

  console.log(`Submitting to queue with ${imageUrls.length} image URLs...`);

  const start = performance.now();
  try {
    // Submit to queue
    const submitRes = await fetch(`${FAL_QUEUE_BASE}/fal-ai/flux-2-flex/edit`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({
        prompt: fluxPrompt,
        image_urls: imageUrls,
        image_size: { width: 1536, height: 1024 },
        output_format: "png",
        guidance_scale: 3.5,
        num_inference_steps: 28,
      }),
    });

    if (!submitRes.ok) {
      const body = await submitRes.text();
      throw new Error(`Queue submit failed (${submitRes.status}): ${body}`);
    }

    const queueData = await submitRes.json() as any;
    const requestId = queueData.request_id;
    console.log(`  Queued: ${requestId}`);

    // Poll for completion
    let status = "IN_QUEUE";
    while (status !== "COMPLETED") {
      await new Promise((r) => setTimeout(r, 1000));
      const statusRes = await fetch(queueData.status_url, { headers: authHeader });
      const statusData = await statusRes.json() as any;
      status = statusData.status;

      if (status === "FAILED") {
        throw new Error(`Generation failed: ${JSON.stringify(statusData)}`);
      }

      const elapsed = ((performance.now() - start) / 1000).toFixed(1);
      if (status !== "COMPLETED") {
        process.stdout.write(`\r  Status: ${status} (${elapsed}s)`);
      }
    }

    // Fetch result
    const resultRes = await fetch(queueData.response_url, { headers: authHeader });
    const resultData = await resultRes.json() as any;
    const durationMs = Math.round(performance.now() - start);

    const imageUrl = resultData?.images?.[0]?.url;
    if (!imageUrl) {
      console.log("\nFull response:", JSON.stringify(resultData, null, 2).slice(0, 500));
      throw new Error("No image in response");
    }

    // Download the result
    const res = await fetch(imageUrl);
    const outputBuffer = Buffer.from(await res.arrayBuffer());
    const outputPath = path.join(OUTPUT_DIR, "flux2-result.png");
    fs.writeFileSync(outputPath, outputBuffer);

    const inferenceTime = resultData?.metrics?.inference_time
      ? `(inference: ${(resultData.metrics.inference_time / 1000).toFixed(1)}s)`
      : "";
    console.log(`\n  Done in ${(durationMs / 1000).toFixed(1)}s ${inferenceTime} → ${outputPath}`);
    return { model: "flux2-flex-edit", durationMs, outputPath, swatchCount: swatches.length };
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    console.error("\nFLUX.2 error:", err);
    return { model: "flux2-flex-edit", durationMs, outputPath: "", swatchCount: swatches.length, error: String(err) };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const fluxOnly = args.includes("--flux-only");
  const openaiOnly = args.includes("--openai-only");
  const photoIdx = args.indexOf("--photo");
  const photoLabel = photoIdx !== -1 ? args[photoIdx + 1] : undefined;
  const orgIdx = args.indexOf("--org");
  const orgSlug = orgIdx !== -1 ? args[orgIdx + 1] : DEFAULT_ORG_SLUG;

  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("Loading test data from Supabase...\n");
  const data = await loadTestData(orgSlug, photoLabel);

  console.log(`Org: ${data.org.name} (${data.org.slug})`);
  console.log(`Photo: ${data.photo.label}`);
  console.log(`Swatches: ${data.swatches.length}`);
  console.log(`Prompt lines: ${data.listLines.length}`);

  // Save the prompt and hero image for reference
  fs.writeFileSync(path.join(OUTPUT_DIR, "prompt.txt"), data.prompt);
  fs.writeFileSync(path.join(OUTPUT_DIR, "hero-original.png"), data.imageBuffer);

  // Save individual swatches for reference
  for (let i = 0; i < data.swatches.length; i++) {
    const s = data.swatches[i];
    const ext = s.mediaType.split("/")[1] || "png";
    fs.writeFileSync(
      path.join(OUTPUT_DIR, `swatch-${i + 1}-${s.label.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40)}.${ext}`),
      s.buffer,
    );
  }

  console.log(`\nSaved hero image + ${data.swatches.length} swatches to ${OUTPUT_DIR}/`);

  const results: TestResult[] = [];

  // Run tests
  if (!fluxOnly) {
    results.push(await runOpenAI(data.imageBuffer, data.heroMime, data.swatches, data.prompt));
  }

  if (!openaiOnly) {
    results.push(await runFlux2(data.imageBuffer, data.swatches, data.prompt));
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("RESULTS COMPARISON");
  console.log("=".repeat(60));

  for (const r of results) {
    const status = r.error ? `ERROR: ${r.error}` : `${(r.durationMs / 1000).toFixed(1)}s`;
    console.log(`  ${r.model.padEnd(20)} ${status.padEnd(30)} (${r.swatchCount} swatches)`);
  }

  if (results.length === 2 && !results[0].error && !results[1].error) {
    const speedup = (results[0].durationMs / results[1].durationMs).toFixed(1);
    console.log(`\n  Speed difference: FLUX.2 is ${speedup}x faster`);
  }

  console.log(`\n  Output: ${OUTPUT_DIR}/`);
  console.log(`  Compare: open ${OUTPUT_DIR}/openai-result.png and ${OUTPUT_DIR}/flux2-result.png side by side`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
