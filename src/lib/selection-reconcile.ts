import type { Option, SubCategory } from "@/types";
import { shouldForceSendFlooringSubcategory } from "@/lib/flooring-selection";

export function normalizeSelectionRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "string" && raw.trim().length > 0) out[key] = raw;
  }
  return out;
}

export function buildDefaultOptionBySubcategory(
  optionLookup: Map<string, { option: Option; subCategory: SubCategory }>,
): Map<string, string> {
  const explicit = new Map<string, string>();
  const firstFree = new Map<string, string>();

  for (const [key, found] of optionLookup.entries()) {
    const sep = key.indexOf(":");
    if (sep <= 0) continue;
    const subId = key.slice(0, sep);
    const optId = key.slice(sep + 1);
    if (!subId || !optId) continue;

    if (found.option.isDefault && !explicit.has(subId)) {
      explicit.set(subId, optId);
    }
    if (found.option.price === 0 && !firstFree.has(subId)) {
      firstFree.set(subId, optId);
    }
  }

  const out = new Map<string, string>();
  for (const [subId, optId] of firstFree.entries()) out.set(subId, optId);
  for (const [subId, optId] of explicit.entries()) out.set(subId, optId);
  return out;
}

/**
 * Strip selections still at their default/baseline value.
 * Mirrors client-side filterVisualSelections: only send changes the user actually made.
 * Keeps always_send hints and forced flooring subcategories.
 */
export function stripDefaultSelections(
  selections: Record<string, string>,
  defaultBySubcategory: Map<string, string>,
  optionLookup: Map<string, { option: Option; subCategory: SubCategory }>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [subId, optId] of Object.entries(selections)) {
    if (shouldForceSendFlooringSubcategory(subId)) {
      result[subId] = optId;
      continue;
    }
    // Look up the subcategory's generationHint from any entry in the lookup
    const entry = optionLookup.get(`${subId}:${optId}`);
    const hint = entry?.subCategory.generationHint;
    if (hint === "skip") continue;
    if (hint === "always_send") {
      result[subId] = optId;
      continue;
    }
    const baseline = defaultBySubcategory.get(subId);
    if (optId !== baseline) {
      result[subId] = optId;
    }
  }
  return result;
}

/**
 * Prefer non-default selections when client and server session disagree.
 * This guards against stale client payloads while still allowing fresh unsaved edits.
 */
export function reconcileClientAndSessionSelections(
  clientSelections: Record<string, string>,
  sessionSelections: Record<string, string>,
  defaultBySubcategory: Map<string, string>,
): Record<string, string> {
  const merged: Record<string, string> = {};
  const keys = new Set<string>([
    ...Object.keys(clientSelections),
    ...Object.keys(sessionSelections),
  ]);

  for (const subId of keys) {
    const client = clientSelections[subId];
    const session = sessionSelections[subId];
    if (!client) {
      if (session) merged[subId] = session;
      continue;
    }
    if (!session) {
      merged[subId] = client;
      continue;
    }
    if (client === session) {
      merged[subId] = client;
      continue;
    }

    const baseline = defaultBySubcategory.get(subId);
    if (!baseline) {
      merged[subId] = client;
      continue;
    }

    const clientIsBaseline = client === baseline;
    const sessionIsBaseline = session === baseline;
    if (clientIsBaseline && !sessionIsBaseline) {
      merged[subId] = session;
      continue;
    }
    if (sessionIsBaseline && !clientIsBaseline) {
      merged[subId] = client;
      continue;
    }

    // Ambiguous disagreement; keep client as latest interactive intent.
    merged[subId] = client;
  }

  return merged;
}
