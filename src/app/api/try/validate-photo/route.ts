import { NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { captureAiEvent, captureAiError, estimateGeminiCost } from "@/lib/posthog-server";
import { VISION_MODEL } from "@/lib/models";

export async function POST(request: Request) {
  try {
    const { imageBase64 } = await request.json();

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return NextResponse.json(
        { accepted: false, reason: "No image provided." },
        { status: 400 }
      );
    }

    const start = performance.now();
    const { object, usage } = await generateObject({
      model: google(VISION_MODEL),
      schema: z.object({
        isKitchen: z.boolean().describe("True if the image shows a kitchen with visible counters, cabinets, or backsplash"),
        hasAdequateLighting: z.boolean().describe("True if the image has reasonable lighting (not extremely dark or blown out)"),
        isReasonablyClear: z.boolean().describe("True if the image is reasonably clear and not heavily blurred"),
        kitchenType: z.enum([
          "single-wall",
          "galley",
          "l-shape",
          "u-shape",
          "island",
          "peninsula",
          "open-concept",
          "other",
        ]).describe("Primary kitchen layout archetype if this is a kitchen."),
        cameraAngle: z.enum([
          "straight-on",
          "angled",
          "wide",
          "close-up",
          "other",
        ]).describe("Camera framing style for this kitchen photo."),
        sceneDescription: z.string().describe(
          "If this is a kitchen, write a 1-2 sentence description of the STRUCTURE and LAYOUT only. " +
          "Do NOT mention colors, materials, or finishes (no 'white cabinets', 'granite countertops', 'subway tile'). " +
          "Mention: camera angle, whether there is an island, where cabinets are (perimeter/wall, island, both), where countertops are, " +
          "where the backsplash is, appliance positions, and lighting. " +
          "Example: 'Straight-on view of a kitchen. Island in the foreground, wall cabinets (upper and lower) along the back wall, " +
          "countertops along the back wall and on the island, backsplash visible between upper and lower cabinets. Range hood centered.' " +
          "If not a kitchen, return an empty string."
        ),
        hasIsland: z.boolean().describe("True if the kitchen has a visible island or peninsula"),
        backsplashLocation: z.string().describe(
          "Where the backsplash is in the photo. Describe POSITION only, no colors or materials. " +
          "Example: 'wall strip between upper and lower cabinets along the back wall, plus the taller section behind the range hood'. Empty string if not visible."
        ),
        countertopLocation: z.string().describe(
          "Where countertops are in the photo. Describe POSITION only, no colors or materials. " +
          "Example: 'horizontal slab on top of the island and along the back wall perimeter cabinets'. Empty string if not visible."
        ),
        cabinetLocation: z.string().describe(
          "Where ALL perimeter/wall cabinets are in the photo — include every zone. Describe POSITION only, no colors or materials. " +
          "Example: 'upper and lower cabinets along the back wall, plus cabinets flanking the refrigerator on the right side and wrapping to the left wall'. Empty string if not a kitchen."
        ),
        backsplashVisible: z.boolean().describe("True when a backsplash surface is visibly present and editable in the photo."),
        countertopVisible: z.boolean().describe("True when countertops are visibly present and editable in the photo."),
        cabinetsVisible: z.boolean().describe("True when perimeter/wall cabinet faces are visibly present and editable in the photo."),
        islandCabinetsVisible: z.boolean().describe("True when island base cabinet faces are visibly present and editable in the photo. False if there is no island or the island cabinets are not visible."),
        islandCabinetLocation: z.string().describe(
          "Where the island cabinet face is in the photo. Describe POSITION only, no colors or materials. " +
          "Example: 'vertical front panel of the island base in the foreground, below the countertop overhang'. Empty string if no island."
        ),
      }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: imageBase64,
            },
            {
              type: "text",
              text: "Analyze this kitchen photo. Check quality (is it a kitchen? adequate lighting? clear?), classify the kitchen layout type and camera angle, then describe the spatial layout in detail. Also explicitly flag whether backsplash, countertops, and cabinet faces are visibly editable.",
            },
          ],
        },
      ],
    });

    const duration_ms = Math.round(performance.now() - start);

    await captureAiEvent("anonymous", {
      provider: "google",
      model: VISION_MODEL,
      route: "/api/try/validate-photo",
      duration_ms,
      cost_usd: estimateGeminiCost(VISION_MODEL, usage),
      prompt_tokens: usage.inputTokens,
      completion_tokens: usage.outputTokens,
      total_tokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
    });

    const accepted = object.isKitchen && object.hasAdequateLighting && object.isReasonablyClear;

    let reason: string | undefined;
    if (!accepted) {
      if (!object.isKitchen) {
        reason = "We need a kitchen photo with visible counters, cabinets, or backsplash. Please try a different image.";
      } else if (!object.hasAdequateLighting) {
        reason = "The lighting is too dark or washed out. Try a photo with better natural or ambient lighting.";
      } else {
        reason = "The image is too blurry. Try a clearer, sharper photo.";
      }
    }

    return NextResponse.json({
      accepted,
      reason,
      // Scene analysis — only meaningful if accepted
      ...(accepted && {
        sceneDescription: object.sceneDescription,
        hasIsland: object.hasIsland,
        kitchenType: object.kitchenType,
        cameraAngle: object.cameraAngle,
        visibleSurfaces: {
          backsplash: object.backsplashVisible,
          countertop: object.countertopVisible,
          cabinets: object.cabinetsVisible,
          island: object.islandCabinetsVisible,
        },
        spatialHints: {
          backsplash: object.backsplashLocation,
          "counter-top": object.countertopLocation,
          "kitchen-cabinet-color": object.cabinetLocation,
          "kitchen-island-cabinet-color": object.islandCabinetLocation,
        },
      }),
    });
  } catch (error) {
    console.error("[validate-photo] Error:", error);
    await captureAiError("anonymous", {
      provider: "google",
      model: VISION_MODEL,
      route: "/api/try/validate-photo",
      duration_ms: 0,
      error,
    }).catch(() => {});
    return NextResponse.json(
      { accepted: false, reason: "Failed to validate photo. Please try again." },
      { status: 500 }
    );
  }
}
