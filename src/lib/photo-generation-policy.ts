import type { PromptPolicyOverrides } from "@/lib/generate";
import type { StepPhotoGenerationPolicyRecord } from "@/lib/db-queries";

type InputFidelity = "low" | "high";

export interface ResolvePhotoGenerationPolicyInput {
  orgSlug: string;
  floorplanSlug: string;
  stepSlug: string;
  stepPhotoId: string;
  imagePath: string;
  modelName: string;
  selections: Record<string, string>;
}

export interface ResolvedPhotoGenerationPolicy {
  policyKey: string;
  promptOverrides?: PromptPolicyOverrides;
  secondPass?: {
    reason: string;
    prompt: string;
    inputFidelity: InputFidelity;
  };
}

interface SecondPassPolicyConfig {
  reason: string;
  prompt: string;
  inputFidelity?: InputFidelity;
  models?: string[];
  whenSelected?: {
    subId: string;
    optionIds?: string[];
  };
}

const STONEMARTIN_KITCHEN_CLOSE_POLICY_KEY = "stonemartin:kinkade:kitchen-close:v1";
const STONEMARTIN_GREATROOM_WIDE_POLICY_KEY = "stonemartin:kinkade:greatroom-wide:v1";

const STONEMARTIN_KITCHEN_CLOSE_PROMPT_OVERRIDES: PromptPolicyOverrides = {
  invariantRulesWhenSelected: {
    refrigerator: [
      "Refrigerator opening is reserved for the refrigerator only. Place the selected refrigerator in that opening and do NOT fill that opening with cabinets, drawers, shelves, pantry units, or countertops.",
    ],
  },
  invariantRulesWhenNotSelected: {
    refrigerator: [
      "Refrigerator opening state must match the source photo exactly: if the opening/alcove is empty, keep it empty; if it contains a refrigerator, keep that refrigerator unchanged.",
      "Never convert the refrigerator opening into cabinetry, drawers, shelves, pantry units, countertops, or trim build-outs. The only permitted change inside an empty opening is wall paint/finish.",
    ],
  },
};

const STONEMARTIN_GREATROOM_WIDE_PROMPT_OVERRIDES: PromptPolicyOverrides = {
  invariantRulesAlways: [
    "Preserve room zoning exactly as the source photo: the main great-room/living floor area (especially the left/foreground open space) must stay open and uncluttered.",
    "Do NOT add any new kitchen structures in the great-room area: no new islands, perimeter cabinets, countertops, appliances, sinks, faucets, or backsplash walls.",
    "Kitchen edits are allowed ONLY on existing kitchen elements already visible in the source background kitchen zone. Do NOT expand the kitchen footprint into the living room.",
  ],
};

function matchesStoneMartinKitchenClose(input: ResolvePhotoGenerationPolicyInput): boolean {
  if (input.orgSlug !== "stonemartin") return false;
  if (input.floorplanSlug !== "kinkade") return false;
  if (input.stepSlug !== "design-your-kitchen") return false;
  return input.imagePath.endsWith("kitchen-close.webp");
}

function matchesStoneMartinGreatRoomWide(input: ResolvePhotoGenerationPolicyInput): boolean {
  if (input.orgSlug !== "stonemartin") return false;
  if (input.floorplanSlug !== "kinkade") return false;
  if (input.stepSlug !== "set-your-style") return false;
  return input.imagePath.endsWith("greatroom-wide.webp");
}

function shouldRunStoneMartinRangeSecondPass(input: ResolvePhotoGenerationPolicyInput): boolean {
  if (input.modelName !== "gpt-image-1.5") return false;
  const rangeOptionId = input.selections.range;
  if (!rangeOptionId) return false;
  return rangeOptionId === "range-ge-gas-slide-in" || rangeOptionId === "range-ge-gas-slide-in-convection";
}

