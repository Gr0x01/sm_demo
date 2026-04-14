"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, RefreshCw, Sparkles, Star } from "lucide-react";
import type { AdminStep, AdminStepPhoto } from "@/types";
import type { PromptProse } from "@/lib/step-config";
import { sortSubcategoryIdsByVisualImpact } from "@/lib/visual-impact-sort";
import { RoomPhotoUpload } from "./RoomPhotoUpload";
import { PhotoQualityBadge } from "./PhotoQualityBadge";

async function apiCall(url: string, method: string, body: Record<string, unknown>) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

interface PhotoManagerProps {
  steps: (AdminStep & { step_photos: AdminStepPhoto[] })[];
  orgId: string;
  orgSlug: string;
  supabaseUrl: string;
  initialStepId?: string;
}

function getPublicUrl(supabaseUrl: string, imagePath: string) {
  return `${supabaseUrl}/storage/v1/object/public/rooms/${imagePath}`;
}

function toSubcategoryScopeText(ids: string[] | null | undefined): string {
  return (ids ?? []).join("\n");
}

function parseSubcategoryScopeText(value: string): string[] {
  const seen = new Set<string>();
  const parsed = value
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  return parsed;
}

function areStringArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function countImageTokens(text: string): number {
  return (text.match(/\{image\}/g) || []).length;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Mirrors the server-side validator in src/lib/generate.ts. Keep in sync.
const CLIENT_FORBIDDEN_NEGATIVE_WORDS = [
  "not", "no", "never", "without", "don't", "dont",
  "only", "avoid", "except", "island",
];
const CLIENT_FORBIDDEN_MATERIAL_WORDS = [
  "wood", "wooden", "oak", "walnut", "maple", "cherry", "pine", "birch",
  "marble", "granite", "quartz", "quartzite", "slate", "travertine", "limestone",
  "subway", "herringbone", "hexagon", "mosaic", "tile", "plank",
  "white", "black", "blue", "onyx", "beige", "taupe", "gray", "grey",
  "green", "red", "yellow", "brown", "cream", "ivory", "fog", "dove",
];
const CLIENT_HEX_RE = /#[0-9a-f]{3,8}\b/i;

function findForbidden(text: string, list: readonly string[]): string | null {
  const lower = text.toLowerCase();
  for (const word of list) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`, "i").test(lower)) return word;
  }
  return null;
}

// Plural-permissive variant for material/color words — mirrors
// findForbiddenMaterialWord in src/lib/generate.ts.
function findForbiddenMaterial(text: string, list: readonly string[]): string | null {
  const lower = text.toLowerCase();
  for (const word of list) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}s?\\b`, "i").test(lower)) return word;
  }
  return null;
}

interface ProseValidationError {
  field: string;
  message: string;
}

