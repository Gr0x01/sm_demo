"use client";

import { useState, useCallback, useRef, memo, useEffect } from "react";
import type { AdminCategory, AdminSubcategory, AdminOption } from "@/types";
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash, Trash2, Pencil, Check, X } from "lucide-react";
import { SwatchUpload } from "./SwatchUpload";
import { FloorplanScopePopover } from "./FloorplanScopePopover";

// ---------- API helpers ----------

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

// ---------- Main Tree ----------

export type StepGroup = { label: string; categoryIds: string[] };

interface OptionTreeProps {
  categories: AdminCategory[];
  orgId: string;
  orgSlug: string;
  isAdmin: boolean;
  floorplans: { id: string; name: string }[];
  stepGroups: StepGroup[];
}

export function OptionTree({ categories: initialCategories, orgId, orgSlug, isAdmin, floorplans, stepGroups }: OptionTreeProps) {
  void orgSlug;
  const [categories, setCategories] = useState(initialCategories);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());
  const [showAddCategory, setShowAddCategory] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggleCat = (catId: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId); else next.add(catId);
      return next;
    });
  };

  const toggleSub = (subId: string) => {
    setExpandedSubs((prev) => {
      const next = new Set(prev);
      if (next.has(subId)) next.delete(subId); else next.add(subId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCats(new Set(categories.map((c) => c.id)));
    setExpandedSubs(new Set(categories.flatMap((c) => c.subcategories.map((s) => s.id))));
  };

  const collapseAll = () => {
    setExpandedCats(new Set());
    setExpandedSubs(new Set());
  };

  const handleCategoryReorder = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return; // not our items
    const reordered = arrayMove(categories, oldIndex, newIndex);

    // Optimistic update
    setCategories(reordered);

    try {
      await apiCall("/api/admin/reorder", "POST", {
        org_id: orgId,
        table: "categories",
        items: reordered.map((c, i) => ({ id: c.id, sort_order: i })),
      });
    } catch (err) {
      console.error("Reorder failed:", err);
      // Rollback
      setCategories(categories);
    }
  }, [orgId, categories]);

  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;

  const handleAddCategory = useCallback(async (name: string) => {
    try {
      const data = await apiCall("/api/admin/categories", "POST", {
        org_id: orgId,
        name,
        sort_order: categoriesRef.current.length,
      });
      setCategories((prev) => [...prev, { ...data, subcategories: [] }]);
      setShowAddCategory(false);
    } catch (err) {
      console.error("Add category failed:", err);
    }
  }, [orgId]);

  const handleUpdateCategory = useCallback(async (catId: string, updates: Record<string, unknown>) => {
    try {
      await apiCall(`/api/admin/categories/${catId}`, "PATCH", { org_id: orgId, ...updates });
      setCategories((prev) => prev.map((c) => c.id === catId ? { ...c, ...updates } : c));
    } catch (err) {
      console.error("Update failed:", err);
    }
  }, [orgId]);

  const handleDeleteCategory = useCallback(async (catId: string) => {
    try {
      await apiCall(`/api/admin/categories/${catId}`, "DELETE", { org_id: orgId });
      setCategories((prev) => prev.filter((c) => c.id !== catId));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }, [orgId]);

  const handleAddSubcategory = useCallback(async (catId: string, name: string) => {
    try {
      const cat = categoriesRef.current.find((c) => c.id === catId);
      const data = await apiCall("/api/admin/subcategories", "POST", {
        org_id: orgId,
        category_id: catId,
        name,
        sort_order: cat?.subcategories.length ?? 0,
      });
      setCategories((prev) => prev.map((c) =>
        c.id === catId ? { ...c, subcategories: [...c.subcategories, { ...data, options: [] }] } : c
      ));
    } catch (err) {
      console.error("Add subcategory failed:", err);
    }
  }, [orgId]);

  const handleUpdateSubcategory = useCallback(async (subId: string, updates: Record<string, unknown>) => {
    try {
      await apiCall(`/api/admin/subcategories/${subId}`, "PATCH", { org_id: orgId, ...updates });
      setCategories((prev) => prev.map((c) => ({
        ...c,
        subcategories: c.subcategories.map((s) => s.id === subId ? { ...s, ...updates } : s),
      })));
    } catch (err) {
      console.error("Update failed:", err);
    }
  }, [orgId]);

  const handleDeleteSubcategory = useCallback(async (subId: string) => {
    try {
      await apiCall(`/api/admin/subcategories/${subId}`, "DELETE", { org_id: orgId });
      setCategories((prev) => prev.map((c) => ({
        ...c,
        subcategories: c.subcategories.filter((s) => s.id !== subId),
      })));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }, [orgId]);

  const handleSubcategoryReorder = useCallback(async (catId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;

    const oldIndex = cat.subcategories.findIndex((s) => s.id === active.id);
    const newIndex = cat.subcategories.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return; // not our items
    const reordered = arrayMove(cat.subcategories, oldIndex, newIndex);
    const snapshot = categories;

    // Optimistic update
    setCategories((prev) => prev.map((c) =>
      c.id === catId ? { ...c, subcategories: reordered } : c
    ));

    try {
      await apiCall("/api/admin/reorder", "POST", {
        org_id: orgId,
        table: "subcategories",
        items: reordered.map((s, i) => ({ id: s.id, sort_order: i })),
      });
    } catch (err) {
      console.error("Reorder failed:", err);
      setCategories(snapshot);
    }
  }, [orgId, categories]);

  const handleAddOption = useCallback(async (subId: string, name: string, price: number) => {
    try {
      const sub = categoriesRef.current.flatMap((c) => c.subcategories).find((s) => s.id === subId);
      const data = await apiCall("/api/admin/options", "POST", {
        org_id: orgId,
        subcategory_id: subId,
        name,
        price,
        sort_order: sub?.options.length ?? 0,
      });
      setCategories((prev) => prev.map((c) => ({
        ...c,
        subcategories: c.subcategories.map((s) =>
          s.id === subId ? { ...s, options: [...s.options, data] } : s
        ),
      })));
    } catch (err) {
      console.error("Add option failed:", err);
    }
  }, [orgId]);

  const handleUpdateOption = useCallback(async (optId: string, updates: Record<string, unknown>) => {
    try {
      await apiCall(`/api/admin/options/${optId}`, "PATCH", { org_id: orgId, ...updates });
      setCategories((prev) => prev.map((c) => ({
        ...c,
        subcategories: c.subcategories.map((s) => ({
          ...s,
          options: s.options.map((o) => o.id === optId ? { ...o, ...updates } : o),
        })),
      })));
    } catch (err) {
      console.error("Update failed:", err);
    }
  }, [orgId]);

  const handleDeleteOption = useCallback(async (optId: string) => {
    try {
      await apiCall(`/api/admin/options/${optId}`, "DELETE", { org_id: orgId });
      setCategories((prev) => prev.map((c) => ({
        ...c,
        subcategories: c.subcategories.map((s) => ({
          ...s,
          options: s.options.filter((o) => o.id !== optId),
        })),
      })));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }, [orgId]);

  const handleOptionReorder = useCallback(async (subId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sub = categories.flatMap((c) => c.subcategories).find((s) => s.id === subId);
    if (!sub) return;

    const oldIndex = sub.options.findIndex((o) => o.id === active.id);
    const newIndex = sub.options.findIndex((o) => o.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return; // not our items
    const reordered = arrayMove(sub.options, oldIndex, newIndex);
    const snapshot = categories;

    // Optimistic update
    setCategories((prev) => prev.map((c) => ({
      ...c,
      subcategories: c.subcategories.map((s) =>
        s.id === subId ? { ...s, options: reordered } : s
      ),
    })));

    try {
      await apiCall("/api/admin/reorder", "POST", {
        org_id: orgId,
        table: "options",
        items: reordered.map((o, i) => ({ id: o.id, sort_order: i })),
      });
    } catch (err) {
      console.error("Reorder failed:", err);
      setCategories(snapshot);
    }
  }, [orgId, categories]);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={expandAll} className="px-3 py-1.5 text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition-colors">
          Expand all
        </button>
        <button onClick={collapseAll} className="px-3 py-1.5 text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition-colors">
          Collapse all
        </button>
        {isAdmin && (
          <button
            onClick={() => setShowAddCategory(true)}
            className="px-3 py-1.5 text-xs text-white bg-slate-900 border border-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-1 ml-auto"
          >
            <Plus className="w-3 h-3" /> Category
          </button>
        )}
      </div>

      {/* Add category form */}
      {showAddCategory && (
        <AddItemForm
          placeholder="Category name..."
          onSubmit={handleAddCategory}
          onCancel={() => setShowAddCategory(false)}
        />
      )}

      {/* Tree grouped by step */}
      {stepGroups.length > 0 ? (
        <div className="space-y-6">
          {stepGroups.map((group) => {
            const groupCats = group.categoryIds
              .map((id) => categories.find((c) => c.id === id))
              .filter(Boolean) as AdminCategory[];
            if (groupCats.length === 0) return null;

            return (
              <div key={group.label}>
                <h3 className="text-[11px] uppercase tracking-[0.16em] text-slate-400 font-semibold mb-2">{group.label}</h3>
                <DndContext id={`cat-dnd-${group.label}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryReorder}>
                  <SortableContext items={groupCats.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1">
                      {groupCats.map((cat) => (
                        <SortableCategoryRow
                          key={cat.id}
                          category={cat}
                          isExpanded={expandedCats.has(cat.id)}
                          expandedSubs={expandedSubs}
                          onToggle={() => toggleCat(cat.id)}
                          onToggleSub={toggleSub}
                          isAdmin={isAdmin}
                          orgId={orgId}
                          floorplans={floorplans}
                          sensors={sensors}
                          onUpdate={handleUpdateCategory}
                          onDelete={handleDeleteCategory}
                          onAddSub={handleAddSubcategory}
                          onUpdateSub={handleUpdateSubcategory}
                          onDeleteSub={handleDeleteSubcategory}
                          onSubReorder={handleSubcategoryReorder}
                          onAddOption={handleAddOption}
                          onUpdateOption={handleUpdateOption}
                          onDeleteOption={handleDeleteOption}
                          onOptionReorder={handleOptionReorder}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            );
          })}
        </div>
      ) : (
        <DndContext id="cat-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryReorder}>
          <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
              {categories.map((cat) => (
                <SortableCategoryRow
                  key={cat.id}
                  category={cat}
                  isExpanded={expandedCats.has(cat.id)}
                  expandedSubs={expandedSubs}
                  onToggle={() => toggleCat(cat.id)}
                  onToggleSub={toggleSub}
                  isAdmin={isAdmin}
                  orgId={orgId}
                  floorplans={floorplans}
                  sensors={sensors}
                  onUpdate={handleUpdateCategory}
                  onDelete={handleDeleteCategory}
                  onAddSub={handleAddSubcategory}
                  onUpdateSub={handleUpdateSubcategory}
                  onDeleteSub={handleDeleteSubcategory}
                  onSubReorder={handleSubcategoryReorder}
                  onAddOption={handleAddOption}
                  onUpdateOption={handleUpdateOption}
                  onDeleteOption={handleDeleteOption}
                  onOptionReorder={handleOptionReorder}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

// ---------- Sortable Category Row ----------

function SortableCategoryRow({
  category,
  isExpanded,
  expandedSubs,
  onToggle,
  onToggleSub,
  isAdmin,
  orgId,
  floorplans,
  sensors,
  onUpdate,
  onDelete,
  onAddSub,
  onUpdateSub,
  onDeleteSub,
  onSubReorder,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
  onOptionReorder,
}: {
  category: AdminCategory;
  isExpanded: boolean;
  expandedSubs: Set<string>;
  onToggle: () => void;
  onToggleSub: (id: string) => void;
  isAdmin: boolean;
  orgId: string;
  floorplans: { id: string; name: string }[];
  sensors: ReturnType<typeof useSensors>;
  onUpdate: (id: string, updates: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddSub: (catId: string, name: string) => Promise<void>;
  onUpdateSub: (id: string, updates: Record<string, unknown>) => Promise<void>;
  onDeleteSub: (id: string) => Promise<void>;
  onSubReorder: (catId: string, event: DragEndEvent) => Promise<void>;
  onAddOption: (subId: string, name: string, price: number) => Promise<void>;
  onUpdateOption: (id: string, updates: Record<string, unknown>) => Promise<void>;
  onDeleteOption: (id: string) => Promise<void>;
  onOptionReorder: (subId: string, event: DragEndEvent) => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [showAddSub, setShowAddSub] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const optionCount = category.subcategories.reduce((s, sub) => s + sub.options.length, 0);

  const handleSaveName = async () => {
    if (editName.trim() && editName !== category.name) {
      await onUpdate(category.id, { name: editName.trim() });
    }
    setIsEditing(false);
  };

  return (
    <div ref={setNodeRef} style={style} className="border border-neutral-800 bg-neutral-900/50">
      <div className="flex items-center gap-2 px-3 py-2.5">
        {isAdmin && (
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="w-4 h-4 text-neutral-600" />
          </div>
        )}

        <button onClick={onToggle} className="shrink-0">
          {isExpanded ? <ChevronDown className="w-4 h-4 text-neutral-400" /> : <ChevronRight className="w-4 h-4 text-neutral-400" />}
        </button>

        {isEditing ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setIsEditing(false); }}
              autoFocus
              className="bg-neutral-800 border border-neutral-600 text-white text-sm px-2 py-0.5 flex-1 focus:outline-none focus:border-neutral-400"
            />
            <button onClick={handleSaveName} className="text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
            <button onClick={() => setIsEditing(false)} className="text-neutral-500 hover:text-neutral-300"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <span className="font-semibold text-sm text-white flex-1 cursor-pointer" onClick={onToggle}>{category.name}</span>
        )}

        <span className="text-xs text-neutral-500 shrink-0">
          {category.subcategories.length} sub &middot; {optionCount} opt
        </span>

        {isAdmin && !isEditing && (
          <div className="flex items-center gap-1 ml-2">
            {floorplans.length > 1 && (
              <FloorplanScopePopover orgId={orgId} level="category" entityId={category.id} floorplans={floorplans} />
            )}
            <button onClick={() => { setEditName(category.name); setIsEditing(true); }} className="text-neutral-600 hover:text-neutral-300 p-1" title="Rename">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setShowAddSub(true)} className="text-neutral-600 hover:text-neutral-300 p-1" title="Add subcategory">
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { if (confirm(`Delete category "${category.name}" and all its contents?`)) onDelete(category.id); }}
              className="text-neutral-600 hover:text-red-400 p-1"
              title="Delete category"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="border-t border-neutral-800">
          {showAddSub && (
            <div className="ml-6 px-3 py-2">
              <AddItemForm
                placeholder="Subcategory name..."
                onSubmit={async (name) => {
                  try {
                    await onAddSub(category.id, name);
                    setShowAddSub(false);
                  } catch {
                    // form stays open on error
                  }
                }}
                onCancel={() => setShowAddSub(false)}
              />
            </div>
          )}
          <DndContext id={`sub-dnd-${category.id}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => onSubReorder(category.id, e)}>
            <SortableContext items={category.subcategories.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {category.subcategories.map((sub) => (
                <SortableSubcategoryRow
                  key={sub.id}
                  subcategory={sub}
                  categoryName={category.name}
                  isExpanded={expandedSubs.has(sub.id)}
                  onToggle={() => onToggleSub(sub.id)}
                  isAdmin={isAdmin}
                  orgId={orgId}
                  floorplans={floorplans}
                  sensors={sensors}
                  onUpdate={onUpdateSub}
                  onDelete={onDeleteSub}
                  onAddOption={onAddOption}
                  onUpdateOption={onUpdateOption}
                  onDeleteOption={onDeleteOption}
                  onOptionReorder={onOptionReorder}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

// ---------- Sortable Subcategory Row ----------

function SortableSubcategoryRow({
  subcategory,
  categoryName,
  isExpanded,
  onToggle,
  isAdmin,
  orgId,
  floorplans,
  sensors,
  onUpdate,
  onDelete,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
  onOptionReorder,
}: {
  subcategory: AdminSubcategory;
  categoryName: string;
  isExpanded: boolean;
  onToggle: () => void;
  isAdmin: boolean;
  orgId: string;
  floorplans: { id: string; name: string }[];
  sensors: ReturnType<typeof useSensors>;
  onUpdate: (id: string, updates: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddOption: (subId: string, name: string, price: number) => Promise<void>;
  onUpdateOption: (id: string, updates: Record<string, unknown>) => Promise<void>;
  onDeleteOption: (id: string) => Promise<void>;
  onOptionReorder: (subId: string, event: DragEndEvent) => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: subcategory.id });
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(subcategory.name);
  const [showAddOption, setShowAddOption] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSaveName = async () => {
    if (editName.trim() && editName !== subcategory.name) {
      await onUpdate(subcategory.id, { name: editName.trim() });
    }
    setIsEditing(false);
  };

  return (
    <div ref={setNodeRef} style={style} className="ml-6 border-l border-neutral-800">
      <div className="flex items-center gap-2 px-3 py-2">
        {isAdmin && (
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="w-3.5 h-3.5 text-neutral-700" />
          </div>
        )}

        <button onClick={onToggle} className="shrink-0">
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
        </button>

        {isEditing ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setIsEditing(false); }}
              autoFocus
              className="bg-neutral-800 border border-neutral-600 text-white text-sm px-2 py-0.5 flex-1 focus:outline-none focus:border-neutral-400"
            />
            <button onClick={handleSaveName} className="text-green-400 hover:text-green-300"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={() => setIsEditing(false)} className="text-neutral-500 hover:text-neutral-300"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <span className="text-sm text-neutral-200 flex-1 cursor-pointer" onClick={onToggle}>{subcategory.name}</span>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {subcategory.is_visual && (
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/30 text-blue-400 border border-blue-800/50">visual</span>
          )}
          {subcategory.is_additive && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-900/30 text-amber-400 border border-amber-800/50">additive</span>
          )}
          <span className="text-xs text-neutral-500">{subcategory.options.length} opt</span>
        </div>

        {isAdmin && !isEditing && (
          <div className="flex items-center gap-1 ml-1">
            {floorplans.length > 1 && (
              <FloorplanScopePopover orgId={orgId} level="subcategory" entityId={subcategory.id} floorplans={floorplans} inheritedFrom={`Category: ${categoryName}`} />
            )}
            <button onClick={() => { setEditName(subcategory.name); setIsEditing(true); }} className="text-neutral-600 hover:text-neutral-300 p-1">
              <Pencil className="w-3 h-3" />
            </button>
            <button onClick={() => setShowAddOption(true)} className="text-neutral-600 hover:text-neutral-300 p-1">
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={() => { if (confirm(`Delete subcategory "${subcategory.name}" and all options?`)) onDelete(subcategory.id); }}
              className="text-neutral-600 hover:text-red-400 p-1"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="border-t border-neutral-800/50 bg-neutral-800/20 py-3">
          {showAddOption && (
            <div className="ml-6 px-3 pb-3">
              <AddOptionForm
                onSubmit={async (name, price) => {
                  try {
                    await onAddOption(subcategory.id, name, price);
                    setShowAddOption(false);
                  } catch {
                    // form stays open on error
                  }
                }}
                onCancel={() => setShowAddOption(false)}
              />
            </div>
          )}
          <DndContext id={`opt-dnd-${subcategory.id}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => onOptionReorder(subcategory.id, e)}>
            <SortableContext items={subcategory.options.map((o) => o.id)} strategy={rectSortingStrategy}>
              <div className="ml-6 grid gap-3 px-3 sm:grid-cols-2 xl:grid-cols-3">
                {subcategory.options.map((option) => (
                  <SortableOptionRow
                    key={option.id}
                    option={option}
                    isAdmin={isAdmin}
                    orgId={orgId}
                    categoryName={categoryName}
                    subcategoryName={subcategory.name}
                    onUpdate={onUpdateOption}
                    onDelete={onDeleteOption}
                  />
                ))}
                {isAdmin && subcategory.options.length === 0 && !showAddOption && (
                  <button
                    onClick={() => setShowAddOption(true)}
                    className="h-44 border border-dashed border-neutral-600 bg-neutral-900/60 p-4 text-left text-neutral-500 transition-colors hover:border-neutral-500 hover:text-neutral-300"
                  >
                    <Plus className="mb-3 h-4 w-4" />
                    <div className="text-sm font-medium">Add first option</div>
                    <p className="mt-1 text-xs text-neutral-500">Create a visual card for this section.</p>
                  </button>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

// ---------- Sortable Option Row ----------

const SortableOptionRow = memo(function SortableOptionRow({
  option,
  isAdmin,
  orgId,
  categoryName,
  subcategoryName,
  onUpdate,
  onDelete,
}: {
  option: AdminOption;
  isAdmin: boolean;
  orgId: string;
  categoryName: string;
  subcategoryName: string;
  onUpdate: (id: string, updates: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: option.id });
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceValue, setPriceValue] = useState(String(option.price));
  const descriptorPreview =
    option.description?.trim() ||
    option.prompt_descriptor?.trim() ||
    "Click to edit details.";

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    if (!editingPrice) {
      setPriceValue(String(option.price));
    }
  }, [editingPrice, option.price]);

  const handleSavePrice = async () => {
    const newPrice = parseInt(priceValue, 10);
    if (!isNaN(newPrice) && newPrice !== option.price) {
      try {
        await onUpdate(option.id, { price: newPrice });
      } catch (err) {
        console.error("Price save failed:", err);
      }
    }
    setEditingPrice(false);
  };

  const handleSaveOption = async (updates: Record<string, unknown>) => {
    try {
      await onUpdate(option.id, updates);
    } catch (err) {
      console.error("Option save failed:", err);
    }
  };

  const openEditor = () => setIsEditorOpen(true);
  const closeEditor = () => setIsEditorOpen(false);

  return (
    <>
      <div ref={setNodeRef} style={style} className="min-w-0">
        <div className="h-full overflow-hidden border border-neutral-800 bg-neutral-900 transition-colors hover:bg-neutral-800/20">
          <div
            className="cursor-pointer p-3 sm:p-4"
            role="button"
            tabIndex={0}
            onClick={openEditor}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openEditor();
              }
            }}
          >
            <div className="flex items-start gap-3">
              {isAdmin && (
                <div
                  {...attributes}
                  {...listeners}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 border border-neutral-800 p-1 text-neutral-600 cursor-grab active:cursor-grabbing"
                >
                  <GripVertical className="h-4 w-4" />
                </div>
              )}

              <div className="h-16 w-16 shrink-0 overflow-hidden border border-neutral-700 bg-neutral-800">
                {option.swatch_url ? (
                  <img src={option.swatch_url} alt="" className="h-full w-full object-cover" />
                ) : option.swatch_color ? (
                  <div className="h-full w-full" style={{ backgroundColor: option.swatch_color }} />
                ) : (
                  <div className="h-full w-full bg-neutral-800" />
                )}
              </div>

              <div className="min-w-0 flex-1 pr-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold text-neutral-200">{option.name}</span>
                  {option.is_default && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-green-900/30 text-green-400 border border-green-800/50">default</span>
                  )}
                  {option.nudge && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/30 text-blue-400 border border-blue-800/50">{option.nudge}</span>
                  )}
                </div>
                <p className="mt-1 overflow-hidden text-xs leading-5 text-neutral-500 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
                  {descriptorPreview}
                </p>
              </div>

              <div className="shrink-0 text-right" onClick={(e) => e.stopPropagation()}>
                {editingPrice ? (
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-neutral-500">$</span>
                    <input
                      value={priceValue}
                      onChange={(e) => setPriceValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSavePrice(); if (e.key === "Escape") setEditingPrice(false); }}
                      autoFocus
                      className="w-24 bg-neutral-800 border border-neutral-600 text-white text-sm px-1.5 py-0.5 font-mono text-right focus:outline-none focus:border-neutral-400"
                    />
                    <button onClick={handleSavePrice} className="text-green-400 hover:text-green-300"><Check className="w-3.5 h-3.5" /></button>
                  </div>
                ) : isAdmin ? (
                  <button
                    onClick={() => { setPriceValue(String(option.price)); setEditingPrice(true); }}
                    className={`border border-neutral-700 px-2 py-1 text-sm font-mono tabular-nums transition-colors ${option.price === 0 ? "text-green-500" : "text-neutral-300"} hover:border-neutral-500`}
                  >
                    {option.price === 0 ? "Included" : `$${option.price.toLocaleString()}`}
                  </button>
                ) : (
                  <span className={`border border-neutral-700 px-2 py-1 text-sm font-mono tabular-nums ${option.price === 0 ? "text-green-500" : "text-neutral-300"}`}>
                    {option.price === 0 ? "Included" : `$${option.price.toLocaleString()}`}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-neutral-800/50 px-3 py-2 text-[11px] text-neutral-500 sm:px-4">
            <div>
              {!option.prompt_descriptor && (
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-900/30 text-amber-400 border border-amber-800/50">not ready</span>
              )}
            </div>
            {isAdmin && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={openEditor}
                  className="inline-flex items-center justify-end gap-1 whitespace-nowrap text-[11px] text-neutral-500 hover:text-neutral-300"
                >
                  <span>Edit details</span>
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => { if (confirm(`Delete "${option.name}"?`)) onDelete(option.id); }}
                  className="inline-flex items-center text-neutral-600 hover:text-red-400"
                  title="Delete option"
                  aria-label={`Delete ${option.name}`}
                >
                  <Trash className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isEditorOpen && isAdmin && (
        <OptionEditorModal
          option={option}
          orgId={orgId}
          categoryName={categoryName}
          subcategoryName={subcategoryName}
          onSaveOption={handleSaveOption}
          onDelete={onDelete}
          onClose={closeEditor}
        />
      )}
    </>
  );
});

function OptionEditorModal({
  option,
  orgId,
  categoryName,
  subcategoryName,
  onSaveOption,
  onDelete,
  onClose,
}: {
  option: AdminOption;
  orgId: string;
  categoryName: string;
  subcategoryName: string;
  onSaveOption: (updates: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState({
    name: option.name,
    price: String(option.price),
    swatchColor: option.swatch_color ?? "",
    nudge: option.nudge ?? "",
    swatchUrl: option.swatch_url,
    description: option.description ?? "",
    promptDescriptor: option.prompt_descriptor ?? "",
    isDefault: option.is_default,
  });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setDraft({
      name: option.name,
      price: String(option.price),
      swatchColor: option.swatch_color ?? "",
      nudge: option.nudge ?? "",
      swatchUrl: option.swatch_url,
      description: option.description ?? "",
      promptDescriptor: option.prompt_descriptor ?? "",
      isDefault: option.is_default,
    });
  }, [
    option.id,
    option.name,
    option.price,
    option.swatch_color,
    option.nudge,
    option.swatch_url,
    option.description,
    option.prompt_descriptor,
    option.is_default,
  ]);

  const buildUpdates = () => {
    const updates: Record<string, unknown> = {};
    const normalizedName = draft.name.trim() || option.name;
    const parsedPrice = Number.parseInt(draft.price, 10);
    const normalizedPrice = Number.isFinite(parsedPrice) ? parsedPrice : option.price;
    const normalizedSwatchColor = draft.swatchColor.trim() || null;
    const normalizedNudge = draft.nudge.trim() || null;
    const normalizedDescription = draft.description.trim() || null;
    const normalizedPromptDescriptor = draft.promptDescriptor.trim() || null;
    const normalizedSwatchUrl = draft.swatchUrl || null;

    if (normalizedName !== option.name) updates.name = normalizedName;
    if (normalizedPrice !== option.price) updates.price = normalizedPrice;
    if (normalizedSwatchColor !== (option.swatch_color ?? null)) updates.swatch_color = normalizedSwatchColor;
    if (normalizedNudge !== (option.nudge ?? null)) updates.nudge = normalizedNudge;
    if (normalizedDescription !== (option.description ?? null)) updates.description = normalizedDescription;
    if (normalizedPromptDescriptor !== (option.prompt_descriptor ?? null)) updates.prompt_descriptor = normalizedPromptDescriptor;
    if (normalizedSwatchUrl !== (option.swatch_url ?? null)) updates.swatch_url = normalizedSwatchUrl;
    if (draft.isDefault !== option.is_default) updates.is_default = draft.isDefault;

    return updates;
  };

  const hasChanges = Object.keys(buildUpdates()).length > 0;

  const requestClose = () => {
    if (saving) return;
    if (hasChanges && !confirm("Discard unsaved changes?")) return;
    onClose();
  };

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saving, hasChanges, onClose]);

  const handleGenerateDescriptor = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/generate-descriptor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: orgId,
          option_name: draft.name.trim() || option.name,
          option_description: draft.description.trim() || undefined,
          subcategory_name: subcategoryName,
          category_name: categoryName,
        }),
      });
      const data = await res.json();
      if (data.descriptor) {
        setDraft((prev) => ({ ...prev, promptDescriptor: String(data.descriptor).trim() }));
      }
    } catch {
      console.error("Failed to generate descriptor");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    const updates = buildUpdates();
    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await onSaveOption(updates);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      <button
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]"
        onClick={requestClose}
        aria-label="Close editor"
      />
      <div className="relative z-[71] flex max-h-[calc(100vh-2.5rem)] w-full max-w-3xl flex-col overflow-hidden border border-slate-300 bg-white shadow-xl animate-fade-slide-in">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold">Edit Option</p>
            <p className="mt-1 truncate text-lg font-semibold text-slate-900">{draft.name || option.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={requestClose}
              className="inline-flex items-center justify-center p-1 text-slate-500 hover:text-slate-900"
              title="Close editor"
              aria-label="Close editor"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5">
          <OptionDetailPanel
            option={option}
            orgId={orgId}
            draft={draft}
            setDraft={setDraft}
            generating={generating}
            onGenerateDescriptor={handleGenerateDescriptor}
          />
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (confirm(`Delete "${option.name}"?`)) {
                  await onDelete(option.id);
                  onClose();
                }
              }}
              className="inline-flex items-center gap-1 border border-red-200 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
              title="Delete option"
              aria-label={`Delete ${option.name}`}
              disabled={saving || generating}
            >
              <span>Delete</span>
            </button>
            {!draft.promptDescriptor.trim() && (
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200">not ready</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={requestClose}
              disabled={saving}
              className="border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:border-slate-400 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || saving || generating}
              className="border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Option Detail Panel ----------

function OptionDetailPanel({
  option,
  orgId,
  draft,
  setDraft,
  generating,
  onGenerateDescriptor,
}: {
  option: AdminOption;
  orgId: string;
  draft: {
    name: string;
    price: string;
    swatchColor: string;
    nudge: string;
    swatchUrl: string | null;
    description: string;
    promptDescriptor: string;
    isDefault: boolean;
  };
  setDraft: React.Dispatch<React.SetStateAction<{
    name: string;
    price: string;
    swatchColor: string;
    nudge: string;
    swatchUrl: string | null;
    description: string;
    promptDescriptor: string;
    isDefault: boolean;
  }>>;
  generating: boolean;
  onGenerateDescriptor: () => Promise<void>;
}) {
  return (
    <div className="space-y-4 text-sm text-slate-900">
      <div className="border border-slate-200 bg-slate-50 p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Core Fields</p>
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <div>
            <span className="block text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-1">Name</span>
            <input
              value={draft.name}
              onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full bg-white border border-slate-300 text-slate-900 text-sm px-2.5 py-2 focus:outline-none focus:border-slate-500"
            />
          </div>
          <div>
            <span className="block text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-1">Price</span>
            <input
              type="number"
              value={draft.price}
              onChange={(e) => setDraft((prev) => ({ ...prev, price: e.target.value }))}
              className="w-full bg-white border border-slate-300 text-slate-900 text-sm px-2.5 py-2 focus:outline-none focus:border-slate-500"
            />
          </div>
          <div>
            <span className="block text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-1">Swatch color</span>
            <input
              value={draft.swatchColor}
              onChange={(e) => setDraft((prev) => ({ ...prev, swatchColor: e.target.value }))}
              placeholder="#hex"
              className="w-full bg-white border border-slate-300 text-slate-900 text-sm px-2.5 py-2 focus:outline-none focus:border-slate-500"
            />
          </div>
          <div>
            <span className="block text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-1">Nudge</span>
            <input
              value={draft.nudge}
              onChange={(e) => setDraft((prev) => ({ ...prev, nudge: e.target.value }))}
              placeholder="e.g. Most popular"
              className="w-full bg-white border border-slate-300 text-slate-900 text-sm px-2.5 py-2 focus:outline-none focus:border-slate-500"
            />
          </div>
        </div>
      </div>

      <div className="border border-slate-200 bg-slate-50 p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Swatch</p>
        <SwatchUpload
          orgId={orgId}
          optionId={option.id}
          currentUrl={draft.swatchUrl}
          onUploaded={(url) => setDraft((prev) => ({ ...prev, swatchUrl: url }))}
          onRemoved={() => setDraft((prev) => ({ ...prev, swatchUrl: null }))}
        />
      </div>

      <div className="border border-slate-200 bg-slate-50 p-4 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Descriptions</p>
        <div className="space-y-1">
          <span className="block text-[11px] uppercase tracking-[0.14em] text-slate-500">Description</span>
          <p className="text-xs leading-5 text-slate-500">
            General display copy for this option. Use this for readable context; it is different from the AI prompt descriptor below.
          </p>
        </div>
        <textarea
          value={draft.description}
          onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
          rows={2}
          placeholder="Optional description..."
          className="w-full resize-none bg-white border border-slate-300 text-slate-900 text-sm px-2.5 py-2 focus:outline-none focus:border-slate-500"
        />
        <div className="space-y-1">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Prompt descriptor</span>
          <p className="text-xs leading-5 text-slate-500">
            Internal AI hint used for image generation accuracy (material, finish, style). Buyers do not see this text.
          </p>
        </div>
        <div className="flex items-stretch gap-2">
          <div className="flex-1">
            <input
              value={draft.promptDescriptor}
              onChange={(e) => setDraft((prev) => ({ ...prev, promptDescriptor: e.target.value }))}
              placeholder="AI descriptor for image generation..."
              className="w-full bg-white border border-slate-300 text-slate-900 text-sm px-2.5 py-2 focus:outline-none focus:border-slate-500"
            />
          </div>
          <button
            onClick={onGenerateDescriptor}
            disabled={generating}
            className="self-stretch shrink-0 border border-slate-300 bg-white px-3 text-[11px] font-medium text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>

      <div className="border border-slate-200 bg-slate-50 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.isDefault}
            onChange={(e) => setDraft((prev) => ({ ...prev, isDefault: e.target.checked }))}
            className="accent-[var(--color-navy)]"
          />
          Default (included)
        </label>
        <div className="text-slate-500 text-xs">
          Slug: <span className="font-mono text-slate-700">{option.slug}</span>
        </div>
      </div>
    </div>
  );
}

// ---------- Add Item Forms ----------

function AddItemForm({
  placeholder,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  onSubmit: (name: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2 mb-2">
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onSubmit(name.trim()); if (e.key === "Escape") onCancel(); }}
        placeholder={placeholder}
        autoFocus
        className="flex-1 bg-neutral-800 border border-neutral-600 text-white text-sm px-2 py-1.5 focus:outline-none focus:border-neutral-400"
      />
      <button
        onClick={() => { if (name.trim()) onSubmit(name.trim()); }}
        disabled={!name.trim()}
        className="px-3 py-1.5 text-xs text-white bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-50"
      >
        Add
      </button>
      <button onClick={onCancel} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors">
        Cancel
      </button>
    </div>
  );
}

function AddOptionForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (name: string, price: number) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");

  const handleSubmit = () => {
    if (name.trim()) {
      onSubmit(name.trim(), parseInt(price, 10) || 0);
    }
  };

  return (
    <div className="mb-2 border border-neutral-700 bg-neutral-900/70 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") onCancel(); }}
        placeholder="Option name..."
        autoFocus
        className="flex-1 bg-neutral-800 border border-neutral-600 text-white text-sm px-2 py-1.5 focus:outline-none focus:border-neutral-400"
      />
      <div className="flex items-center gap-0.5">
        <span className="text-neutral-500 text-sm">$</span>
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") onCancel(); }}
          type="number"
          className="w-20 bg-neutral-800 border border-neutral-600 text-white text-sm px-2 py-1.5 text-right font-mono focus:outline-none focus:border-neutral-400"
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={!name.trim()}
        className="px-3 py-1.5 text-xs text-white bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-50"
      >
        Add
      </button>
      <button onClick={onCancel} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors">
        Cancel
      </button>
      </div>
    </div>
  );
}
