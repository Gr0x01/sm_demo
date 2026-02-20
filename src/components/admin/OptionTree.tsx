"use client";

import { useState, useCallback, useRef, memo } from "react";
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2, Pencil, Check, X, Sparkles, Loader2 } from "lucide-react";
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

interface OptionTreeProps {
  categories: AdminCategory[];
  orgId: string;
  orgSlug: string;
  isAdmin: boolean;
  floorplans: { id: string; name: string }[];
}

export function OptionTree({ categories: initialCategories, orgId, orgSlug, isAdmin, floorplans }: OptionTreeProps) {
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
            className="px-3 py-1.5 text-xs text-white bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 transition-colors flex items-center gap-1 ml-auto"
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

      {/* Tree */}
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
        <div className="border-t border-neutral-800/50">
          {showAddOption && (
            <div className="ml-6 px-3 py-2">
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
            <SortableContext items={subcategory.options.map((o) => o.id)} strategy={verticalListSortingStrategy}>
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
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceValue, setPriceValue] = useState(String(option.price));
  const [saving, setSaving] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSavePrice = async () => {
    const newPrice = parseInt(priceValue, 10);
    if (!isNaN(newPrice) && newPrice !== option.price) {
      setSaving(true);
      try {
        await onUpdate(option.id, { price: newPrice });
      } catch (err) {
        console.error("Price save failed:", err);
      } finally {
        setSaving(false);
      }
    }
    setEditingPrice(false);
  };

  const handleSaveField = async (field: string, value: unknown) => {
    setSaving(true);
    try {
      await onUpdate(option.id, { [field]: value });
    } catch (err) {
      console.error("Field save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="ml-6 border-l border-neutral-800/50">
      <div className="flex items-center gap-3 px-3 py-1.5 hover:bg-neutral-800/20 transition-colors">
        {isAdmin && (
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="w-3 h-3 text-neutral-700" />
          </div>
        )}

        {/* Swatch preview */}
        <div
          className="w-7 h-7 shrink-0 border border-neutral-700 overflow-hidden bg-neutral-800 cursor-pointer"
          onClick={() => setIsDetailExpanded(!isDetailExpanded)}
        >
          {option.swatch_url ? (
            <img src={option.swatch_url} alt="" className="w-full h-full object-cover" />
          ) : option.swatch_color ? (
            <div className="w-full h-full" style={{ backgroundColor: option.swatch_color }} />
          ) : (
            <div className="w-full h-full bg-neutral-800" />
          )}
        </div>

        {/* Name */}
        <span
          className="text-sm text-neutral-300 truncate min-w-0 flex-1 cursor-pointer"
          onClick={() => setIsDetailExpanded(!isDetailExpanded)}
        >
          {option.name}
          {option.is_default && (
            <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-green-900/30 text-green-400 border border-green-800/50">default</span>
          )}
          {option.nudge && (
            <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-blue-900/30 text-blue-400 border border-blue-800/50">{option.nudge}</span>
          )}
        </span>

        {/* Price — click to edit */}
        {editingPrice ? (
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-sm text-neutral-500">$</span>
            <input
              value={priceValue}
              onChange={(e) => setPriceValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSavePrice(); if (e.key === "Escape") setEditingPrice(false); }}
              autoFocus
              className="w-20 bg-neutral-800 border border-neutral-600 text-white text-sm px-1.5 py-0.5 font-mono text-right focus:outline-none focus:border-neutral-400"
            />
            <button onClick={handleSavePrice} className="text-green-400 hover:text-green-300"><Check className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <span
            className={`text-sm font-mono tabular-nums shrink-0 cursor-pointer hover:text-white ${option.price === 0 ? "text-green-500" : "text-neutral-300"}`}
            onClick={() => { if (isAdmin) { setPriceValue(String(option.price)); setEditingPrice(true); } }}
          >
            {option.price === 0 ? "Included" : `$${option.price.toLocaleString()}`}
          </span>
        )}

        {/* Descriptor indicator */}
        {option.prompt_descriptor ? (
          <span className="text-[10px] text-neutral-500 shrink-0" title={option.prompt_descriptor}>AI</span>
        ) : (
          <span className="text-[10px] text-neutral-700 shrink-0">--</span>
        )}

        {isAdmin && (
          <button
            onClick={() => { if (confirm(`Delete "${option.name}"?`)) onDelete(option.id); }}
            className="text-neutral-700 hover:text-red-400 p-1 shrink-0"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Detail panel */}
      {isDetailExpanded && isAdmin && (
        <OptionDetailPanel option={option} orgId={orgId} categoryName={categoryName} subcategoryName={subcategoryName} onSave={handleSaveField} saving={saving} />
      )}
    </div>
  );
});

// ---------- Option Detail Panel ----------

function OptionDetailPanel({
  option,
  orgId,
  categoryName,
  subcategoryName,
  onSave,
  saving,
}: {
  option: AdminOption;
  orgId: string;
  categoryName: string;
  subcategoryName: string;
  onSave: (field: string, value: unknown) => Promise<void>;
  saving: boolean;
}) {
  const [generating, setGenerating] = useState(false);

  const handleGenerateDescriptor = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/generate-descriptor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: orgId,
          option_name: option.name,
          option_description: option.description || undefined,
          subcategory_name: subcategoryName,
          category_name: categoryName,
        }),
      });
      const data = await res.json();
      if (data.descriptor) {
        await onSave("prompt_descriptor", data.descriptor);
      }
    } catch {
      console.error("Failed to generate descriptor");
    } finally {
      setGenerating(false);
    }
  };
  return (
    <div className="ml-10 mr-3 mb-2 p-3 bg-neutral-900 border border-neutral-800 space-y-3 text-xs">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <EditableField label="Name" value={option.name} onSave={(v) => onSave("name", v)} />
        <EditableField label="Price" value={String(option.price)} onSave={(v) => onSave("price", parseInt(v, 10))} type="number" />
        <EditableField label="Swatch color" value={option.swatch_color ?? ""} onSave={(v) => onSave("swatch_color", v || null)} placeholder="#hex" />
        <EditableField label="Nudge" value={option.nudge ?? ""} onSave={(v) => onSave("nudge", v || null)} placeholder="e.g. Most popular" />
      </div>

      {/* Swatch upload */}
      <div>
        <span className="text-neutral-500 block mb-1">Swatch image</span>
        <SwatchUpload
          orgId={orgId}
          optionId={option.id}
          currentUrl={option.swatch_url}
          onUploaded={(url) => onSave("swatch_url", url)}
          onRemoved={() => onSave("swatch_url", null)}
        />
      </div>

      <EditableField label="Description" value={option.description ?? ""} onSave={(v) => onSave("description", v || null)} multiline placeholder="Optional description..." />
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-neutral-500">Prompt descriptor</span>
          <button
            onClick={handleGenerateDescriptor}
            disabled={generating}
            className="text-[10px] px-1.5 py-0.5 bg-purple-900/30 text-purple-400 border border-purple-800/50 hover:bg-purple-900/50 transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {generating ? "Generating..." : "AI Generate"}
          </button>
        </div>
        <EditableField label="" value={option.prompt_descriptor ?? ""} onSave={(v) => onSave("prompt_descriptor", v || null)} multiline placeholder="AI descriptor for image generation..." />
      </div>

      <div className="flex items-center gap-4 pt-1">
        <label className="flex items-center gap-2 text-neutral-400 cursor-pointer">
          <input
            type="checkbox"
            checked={option.is_default}
            onChange={(e) => onSave("is_default", e.target.checked)}
            className="accent-green-500"
          />
          Default (included)
        </label>
      </div>

      <div className="text-neutral-600 pt-1">
        Slug: <span className="font-mono">{option.slug}</span>
      </div>
    </div>
  );
}