function validateProseClient(prose: PromptProse): ProseValidationError[] {
  const errors: ProseValidationError[] = [];

  for (const [subId, clause] of Object.entries(prose.actions ?? {})) {
    const field = `actions.${subId}`;
    // Per-material object clauses (`{paint, stain}`) are authored via SQL
    // and validated server-side. Skip client-side string validation for the
    // object form; the server's `validatePromptProse` catches structural
    // issues at save time.
    if (typeof clause !== "string") continue;
    const trimmed = clause.trim();
    if (trimmed.length === 0) {
      errors.push({ field, message: "Action clause is empty." });
      continue;
    }
    const n = countImageTokens(clause);
    if (n !== 1) {
      errors.push({ field, message: `Exactly one {image} required (found ${n}).` });
    }
    const wc = wordCount(trimmed);
    if (wc < 4 || wc > 18) {
      errors.push({ field, message: `4–18 words (got ${wc}).` });
    }
    if (/^[A-Z]/.test(trimmed)) {
      errors.push({ field, message: "Must start lowercase." });
    }
    if (trimmed.endsWith(".")) {
      errors.push({ field, message: "Must not end with a period." });
    }
    const scan = trimmed.replace(/\{image\}/g, "");
    const neg = findForbidden(scan, CLIENT_FORBIDDEN_NEGATIVE_WORDS);
    if (neg) errors.push({ field, message: `Forbidden word "${neg}" (no negatives; describe island positionally).` });
    const mat = findForbiddenMaterial(scan, CLIENT_FORBIDDEN_MATERIAL_WORDS);
    if (mat) errors.push({ field, message: `Forbidden material/color word "${mat}" (swatch is sole authority).` });
    if (CLIENT_HEX_RE.test(scan)) {
      errors.push({ field, message: "Hex color code not allowed (swatch is sole authority)." });
    }
  }

  if (prose.lead !== undefined && prose.lead.trim().length > 0) {
    const wc = wordCount(prose.lead);
    if (wc > 12) errors.push({ field: "lead", message: `Lead must be ≤12 words (got ${wc}).` });
    const neg = findForbidden(prose.lead, CLIENT_FORBIDDEN_NEGATIVE_WORDS);
    if (neg) errors.push({ field: "lead", message: `Forbidden word "${neg}".` });
    if (prose.lead.includes("{image}")) errors.push({ field: "lead", message: "Lead must not contain {image}." });
  }

  if (prose.style !== undefined && prose.style.trim().length > 0) {
    const wc = wordCount(prose.style);
    if (wc > 20) errors.push({ field: "style", message: `Style must be ≤20 words (got ${wc}).` });
    const neg = findForbidden(prose.style, CLIENT_FORBIDDEN_NEGATIVE_WORDS);
    if (neg) errors.push({ field: "style", message: `Forbidden word "${neg}".` });
    if (prose.style.includes("{image}")) errors.push({ field: "style", message: "Style must not contain {image}." });
  }

  if (prose.preserve) {
    for (let i = 0; i < prose.preserve.length; i++) {
      const clause = prose.preserve[i];
      const field = `preserve.${i}`;
      if (clause.trim().length === 0) continue;
      const wc = wordCount(clause);
      if (wc > 18) errors.push({ field, message: `≤18 words (got ${wc}).` });
      const neg = findForbidden(clause, CLIENT_FORBIDDEN_NEGATIVE_WORDS);
      if (neg) errors.push({ field, message: `Forbidden word "${neg}".` });
      if (clause.includes("{image}")) errors.push({ field, message: "Must not contain {image}." });
    }
  }

  if (prose.mergedClauses) {
    const seenSubsAcrossEntries = new Set<string>();
    for (let i = 0; i < prose.mergedClauses.length; i++) {
      const entry = prose.mergedClauses[i];
      const whenField = `mergedClauses.${i}.when`;
      const clauseField = `mergedClauses.${i}.clause`;
      if (!Array.isArray(entry.when) || entry.when.length < 2) {
        errors.push({ field: whenField, message: "Need ≥2 subcategories to merge." });
      } else {
        const seenInThisEntry = new Set<string>();
        for (const subId of entry.when) {
          if (!prose.actions?.[subId]) {
            errors.push({ field: whenField, message: `"${subId}" has no fallback in actions.` });
          }
          if (seenInThisEntry.has(subId)) {
            errors.push({ field: whenField, message: `"${subId}" appears twice in this entry.` });
          } else if (seenSubsAcrossEntries.has(subId)) {
            errors.push({ field: whenField, message: `"${subId}" already in another merge.` });
          }
          seenInThisEntry.add(subId);
          seenSubsAcrossEntries.add(subId);
        }
      }
      const clause = (entry.clause ?? "").trim();
      if (clause.length === 0) {
        errors.push({ field: clauseField, message: "Clause is empty." });
      } else {
        const n = countImageTokens(clause);
        if (n !== 1) errors.push({ field: clauseField, message: `Exactly one {image} required (found ${n}).` });
        const wc = wordCount(clause);
        if (wc < 4 || wc > 18) errors.push({ field: clauseField, message: `4–18 words (got ${wc}).` });
        if (/^[A-Z]/.test(clause)) errors.push({ field: clauseField, message: "Must start lowercase." });
        if (clause.endsWith(".")) errors.push({ field: clauseField, message: "Must not end with a period." });
        const scan = clause.replace(/\{image\}/g, "");
        const neg = findForbidden(scan, CLIENT_FORBIDDEN_NEGATIVE_WORDS);
        if (neg) errors.push({ field: clauseField, message: `Forbidden word "${neg}".` });
        const mat = findForbiddenMaterial(scan, CLIENT_FORBIDDEN_MATERIAL_WORDS);
        if (mat) errors.push({ field: clauseField, message: `Forbidden material word "${mat}".` });
        if (CLIENT_HEX_RE.test(scan)) errors.push({ field: clauseField, message: "Hex code not allowed." });
      }
    }
  }

  return errors;
}

