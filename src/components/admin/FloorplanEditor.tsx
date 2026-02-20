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
  GripVertical, Plus, Trash2, Pencil, Check, X, Loader2,
  ChevronDown, ChevronRight, Camera, Image,
} from "lucide-react";
import type { AdminStep } from "@/types";

interface FloorplanDetail {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  community: string | null;
  price_sheet_label: string | null;
  is_active: boolean;
}
import { StepSectionEditor } from "./StepSectionEditor";

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

interface SubcategoryOption {
  id: string;
  name: string;
  categoryName: string;
}

interface FloorplanEditorProps {
  floorplan: FloorplanDetail;
  steps: (AdminStep & { photo_count: number })[];
  orgId: string;
  orgSlug: string;
  isAdmin: boolean;
  allSubcategories: SubcategoryOption[];
}

// ---------- Sortable Step Row ----------

function SortableStep({
  step,
  orgId,
  orgSlug,
  floorplanId,
  isAdmin,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  allSubcategories,
}: {
  step: AdminStep & { photo_count: number };
  orgId: string;
  orgSlug: string;
  floorplanId: string;
  isAdmin: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updated: AdminStep) => void;
  onDelete: () => void;
  allSubcategories: SubcategoryOption[];
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
      {/* Step header */}
      <div className="flex items-center gap-2 px-4 py-3">
        {isAdmin && (
          <button {...attributes} {...listeners} className="text-slate-500 hover:text-slate-700 cursor-grab">
            <GripVertical className="w-4 h-4" />
          </button>
        )}

        <button onClick={onToggle} className="text-slate-500 hover:text-slate-900">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {editingName ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="bg-white border border-slate-300 px-2 py-1 text-sm text-slate-900 flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") { setEditingName(false); setNameValue(step.name); }
              }}
            />
            <input
              value={subtitleValue}
              onChange={(e) => setSubtitleValue(e.target.value)}
              className="bg-white border border-slate-300 px-2 py-1 text-sm text-slate-900 w-40"
              placeholder="Subtitle"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") { setEditingName(false); setNameValue(step.name); }
              }}
            />
            <button onClick={handleSaveName} disabled={saving} className="text-green-400 hover:text-green-300 p-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            <button onClick={() => { setEditingName(false); setNameValue(step.name); }} className="text-slate-500 hover:text-slate-900 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-slate-500 mr-2">#{step.number}</span>
              <span className="text-sm font-medium text-slate-900">{step.name}</span>
              {step.subtitle && <span className="text-xs text-slate-500 ml-2">{step.subtitle}</span>}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Link
                href={`/admin/${orgSlug}/floorplans/${floorplanId}/photos?step=${step.id}`}
                className="flex items-center gap-1 hover:text-slate-900 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                {step.photo_count} photo{step.photo_count !== 1 ? "s" : ""}
              </Link>
              {step.show_generate_button && (
                <span className="flex items-center gap-1 text-green-500">
                  <Image className="w-3.5 h-3.5" /> AI
                </span>
              )}
            </div>

            {isAdmin && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setEditingName(true); setNameValue(step.name); setSubtitleValue(step.subtitle || ""); }}
                  className="text-slate-500 hover:text-slate-900 p-1"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleDelete} disabled={deleting} className="text-slate-500 hover:text-red-600 p-1">
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-slate-200 px-4 py-4 space-y-4">
          {/* AI Generation toggle */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-600">Show Generate Button</label>
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

          {/* Scene description */}
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

          {/* Sections */}
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

// ---------- Main Editor ----------

export function FloorplanEditor({
  floorplan,
  steps: initialSteps,
  orgId,
  orgSlug,
  isAdmin,
  allSubcategories,
}: FloorplanEditorProps) {
  const router = useRouter();
  const [steps, setSteps] = useState(initialSteps);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [adding, setAdding] = useState(false);

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
        floorplan_id: floorplan.id,
      });
      router.refresh();
    } catch (err) {
      setSteps(steps); // revert
      alert(err instanceof Error ? err.message : "Reorder failed");
    }
  }, [steps, orgId, router]);

  const handleAdd = useCallback(async () => {
    if (!addName.trim()) return;
    setAdding(true);
    try {
      const data = await apiCall("/api/admin/steps", "POST", {
        org_id: orgId,
        floorplan_id: floorplan.id,
        name: addName.trim(),
        number: steps.length + 1,
        sort_order: steps.length,
      });
      setSteps((prev) => [...prev, { ...data, sections: data.sections ?? [], also_include_ids: data.also_include_ids ?? [], photo_count: 0 }]);
      setAddName("");
      setShowAdd(false);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create step");
    } finally {
      setAdding(false);
    }
  }, [addName, orgId, floorplan.id, steps.length, router]);

  return (
    <div className="space-y-4">
      {/* Photos link */}
      <div className="flex gap-3">
        <Link
          href={`/admin/${orgSlug}/floorplans/${floorplan.id}/photos`}
          className="text-sm text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5"
        >
          <Camera className="w-4 h-4" /> Manage Photos
        </Link>
      </div>

      {/* Step list */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {steps.map((step) => (
              <SortableStep
                key={step.id}
                step={step}
                orgId={orgId}
                orgSlug={orgSlug}
                floorplanId={floorplan.id}
                isAdmin={isAdmin}
                isExpanded={expanded.has(step.id)}
                onToggle={() => toggleExpand(step.id)}
                onUpdate={(updated) => {
                  setSteps((prev) =>
                    prev.map((s) =>
                      s.id === updated.id
                        ? { ...updated, sections: updated.sections ?? [], also_include_ids: updated.also_include_ids ?? [], photo_count: s.photo_count }
                        : s
                    )
                  );
                }}
                onDelete={() => {
                  setSteps((prev) => prev.filter((s) => s.id !== step.id));
                  router.refresh();
                }}
                allSubcategories={allSubcategories}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add step */}
      {isAdmin && (
        <>
          {showAdd ? (
            <div className="bg-slate-50 border border-slate-200 p-4 space-y-3">
              <input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                className="bg-white border border-slate-300 px-2 py-1 text-sm text-slate-900 w-full"
                placeholder="Step name (e.g. Kitchen)"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") setShowAdd(false);
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={adding || !addName.trim()}
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
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add step
            </button>
          )}
        </>
      )}
    </div>
  );
}
