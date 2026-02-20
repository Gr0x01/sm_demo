"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
  Camera,
} from "lucide-react";
import type { AdminStep } from "@/types";
import { MAX_STEPS_PER_FLOORPLAN } from "@/lib/step-limits";
import { StepSectionEditor } from "./StepSectionEditor";

interface FloorplanDetail {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  community: string | null;
  price_sheet_label: string | null;
  is_active: boolean;
}

interface SubcategoryOption {
  id: string;
  name: string;
  categoryName: string;
}

type StepWithMeta = AdminStep & { photo_count: number; preview_image_path: string | null };

interface FloorplanEditorProps {
  floorplan: FloorplanDetail;
  steps: StepWithMeta[];
  orgId: string;
  orgSlug: string;
  isAdmin: boolean;
  allSubcategories: SubcategoryOption[];
  supabaseUrl: string;
}

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

function getPublicUrl(supabaseUrl: string, imagePath: string) {
  return `${supabaseUrl}/storage/v1/object/public/rooms/${imagePath}`;
}

function SortableStep({
  step,
  displayNumber,
  orgId,
  orgSlug,
  floorplanId,
  isAdmin,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  allSubcategories,
  supabaseUrl,
}: {
  step: StepWithMeta;
  displayNumber: number;
  orgId: string;
  orgSlug: string;
  floorplanId: string;
  isAdmin: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updated: AdminStep) => void;
  onDelete: () => void;
  allSubcategories: SubcategoryOption[];
  supabaseUrl: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(step.name);
  const [subtitleValue, setSubtitleValue] = useState(step.subtitle || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showGenBtn, setShowGenBtn] = useState(step.show_generate_button);
  const [sceneDesc, setSceneDesc] = useState(step.scene_description || "");
  const [savingField, setSavingField] = useState<string | null>(null);
  const previewUrl = step.preview_image_path ? getPublicUrl(supabaseUrl, step.preview_image_path) : null;
  const photosHref = `/admin/${orgSlug}/floorplans/${floorplanId}/photos?step=${step.id}`;

  const saveField = useCallback(async (updates: Record<string, unknown>): Promise<boolean> => {
    setSavingField(Object.keys(updates)[0]);
    try {
      const data = await apiCall(`/api/admin/steps/${step.id}`, "PATCH", {
        org_id: orgId,
        ...updates,
      });
      onUpdate(data);
      return true;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save");
      return false;
    } finally {
      setSavingField(null);
    }
  }, [step.id, orgId, onUpdate]);

  const handleSaveName = useCallback(async () => {
    if (!nameValue.trim()) return;
    setSaving(true);
    try {
      const data = await apiCall(`/api/admin/steps/${step.id}`, "PATCH", {
        org_id: orgId,
        name: nameValue.trim(),
        subtitle: subtitleValue.trim() || null,
      });
      onUpdate(data);
      setEditingName(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [step.id, orgId, nameValue, subtitleValue, onUpdate]);

  const handleDelete = useCallback(async () => {
    if (!confirm(`Delete step "${step.name}"?`)) return;
    setDeleting(true);
    try {
      await apiCall(`/api/admin/steps/${step.id}`, "DELETE", { org_id: orgId });
      onDelete();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }, [step.id, step.name, orgId, onDelete]);

  return (
    <div ref={setNodeRef} style={style} className="bg-slate-50 border border-slate-200">
      <div className="px-4 py-3">
        <div className="flex items-start gap-2">
          {isAdmin && (
            <button {...attributes} {...listeners} className="text-slate-500 hover:text-slate-700 cursor-grab mt-0.5">
              <GripVertical className="w-4 h-4" />
            </button>
          )}

          <button onClick={onToggle} className="text-slate-500 hover:text-slate-900 mt-0.5">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500">#{displayNumber}</span>
              <span className="text-sm font-medium text-slate-900">{step.name}</span>
              {step.subtitle && <span className="text-xs text-slate-500">{step.subtitle}</span>}
            </div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <Link
                href={photosHref}
                className="text-xs text-slate-600 hover:text-slate-900 border border-slate-300 hover:border-slate-400 px-2 py-0.5 inline-flex items-center gap-1"
              >
                <Camera className="w-3.5 h-3.5" />
                Manage photos
              </Link>
              <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5">
                Photos: {step.photo_count}
              </span>
              <span className={`text-xs px-2 py-0.5 ${showGenBtn ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                {showGenBtn ? "AI enabled" : "AI hidden"}
              </span>
            </div>
          </div>

          <div className="w-16 h-12 border border-slate-300 bg-slate-100 overflow-hidden shrink-0">
            {previewUrl ? (
              <img src={previewUrl} alt={`${step.name} preview`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">No photo</div>
            )}
          </div>

          {isAdmin && !editingName && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => {
                  setEditingName(true);
                  setNameValue(step.name);
                  setSubtitleValue(step.subtitle || "");
                }}
                className="text-xs text-slate-600 hover:text-slate-900 border border-slate-300 hover:border-slate-400 px-2 py-1 inline-flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" />
                Rename
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-red-700 hover:text-red-800 border border-red-200 hover:border-red-300 px-2 py-1 inline-flex items-center gap-1 disabled:opacity-60"
              >
                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Delete step
              </button>
            </div>
          )}
        </div>

        {editingName && (
          <div className="mt-3 bg-white border border-slate-200 p-3 flex flex-wrap items-center gap-2">
            <input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="bg-white border border-slate-300 px-2 py-1 text-sm text-slate-900 flex-1 min-w-48"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") {
                  setEditingName(false);
                  setNameValue(step.name);
                }
              }}
            />
            <input
              value={subtitleValue}
              onChange={(e) => setSubtitleValue(e.target.value)}
              className="bg-white border border-slate-300 px-2 py-1 text-sm text-slate-900 min-w-40"
              placeholder="Subtitle"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") {
                  setEditingName(false);
                  setNameValue(step.name);
                }
              }}
            />
            <button
              onClick={handleSaveName}
              disabled={saving}
              className="text-xs text-emerald-700 hover:text-emerald-800 border border-emerald-200 hover:border-emerald-300 px-2 py-1 inline-flex items-center gap-1 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Save
            </button>
            <button
              onClick={() => {
                setEditingName(false);
                setNameValue(step.name);
              }}
              className="text-xs text-slate-600 hover:text-slate-900 border border-slate-300 hover:border-slate-400 px-2 py-1 inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="border-t border-slate-200 px-4 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-600">AI Generate Button</label>
            <button
              onClick={() => {
                const next = !showGenBtn;
                setShowGenBtn(next);
                saveField({ show_generate_button: next });
              }}
              disabled={savingField === "show_generate_button"}
              className={`w-8 h-5 flex items-center transition-colors ${showGenBtn ? "bg-emerald-600" : "bg-slate-400"}`}
            >
              <span className={`w-3.5 h-3.5 bg-white block transition-transform ${showGenBtn ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </div>

          <div>
            <label className="text-sm text-slate-600 block mb-1">Scene Description</label>
            <textarea
              value={sceneDesc}
              onChange={(e) => setSceneDesc(e.target.value)}
              onBlur={() => {
                if (sceneDesc !== (step.scene_description || "")) {
                  saveField({ scene_description: sceneDesc || null });
                }
              }}
              className="w-full bg-white border border-slate-300 px-3 py-2 text-sm text-slate-900 resize-none"
              rows={2}
              placeholder="Describe the scene for AI generation..."
            />
          </div>

          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">Sections</h4>
            <StepSectionEditor
              stepId={step.id}
              orgId={orgId}
              sections={step.sections}
              allSubcategories={allSubcategories}
              onSave={async (sections) => {
                const ok = await saveField({ sections });
                if (!ok) throw new Error("Save failed");
              }}
              saving={savingField === "sections"}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function FloorplanEditor({
  floorplan,
  steps: initialSteps,
  orgId,
  orgSlug,
  isAdmin,
  allSubcategories,
  supabaseUrl,
}: FloorplanEditorProps) {
  const router = useRouter();
  const [steps, setSteps] = useState(initialSteps);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [adding, setAdding] = useState(false);
  const [currentFloorplan, setCurrentFloorplan] = useState(floorplan);
  const [nameValue, setNameValue] = useState(floorplan.name);
  const [communityValue, setCommunityValue] = useState(floorplan.community || "");
  const [savingFloorplan, setSavingFloorplan] = useState(false);
  const [duplicatingFloorplan, setDuplicatingFloorplan] = useState(false);
  const [deletingFloorplan, setDeletingFloorplan] = useState(false);
  const atMaxSteps = steps.length >= MAX_STEPS_PER_FLOORPLAN;
  const hasFloorplanChanges =
    nameValue.trim() !== currentFloorplan.name ||
    communityValue.trim() !== (currentFloorplan.community || "");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveFloorplan = useCallback(async () => {
    if (!nameValue.trim()) return;
    setSavingFloorplan(true);
    try {
      const data = await apiCall(`/api/admin/floorplans/${currentFloorplan.id}`, "PATCH", {
        org_id: orgId,
        name: nameValue.trim(),
        community: communityValue.trim() || null,
      });
      setCurrentFloorplan((prev) => ({ ...prev, ...data }));
      setNameValue((data.name as string | undefined) ?? nameValue.trim());
      setCommunityValue((data.community as string | null | undefined) ?? (communityValue.trim() || ""));
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save floorplan");
    } finally {
      setSavingFloorplan(false);
    }
  }, [nameValue, communityValue, currentFloorplan.id, orgId, router]);

  const handleToggleActive = useCallback(async () => {
    try {
      const data = await apiCall(`/api/admin/floorplans/${currentFloorplan.id}`, "PATCH", {
        org_id: orgId,
        is_active: !currentFloorplan.is_active,
      });
      setCurrentFloorplan((prev) => ({ ...prev, ...data }));
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  }, [currentFloorplan.id, currentFloorplan.is_active, orgId, router]);

  const handleDeleteFloorplan = useCallback(async () => {
    const required = currentFloorplan.name;
    const typed = prompt(`Type "${required}" to confirm floorplan deletion.`);
    if (!typed || typed !== required) return;
    setDeletingFloorplan(true);
    try {
      await apiCall(`/api/admin/floorplans/${currentFloorplan.id}`, "DELETE", { org_id: orgId });
      router.push(`/admin/${orgSlug}/floorplans`);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete floorplan");
    } finally {
      setDeletingFloorplan(false);
    }
  }, [currentFloorplan.id, currentFloorplan.name, orgId, orgSlug, router]);

  const handleDuplicateFloorplan = useCallback(async () => {
    const typed = prompt('Type "duplicate" to confirm floorplan duplication.');
    if (!typed || typed.toLowerCase() !== "duplicate") return;
    setDuplicatingFloorplan(true);
    try {
      const data = await apiCall(`/api/admin/floorplans/${currentFloorplan.id}/duplicate`, "POST", {
        org_id: orgId,
      });
      router.push(`/admin/${orgSlug}/floorplans/${data.id}`);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to duplicate floorplan");
    } finally {
      setDuplicatingFloorplan(false);
    }
  }, [currentFloorplan.id, orgId, orgSlug, router]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(steps, oldIndex, newIndex);
    setSteps(reordered);

    try {
      await apiCall("/api/admin/reorder", "POST", {
        org_id: orgId,
        table: "steps",
        items: reordered.map((s, i) => ({ id: s.id, sort_order: i })),
        floorplan_id: currentFloorplan.id,
      });
      router.refresh();
    } catch (err) {
      setSteps(steps);
      alert(err instanceof Error ? err.message : "Reorder failed");
    }
  }, [steps, orgId, currentFloorplan.id, router]);

  const handleAdd = useCallback(async () => {
    if (!addName.trim() || atMaxSteps) return;
    setAdding(true);
    try {
      const data = await apiCall("/api/admin/steps", "POST", {
        org_id: orgId,
        floorplan_id: currentFloorplan.id,
        name: addName.trim(),
        sort_order: steps.length,
      });
      setSteps((prev) => [
        ...prev,
        {
          ...data,
          sections: data.sections ?? [],
          also_include_ids: data.also_include_ids ?? [],
          photo_count: 0,
          preview_image_path: null,
        },
      ]);
      setAddName("");
      setShowAdd(false);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create step");
    } finally {
      setAdding(false);
    }
  }, [addName, atMaxSteps, orgId, currentFloorplan.id, steps.length, router]);

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="bg-slate-50 border border-slate-200 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-slate-900">Floorplan Settings</h2>
            <Link
              href={`/admin/${orgSlug}/floorplans/${currentFloorplan.id}/photos`}
              className="text-xs text-slate-600 hover:text-slate-900 border border-slate-300 hover:border-slate-400 px-2.5 py-1 inline-flex items-center gap-1"
            >
              <Camera className="w-3.5 h-3.5" />
              Manage all photos
            </Link>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="bg-white border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
              placeholder="Floorplan name"
            />
            <input
              value={communityValue}
              onChange={(e) => setCommunityValue(e.target.value)}
              className="bg-white border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
              placeholder="Community"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleToggleActive}
              className={`text-xs px-2 py-0.5 border transition-colors ${
                currentFloorplan.is_active
                  ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                  : "border-slate-300 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {currentFloorplan.is_active ? "Active" : "Inactive"}
            </button>
            <button
              onClick={handleSaveFloorplan}
              disabled={savingFloorplan || !hasFloorplanChanges || !nameValue.trim()}
              className="text-xs text-white bg-slate-900 hover:bg-slate-800 px-3 py-1 disabled:opacity-60"
            >
              {savingFloorplan ? "Saving..." : "Save details"}
            </button>
            <button
              onClick={handleDuplicateFloorplan}
              disabled={duplicatingFloorplan}
              className="text-xs text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 px-2.5 py-1 inline-flex items-center gap-1 disabled:opacity-60"
            >
              {duplicatingFloorplan ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Duplicate floorplan
            </button>
            <button
              onClick={handleDeleteFloorplan}
              disabled={deletingFloorplan}
              className="text-xs text-red-700 hover:text-red-800 border border-red-200 hover:border-red-300 px-2.5 py-1 inline-flex items-center gap-1 disabled:opacity-60 ml-auto"
            >
              {deletingFloorplan ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Delete floorplan
            </button>
          </div>
        </div>
      )}

      <div className="text-xs text-slate-500">
        {steps.length}/{MAX_STEPS_PER_FLOORPLAN} steps
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {steps.map((step, index) => (
              <SortableStep
                key={step.id}
                step={step}
                displayNumber={index + 1}
                orgId={orgId}
                orgSlug={orgSlug}
                floorplanId={currentFloorplan.id}
                isAdmin={isAdmin}
                isExpanded={expanded.has(step.id)}
                onToggle={() => toggleExpand(step.id)}
                onUpdate={(updated) => {
                  setSteps((prev) =>
                    prev.map((s) =>
                      s.id === updated.id
                        ? {
                            ...updated,
                            sections: updated.sections ?? [],
                            also_include_ids: updated.also_include_ids ?? [],
                            photo_count: s.photo_count,
                            preview_image_path: s.preview_image_path,
                          }
                        : s
                    )
                  );
                }}
                onDelete={() => {
                  setSteps((prev) => prev.filter((s) => s.id !== step.id));
                  router.refresh();
                }}
                allSubcategories={allSubcategories}
                supabaseUrl={supabaseUrl}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {isAdmin && (
        <>
          {showAdd ? (
            <div className="bg-slate-50 border border-slate-200 p-4 space-y-3">
              {atMaxSteps && (
                <p className="text-xs text-amber-700">
                  Maximum {MAX_STEPS_PER_FLOORPLAN} steps per floorplan. Combine sections within a step to simplify navigation.
                </p>
              )}
              <input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                className="bg-white border border-slate-300 px-2 py-1 text-sm text-slate-900 w-full"
                placeholder="Step name (e.g. Kitchen)"
                autoFocus
                disabled={atMaxSteps}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") setShowAdd(false);
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={adding || !addName.trim() || atMaxSteps}
                  className="bg-slate-900 text-white px-3 py-1 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                >
                  {adding ? "Creating..." : "Add Step"}
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  className="text-slate-500 hover:text-slate-900 text-sm px-3 py-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => setShowAdd(true)}
                disabled={atMaxSteps}
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" /> Add step
              </button>
              {atMaxSteps && (
                <p className="text-xs text-amber-700">
                  Maximum {MAX_STEPS_PER_FLOORPLAN} steps per floorplan. Combine sections within a step to simplify navigation.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