const EMPTY_PROSE: PromptProse = {
  version: 2,
  actions: {},
};

function PhotoCard({
  photo,
  orgId,
  supabaseUrl,
  onUpdate,
  onDelete,
}: {
  photo: AdminStepPhoto;
  orgId: string;
  supabaseUrl: string;
  onUpdate: (updated: AdminStepPhoto) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(photo.label);
  const [spatialHint, setSpatialHint] = useState(photo.spatial_hint || "");
  const [photoBaseline, setPhotoBaseline] = useState(photo.photo_baseline || "");
  const [subcategoryScope, setSubcategoryScope] = useState(toSubcategoryScopeText(photo.subcategory_ids));
  const [checking, setChecking] = useState(false);
  const [generatingHint, setGeneratingHint] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [togglingHero, setTogglingHero] = useState(false);
  const [prose, setProse] = useState<PromptProse>(photo.prompt_prose ?? EMPTY_PROSE);
  const [proseOpen, setProseOpen] = useState(!!photo.prompt_prose);
  const [proseSaving, setProseSaving] = useState(false);
  const [proseErrors, setProseErrors] = useState<ProseValidationError[]>([]);

  const saveField = useCallback(async (field: string, value: unknown) => {
    setSavingField(field);
    try {
      const data = await apiCall(`/api/admin/step-photos/${photo.id}`, "PATCH", {
        org_id: orgId,
        [field]: value,
      });
      onUpdate(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingField(null);
    }
  }, [photo.id, orgId, onUpdate]);

  const handleCheck = useCallback(async () => {
    setChecking(true);
    try {
      const result = await apiCall("/api/admin/photo-check", "POST", {
        org_id: orgId,
        step_photo_id: photo.id,
      });
      onUpdate({ ...photo, check_result: result.check_result, check_feedback: result.check_feedback, checked_at: new Date().toISOString() });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Check failed");
    } finally {
      setChecking(false);
    }
  }, [orgId, photo, onUpdate]);

  const handleGenerateHint = useCallback(async () => {
    setGeneratingHint(true);
    try {
      const result = await apiCall("/api/admin/spatial-hint", "POST", {
        org_id: orgId,
        step_photo_id: photo.id,
      });
      setSpatialHint(result.spatial_hint);
      // Auto-save generated hint so it isn't lost on navigation
      const saved = await apiCall(`/api/admin/step-photos/${photo.id}`, "PATCH", {
        org_id: orgId,
        spatial_hint: result.spatial_hint,
      });
      onUpdate(saved);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGeneratingHint(false);
    }
  }, [orgId, photo.id, onUpdate]);

  const handleToggleHero = useCallback(async () => {
    setTogglingHero(true);
    try {
      const data = await apiCall(`/api/admin/step-photos/${photo.id}`, "PATCH", {
        org_id: orgId,
        is_hero: !photo.is_hero,
      });
      onUpdate(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to toggle");
    } finally {
      setTogglingHero(false);
    }
  }, [photo.id, photo.is_hero, orgId, onUpdate]);

  const scopedIds = useMemo(() => {
    const parsed = parseSubcategoryScopeText(subcategoryScope);
    return sortSubcategoryIdsByVisualImpact(parsed);
  }, [subcategoryScope]);

  const setProseField = useCallback(<K extends keyof PromptProse>(field: K, value: PromptProse[K]) => {
    setProse((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setActionLine = useCallback((subId: string, value: string) => {
    setProse((prev) => ({
      ...prev,
      actions: { ...(prev.actions ?? {}), [subId]: value },
    }));
  }, []);

  const setPreserveLine = useCallback((idx: number, value: string) => {
    setProse((prev) => {
      const next = [...(prev.preserve ?? [])];
      next[idx] = value;
      return { ...prev, preserve: next };
    });
  }, []);

  const addPreserveLine = useCallback(() => {
    setProse((prev) => ({ ...prev, preserve: [...(prev.preserve ?? []), ""] }));
  }, []);

  const removePreserveLine = useCallback((idx: number) => {
    setProse((prev) => {
      const next = [...(prev.preserve ?? [])];
      next.splice(idx, 1);
      return { ...prev, preserve: next.length > 0 ? next : undefined };
    });
  }, []);

  const addMergedClause = useCallback(() => {
    setProse((prev) => ({
      ...prev,
      mergedClauses: [...(prev.mergedClauses ?? []), { when: [], clause: "" }],
    }));
  }, []);

  const removeMergedClause = useCallback((idx: number) => {
    setProse((prev) => {
      const next = [...(prev.mergedClauses ?? [])];
      next.splice(idx, 1);
      return { ...prev, mergedClauses: next.length > 0 ? next : undefined };
    });
  }, []);

  const setMergedClauseClause = useCallback((idx: number, value: string) => {
    setProse((prev) => {
      const next = [...(prev.mergedClauses ?? [])];
      // Defensive: bail if idx is out of range (e.g. after a concurrent remove).
      if (!next[idx]) return prev;
      next[idx] = { ...next[idx], clause: value };
      return { ...prev, mergedClauses: next };
    });
  }, []);

  const toggleMergedClauseWhen = useCallback((idx: number, subId: string) => {
    setProse((prev) => {
      const next = [...(prev.mergedClauses ?? [])];
      if (!next[idx]) return prev;
      const current = next[idx].when ?? [];
      const exists = current.includes(subId);
      next[idx] = {
        ...next[idx],
        when: exists ? current.filter((s) => s !== subId) : [...current, subId],
      };
      return { ...prev, mergedClauses: next };
    });
  }, []);

  const handleSaveProse = useCallback(async () => {
    const errors = validateProseClient(prose);
    setProseErrors(errors);
    if (errors.length > 0) return;

    setProseSaving(true);
    try {
      const data = await apiCall(`/api/admin/step-photos/${photo.id}`, "PATCH", {
        org_id: orgId,
        prompt_prose: prose,
      });
      onUpdate(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save prose");
    } finally {
      setProseSaving(false);
    }
  }, [photo.id, orgId, prose, onUpdate]);

  const handleClearProse = useCallback(async () => {
    if (!confirm("Clear prose and revert this photo to the legacy templated builder?")) return;
    setProseSaving(true);
    try {
      const data = await apiCall(`/api/admin/step-photos/${photo.id}`, "PATCH", {
        org_id: orgId,
        prompt_prose: null,
      });
      setProse(EMPTY_PROSE);
      setProseErrors([]);
      onUpdate(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to clear prose");
    } finally {
      setProseSaving(false);
    }
  }, [photo.id, orgId, onUpdate]);

  const renderProseLinePreview = (template: string, previewIndex: number): string => {
    return template.replace(/\{image\}/g, `image ${previewIndex}`);
  };

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this photo?")) return;
    setDeleting(true);
    try {
      await apiCall(`/api/admin/step-photos/${photo.id}`, "DELETE", { org_id: orgId });
      onDelete();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }, [photo.id, orgId, onDelete]);

  const publicUrl = getPublicUrl(supabaseUrl, photo.image_path);

  return (
    <div className="bg-slate-50 border border-slate-200 p-4 space-y-3">
      {/* Top row: thumbnail + metadata */}
      <div className="flex gap-4">
        <img
          src={publicUrl}
          alt={photo.label || "Room photo"}
          className="w-32 h-24 object-cover border border-slate-300 flex-shrink-0"
        />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <PhotoQualityBadge result={photo.check_result} feedback={photo.check_feedback} />
            <button
              onClick={handleCheck}
              disabled={checking}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              {checking ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              {photo.check_result ? "Re-check" : "Check"}
            </button>
          </div>

          {photo.check_feedback && (
            <p className="text-xs text-slate-600">{photo.check_feedback}</p>
          )}

          {/* Label */}
          <div className="flex items-center gap-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={() => {
                if (label !== photo.label) saveField("label", label);
              }}
              className="bg-white border border-slate-300 px-2 py-1 text-xs text-slate-900 flex-1"
              placeholder="Photo label"
            />
          </div>

          {/* Hero toggle + delete */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleHero}
              disabled={togglingHero}
              className={`text-xs flex items-center gap-1 px-2 py-0.5 border transition-colors ${
                photo.is_hero
                  ? "border-amber-200 text-amber-700 bg-amber-50"
                  : "border-slate-300 text-slate-500 hover:text-slate-700"
              }`}
            >
              {togglingHero ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
              Primary photo
            </button>

            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-slate-600 hover:text-red-600 flex items-center gap-1 ml-auto"
            >
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Spatial hint */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <label className="text-xs text-slate-600">Spatial Hint</label>
          <button
            onClick={handleGenerateHint}
            disabled={generatingHint}
            className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
          >
            {generatingHint ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            Generate
          </button>
          {savingField === "spatial_hint" && <Loader2 className="w-3 h-3 animate-spin text-slate-500" />}
        </div>
        <textarea
          value={spatialHint}
          onChange={(e) => setSpatialHint(e.target.value)}
          onBlur={() => {
            if (spatialHint !== (photo.spatial_hint || "")) {
              saveField("spatial_hint", spatialHint || null);
            }
          }}
          className="w-full bg-white border border-slate-300 px-2 py-1 text-xs text-slate-900 resize-none"
          rows={2}
          placeholder="Spatial layout description for AI..."
        />
      </div>

      {/* Photo baseline */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <label className="text-xs text-slate-600">Photo Baseline</label>
          {savingField === "photo_baseline" && <Loader2 className="w-3 h-3 animate-spin text-slate-500" />}
        </div>
        <textarea
          value={photoBaseline}
          onChange={(e) => setPhotoBaseline(e.target.value)}
          onBlur={() => {
            if (photoBaseline !== (photo.photo_baseline || "")) {
              saveField("photo_baseline", photoBaseline || null);
            }
          }}
          className="w-full bg-white border border-slate-300 px-2 py-1 text-xs text-slate-900 resize-none"
          rows={2}
          placeholder="Baseline description of what's in the photo..."
        />
      </div>

      {/* Per-photo scope */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <label className="text-xs text-slate-600">Scoped Subcategory IDs</label>
          {savingField === "subcategory_ids" && <Loader2 className="w-3 h-3 animate-spin text-slate-500" />}
        </div>
        <textarea
          value={subcategoryScope}
          onChange={(e) => setSubcategoryScope(e.target.value)}
          onBlur={() => {
            const parsed = parseSubcategoryScopeText(subcategoryScope);
            const current = photo.subcategory_ids ?? [];
            if (!areStringArraysEqual(parsed, current)) {
              saveField("subcategory_ids", parsed.length > 0 ? parsed : null);
            }
          }}
          className="w-full bg-white border border-slate-300 px-2 py-1 text-xs font-mono text-slate-900 resize-y"
          rows={4}
          placeholder={"one-subcategory-id-per-line\n(or comma-separated)"}
        />
        <p className="text-[11px] text-slate-500 mt-1">
          If set, this is the full generation scope for this photo.
        </p>
      </div>

      {/* Prompt prose (BFL Foundation First) */}
      <div className="border-t border-slate-200 pt-3">
        <button
          type="button"
          onClick={() => setProseOpen((v) => !v)}
          className="text-xs text-slate-700 hover:text-slate-900 font-medium flex items-center gap-2"
        >
          <span>{proseOpen ? "▾" : "▸"}</span>
          <span>Prompt Prose</span>
          {photo.prompt_prose && (
            <span className="text-[10px] uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 px-1">
              active
            </span>
          )}
        </button>

        {proseOpen && (
          <div className="mt-3 space-y-3">
            <p className="text-[10px] text-slate-500 italic">
              Per BFL&apos;s editing guide: describe what changes, not the scene. The base photo carries the scene. Author one imperative clause per selected surface (4–18 words, lowercase start, no trailing period, exactly one <code className="bg-slate-200 px-0.5">{"{image}"}</code> token). Describe the surface, not the swatch — swatch is sole authority for material/color.
            </p>

            {/* Actions per subcategory */}
            {scopedIds.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                Add subcategory IDs to the scope field above to author action lines.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="text-[11px] text-slate-600 font-medium">
                  Actions — one clause per in-scope subcategory
                </div>
                {scopedIds.map((subId, idx) => {
                  const previewIndex = idx + 2;
                  const rawAction = prose.actions?.[subId];
                  // Per-material object clauses can't be edited in the
                  // textarea UI — show them read-only until the admin gets
                  // proper per-material pickers. Authored via SQL for now.
                  const isObjectForm = rawAction !== undefined && typeof rawAction !== "string";
                  const actionValue = typeof rawAction === "string" ? rawAction : "";
                  const actionError = proseErrors.find((e) => e.field === `actions.${subId}`);
                  return (
                    <div key={subId} className="bg-white border border-slate-200 p-2 space-y-1">
                      <div className="text-[11px] text-slate-700 font-mono">{subId}</div>
                      {isObjectForm ? (
                        <>
                          <div className="text-[11px] text-slate-500 italic p-2 bg-slate-50 border border-slate-200">
                            Per-material object clause — authored via SQL. Edit in DB.
                          </div>
                          {rawAction && typeof rawAction === "object" && (
                            <pre className="text-[10px] text-slate-600 bg-slate-50 p-2 overflow-x-auto">
                              {JSON.stringify(rawAction, null, 2)}
                            </pre>
                          )}
                        </>
                      ) : (
                        <>
                          <textarea
                            value={actionValue}
                            onChange={(e) => setActionLine(subId, e.target.value)}
                            className={`w-full bg-white border px-2 py-1 text-xs text-slate-900 resize-y ${
                              actionError ? "border-red-400" : "border-slate-300"
                            }`}
                            rows={2}
                            placeholder={`apply {image} to [surface description]`}
                          />
                          {actionValue && (
                            <p className="text-[10px] text-slate-500 italic">
                              → - {renderProseLinePreview(actionValue, previewIndex)}
                            </p>
                          )}
                          {actionError && (
                            <p className="text-[10px] text-red-600">{actionError.message}</p>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Lead + Style overrides */}
            <div className="space-y-2">
              <div>
                <label className="text-[11px] text-slate-600 block mb-1">
                  Lead (optional, ≤12 words)
                </label>
                <input
                  value={prose.lead ?? ""}
                  onChange={(e) => setProseField("lead", e.target.value || undefined)}
                  className={`w-full bg-white border px-2 py-1 text-xs text-slate-900 ${
                    proseErrors.some((e) => e.field === "lead") ? "border-red-400" : "border-slate-300"
                  }`}
                  placeholder="Apply the following finishes to this kitchen photo:"
                />
                {proseErrors.filter((e) => e.field === "lead").map((e, i) => (
                  <p key={i} className="text-[10px] text-red-600 mt-0.5">{e.message}</p>
                ))}
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block mb-1">
                  Style (optional, ≤20 words)
                </label>
                <input
                  value={prose.style ?? ""}
                  onChange={(e) => setProseField("style", e.target.value || undefined)}
                  className={`w-full bg-white border px-2 py-1 text-xs text-slate-900 ${
                    proseErrors.some((e) => e.field === "style") ? "border-red-400" : "border-slate-300"
                  }`}
                  placeholder="Shot on Canon 5D Mark IV. Soft diffused afternoon fill light, neutral interior photography."
                />
                {proseErrors.filter((e) => e.field === "style").map((e, i) => (
                  <p key={i} className="text-[10px] text-red-600 mt-0.5">{e.message}</p>
                ))}
              </div>
            </div>

            {/* Preserve (escape hatch — empty on day 1) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-slate-600">
                  Preserve (optional, escape hatch — leave empty unless Max is drifting)
                </label>
                <button
                  type="button"
                  onClick={addPreserveLine}
                  className="text-[10px] text-slate-500 hover:text-slate-900"
                >
                  + Add line
                </button>
              </div>
              {(prose.preserve ?? []).length === 0 ? (
                <p className="text-[10px] text-slate-400 italic">Empty — base image carries unselected surfaces.</p>
              ) : (
                <div className="space-y-1">
                  {(prose.preserve ?? []).map((clause, i) => {
                    const err = proseErrors.find((e) => e.field === `preserve.${i}`);
                    return (
                      <div key={i} className="flex items-center gap-1">
                        <input
                          value={clause}
                          onChange={(e) => setPreserveLine(i, e.target.value)}
                          className={`flex-1 bg-white border px-2 py-1 text-xs text-slate-900 ${
                            err ? "border-red-400" : "border-slate-300"
                          }`}
                          placeholder="Keep the pendant lights and ceiling medallions unchanged"
                        />
                        <button
                          type="button"
                          onClick={() => removePreserveLine(i)}
                          className="text-[10px] text-slate-500 hover:text-red-600 px-1"
                        >
                          ×
                        </button>
                        {err && <p className="text-[10px] text-red-600">{err.message}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Merged clauses (same-color merge) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-slate-600">
                  Merged clauses (fires when multiple subcategories resolve to the same swatch)
                </label>
                <button
                  type="button"
                  onClick={addMergedClause}
                  className="text-[10px] text-slate-500 hover:text-slate-900"
                >
                  + Add merge
                </button>
              </div>
              {(prose.mergedClauses ?? []).length === 0 ? (
                <p className="text-[10px] text-slate-400 italic">
                  Empty — add a merge declaration when two or more selected surfaces should collapse into one clause when the buyer picks the same swatch for both.
                </p>
              ) : (
                <div className="space-y-2">
                  {(prose.mergedClauses ?? []).map((entry, i) => {
                    const whenErr = proseErrors.find((e) => e.field === `mergedClauses.${i}.when`);
                    const clauseErr = proseErrors.find((e) => e.field === `mergedClauses.${i}.clause`);
                    return (
                      <div key={i} className="bg-white border border-slate-200 p-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wide text-slate-500">Merge #{i + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeMergedClause(i)}
                            className="text-[10px] text-slate-500 hover:text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">When (pick ≥2)</div>
                          <div className="flex flex-wrap gap-1">
                            {scopedIds.map((subId) => {
                              const active = entry.when.includes(subId);
                              return (
                                <button
                                  key={subId}
                                  type="button"
                                  onClick={() => toggleMergedClauseWhen(i, subId)}
                                  className={`text-[10px] font-mono px-1.5 py-0.5 border ${
                                    active
                                      ? "bg-slate-900 text-white border-slate-900"
                                      : "bg-white text-slate-700 border-slate-300 hover:border-slate-500"
                                  }`}
                                >
                                  {subId}
                                </button>
                              );
                            })}
                          </div>
                          {whenErr && <p className="text-[10px] text-red-600 mt-0.5">{whenErr.message}</p>}
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Unified clause</div>
                          <textarea
                            value={entry.clause}
                            onChange={(e) => setMergedClauseClause(i, e.target.value)}
                            className={`w-full bg-white border px-2 py-1 text-xs text-slate-900 resize-y ${
                              clauseErr ? "border-red-400" : "border-slate-300"
                            }`}
                            rows={2}
                            placeholder="apply {image} to [unified surface description]"
                          />
                          {entry.clause && (
                            <p className="text-[10px] text-slate-500 italic">
                              → - {renderProseLinePreview(entry.clause, 2)}
                            </p>
                          )}
                          {clauseErr && <p className="text-[10px] text-red-600">{clauseErr.message}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveProse}
                disabled={proseSaving}
                className="text-xs bg-slate-900 text-white px-3 py-1 hover:bg-slate-700 disabled:opacity-50 flex items-center gap-1"
              >
                {proseSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                Save prose
              </button>
              {photo.prompt_prose && (
                <button
                  type="button"
                  onClick={handleClearProse}
                  disabled={proseSaving}
                  className="text-xs text-slate-600 hover:text-red-600 px-2 py-1"
                >
                  Clear (revert to legacy)
                </button>
              )}
              <span className="text-[10px] text-slate-500 ml-auto">
                {"{image}"} → image N (visual-impact sort)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PhotoManager({ steps: initialSteps, orgId, orgSlug, supabaseUrl, initialStepId }: PhotoManagerProps) {
  void orgSlug;
  const router = useRouter();
  const [steps, setSteps] = useState(initialSteps);
  const [activeStepId, setActiveStepId] = useState(() => {
    if (initialStepId && initialSteps.some((s) => s.id === initialStepId)) return initialStepId;
    return initialSteps[0]?.id || "";
  });

  const activeStep = steps.find((s) => s.id === activeStepId);

  const handlePhotoUploaded = useCallback((stepId: string, photo: AdminStepPhoto) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId ? { ...s, step_photos: [...s.step_photos, photo] } : s
      )
    );
    // Auto-trigger quality check
    fetch("/api/admin/photo-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_id: orgId, step_photo_id: photo.id }),
    }).then(async (res) => {
      if (res.ok) {
        const result = await res.json();
        setSteps((prev) =>
          prev.map((s) =>
            s.id === stepId
              ? {
                  ...s,
                  step_photos: s.step_photos.map((p) =>
                    p.id === photo.id
                      ? { ...p, check_result: result.check_result, check_feedback: result.check_feedback, checked_at: new Date().toISOString() }
                      : p
                  ),
                }
              : s
          )
        );
      }
    }).catch(() => {}); // best-effort
  }, [orgId]);

  const handlePhotoUpdate = useCallback((stepId: string, updated: AdminStepPhoto) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? {
              ...s,
              step_photos: s.step_photos.map((p) => {
                if (p.id === updated.id) return updated;
                // If updated photo became hero, clear hero from others
                if (updated.is_hero && p.is_hero && p.id !== updated.id) {
                  return { ...p, is_hero: false };
                }
                return p;
              }),
            }
          : s
      )
    );
  }, []);

  const handlePhotoDelete = useCallback((stepId: string, photoId: string) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? { ...s, step_photos: s.step_photos.filter((p) => p.id !== photoId) }
          : s
      )
    );
    router.refresh();
  }, [router]);

  return (
    <div className="space-y-4">
      {/* Step tabs */}
      <div className="flex gap-1 flex-wrap">
        {steps.map((step) => (
          <button
            key={step.id}
            onClick={() => setActiveStepId(step.id)}
            className={`px-3 py-1.5 text-sm transition-colors ${
              activeStepId === step.id
                ? "bg-slate-900 text-white font-medium"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            {step.name}
            <span className="text-xs text-slate-500 ml-1">({step.step_photos.length})</span>
          </button>
        ))}
      </div>

      {/* Active step photos */}
      {activeStep && (
        <div className="space-y-4">
          {/* Upload */}
          <RoomPhotoUpload
            orgId={orgId}
            stepId={activeStep.id}
            onUploaded={(photo) => handlePhotoUploaded(activeStep.id, photo)}
          />

          {/* Photo list */}
          {activeStep.step_photos.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No photos yet. Upload one above.</p>
          ) : (
            <div className="space-y-3">
              {activeStep.step_photos.map((photo) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  orgId={orgId}
                  supabaseUrl={supabaseUrl}
                  onUpdate={(updated) => handlePhotoUpdate(activeStep.id, updated)}
                  onDelete={() => handlePhotoDelete(activeStep.id, photo.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {steps.length === 0 && (
        <p className="text-sm text-slate-500 py-8 text-center">
          No steps yet. Add steps to this floorplan first.
        </p>
      )}
    </div>
  );
}