export function resolvePhotoGenerationPolicy(
  input: ResolvePhotoGenerationPolicyInput,
  dbPolicy?: StepPhotoGenerationPolicyRecord | null,
): ResolvedPhotoGenerationPolicy {
  const dbResolved = resolveDbBackedPolicy(input, dbPolicy);
  if (dbResolved) return dbResolved;

  if (matchesStoneMartinKitchenClose(input)) {
    const secondPass = shouldRunStoneMartinRangeSecondPass(input)
      ? {
          reason: "stonemartin_kitchen_slide_in_range",
          inputFidelity: "low" as const,
          prompt:
            "Second pass: correct ONLY the cooking range geometry on the back wall. " +
            "The selected range is slide-in: NO raised backguard panel, backsplash tile must be visible directly behind the cooktop, " +
            "and there must be exactly one oven door below the cooktop. Keep all surrounding cabinetry, countertop seams, island, sink, faucet, floor, walls, and lighting unchanged.",
        }
      : undefined;

    return {
      policyKey: STONEMARTIN_KITCHEN_CLOSE_POLICY_KEY,
      promptOverrides: STONEMARTIN_KITCHEN_CLOSE_PROMPT_OVERRIDES,
      secondPass,
    };
  }

  if (matchesStoneMartinGreatRoomWide(input)) {
    return {
      policyKey: STONEMARTIN_GREATROOM_WIDE_POLICY_KEY,
      promptOverrides: STONEMARTIN_GREATROOM_WIDE_PROMPT_OVERRIDES,
    };
  }

  return { policyKey: "none" };
}

function resolveDbBackedPolicy(
  input: ResolvePhotoGenerationPolicyInput,
  dbPolicy?: StepPhotoGenerationPolicyRecord | null,
): ResolvedPhotoGenerationPolicy | null {
  if (!dbPolicy?.isActive) return null;

  const promptOverrides = parsePromptOverrides(dbPolicy.policyJson.promptOverrides);
  const secondPassConfig = parseSecondPassConfig(dbPolicy.policyJson.secondPass);
  const secondPass = secondPassConfig && shouldRunSecondPassConfig(input, secondPassConfig)
    ? {
        reason: secondPassConfig.reason,
        prompt: secondPassConfig.prompt,
        inputFidelity: secondPassConfig.inputFidelity ?? "low",
      }
    : undefined;

  return {
    policyKey: dbPolicy.policyKey || "db",
    promptOverrides,
    secondPass,
  };
}

function parsePromptOverrides(value: unknown): PromptPolicyOverrides | undefined {
  if (!value || typeof value !== "object") return undefined;
  const obj = value as Record<string, unknown>;
  const overrides: PromptPolicyOverrides = {};

  const always = toStringArray(obj.invariantRulesAlways);
  if (always) overrides.invariantRulesAlways = always;

  const whenSelected = toRuleMap(obj.invariantRulesWhenSelected);
  if (whenSelected) overrides.invariantRulesWhenSelected = whenSelected;

  const whenNotSelected = toRuleMap(obj.invariantRulesWhenNotSelected);
  if (whenNotSelected) overrides.invariantRulesWhenNotSelected = whenNotSelected;

  if (!overrides.invariantRulesAlways && !overrides.invariantRulesWhenSelected && !overrides.invariantRulesWhenNotSelected) {
    return undefined;
  }
  return overrides;
}

function parseSecondPassConfig(value: unknown): SecondPassPolicyConfig | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;

  const reason = typeof obj.reason === "string" ? obj.reason.trim() : "";
  const prompt = typeof obj.prompt === "string" ? obj.prompt.trim() : "";
  if (!reason || !prompt) return null;

  const inputFidelity = obj.inputFidelity === "high" ? "high" : obj.inputFidelity === "low" ? "low" : undefined;
  const models = toStringArray(obj.models);

  let whenSelected: SecondPassPolicyConfig["whenSelected"];
  if (obj.whenSelected && typeof obj.whenSelected === "object") {
    const ws = obj.whenSelected as Record<string, unknown>;
    if (typeof ws.subId === "string" && ws.subId.trim()) {
      whenSelected = {
        subId: ws.subId,
        optionIds: toStringArray(ws.optionIds),
      };
    }
  }

  return { reason, prompt, inputFidelity, models, whenSelected };
}

function shouldRunSecondPassConfig(
  input: ResolvePhotoGenerationPolicyInput,
  config: SecondPassPolicyConfig,
): boolean {
  if (config.models && config.models.length > 0 && !config.models.includes(input.modelName)) {
    return false;
  }
  if (!config.whenSelected) return true;

  const selectedOption = input.selections[config.whenSelected.subId];
  if (!selectedOption) return false;

  if (!config.whenSelected.optionIds || config.whenSelected.optionIds.length === 0) {
    return true;
  }
  return config.whenSelected.optionIds.includes(selectedOption);
}

function toStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return out.length > 0 ? out : undefined;
}

function toRuleMap(value: unknown): Record<string, string[]> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const out: Record<string, string[]> = {};
  for (const [key, rules] of Object.entries(raw)) {
    const parsed = toStringArray(rules);
    if (parsed && parsed.length > 0) out[key] = parsed;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