// ---------- Editable Field ----------

function EditableField({
  label,
  value,
  onSave,
  type = "text",
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onSave: (value: string) => Promise<void>;
  type?: string;
  multiline?: boolean;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = useCallback(async () => {
    try {
      if (editValue !== value) {
        await onSave(editValue);
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setEditing(false);
    }
  }, [editValue, value, onSave]);

  if (editing) {
    const inputProps = {
      value: editValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEditValue(e.target.value),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !multiline) {
          (e.currentTarget as HTMLElement).blur(); // triggers onBlur -> handleSave (single path)
        }
        if (e.key === "Escape") { setEditValue(value); setEditing(false); }
      },
      onBlur: handleSave,
      autoFocus: true,
      placeholder,
      className: "w-full bg-neutral-800 border border-neutral-600 text-white text-xs px-2 py-1 focus:outline-none focus:border-neutral-400",
    };

    return (
      <div>
        <span className="text-neutral-500 block mb-1">{label}</span>
        {multiline ? (
          <textarea {...inputProps} rows={2} />
        ) : (
          <input {...inputProps} type={type} />
        )}
      </div>
    );
  }

  return (
    <div className="cursor-pointer group" onClick={() => { setEditValue(value); setEditing(true); }}>
      <span className="text-neutral-500">{label}</span>
      <span className="ml-2 text-neutral-300 group-hover:text-white transition-colors">
        {value || <span className="text-neutral-600 italic">{placeholder || "empty"}</span>}
      </span>
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
        className="px-3 py-1.5 text-xs text-white bg-neutral-700 hover:bg-neutral-600 transition-colors disabled:opacity-50"
      >
        Add
      </button>
      <button onClick={onCancel} className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors">
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
    <div className="flex items-center gap-2 mb-2">
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
        className="px-3 py-1.5 text-xs text-white bg-neutral-700 hover:bg-neutral-600 transition-colors disabled:opacity-50"
      >
        Add
      </button>
      <button onClick={onCancel} className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors">
        Cancel
      </button>
    </div>
  );
}
