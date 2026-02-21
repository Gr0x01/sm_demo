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

export function resolvePhotoGenerationPolicy(
  input: ResolvePhotoGenerationPolicyInput,
  dbPolicy?: StepPhotoGenerationPolicyRecord | null,
): ResolvedPhotoGenerationPolicy {
  return resolveDbBackedPolicy(input, dbPolicy) ?? { policyKey: "none" };
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
