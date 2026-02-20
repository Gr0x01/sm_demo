"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, RefreshCw, Sparkles, Star } from "lucide-react";
import type { AdminStep, AdminStepPhoto } from "@/types";
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
  const [checking, setChecking] = useState(false);
  const [generatingHint, setGeneratingHint] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [togglingHero, setTogglingHero] = useState(false);

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
