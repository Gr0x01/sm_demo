import { NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { captureAiEvent, estimateGeminiCost } from "@/lib/posthog-server";
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
          "If this is a kitchen, write a 1-2 sentence factual description of the photo layout. Mention: camera angle (straight-on, angled, wide), " +
          "whether there is an island, where the cabinets are (perimeter/wall, island, both), where the countertops are visible, " +
          "where the backsplash is visible, and any other notable features. Be specific about spatial layout. " +
          "Example: 'Straight-on view of a kitchen. Island with dark wood cabinets in the foreground, white wall cabinets and countertops along the back wall, subway tile backsplash visible between upper and lower cabinets.' " +
          "If not a kitchen, return an empty string."
        ),
        hasIsland: z.boolean().describe("True if the kitchen has a visible island or peninsula"),
        backsplashLocation: z.string().describe(
          "Where the backsplash is visible in the photo. Example: 'between upper cabinets and countertop on the back wall' or 'on the wall behind the range and sink'. Empty string if not a kitchen or backsplash is not visible."
        ),
        countertopLocation: z.string().describe(
          "Where countertops are visible. Example: 'on the island and along the back wall' or 'along the L-shaped perimeter'. Empty string if not a kitchen."
        ),
        cabinetLocation: z.string().describe(
          "Where cabinets are visible. Example: 'wall cabinets on the back wall and island base cabinets in the foreground' or 'perimeter cabinets along two walls'. Empty string if not a kitchen."
        ),
        backsplashVisible: z.boolean().describe("True when a backsplash surface is visibly present and editable in the photo."),
        countertopVisible: z.boolean().describe("True when countertops are visibly present and editable in the photo."),
        cabinetsVisible: z.boolean().describe("True when perimeter/wall cabinet faces are visibly present and editable in the photo."),
        islandCabinetsVisible: z.boolean().describe("True when island base cabinet faces are visibly present and editable in the photo. False if there is no island or the island cabinets are not visible."),
        islandCabinetLocation: z.string().describe(
          "Where island cabinets are visible. Example: 'island base cabinets in the foreground' or 'large island with cabinet faces on the near side'. Empty string if no island or island cabinets are not visible."
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
          "island-cabinet-color": object.islandCabinetLocation,
        },
      }),
    });
  } catch (error) {
    console.error("[validate-photo] Error:", error);
    return NextResponse.json(
      { accepted: false, reason: "Failed to validate photo. Please try again." },
      { status: 500 }
    );
  }
}
