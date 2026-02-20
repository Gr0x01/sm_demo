"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import type { AdminStepSection } from "@/types";

interface SubcategoryOption {
  id: string;
  name: string;
  categoryName: string;
}

interface StepSectionEditorProps {
  stepId: string;
  orgId: string;
  sections: AdminStepSection[];
  allSubcategories: SubcategoryOption[];
  onSave: (sections: AdminStepSection[]) => Promise<void> | void;
  saving: boolean;
}

export function StepSectionEditor({
  sections: initialSections,
  allSubcategories,
  onSave,
  saving,
}: StepSectionEditorProps) {
  const [sections, setSections] = useState<AdminStepSection[]>(initialSections);
  const [dirty, setDirty] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState<number | null>(null);

  // Resync from parent when server data changes (e.g. after save round-trip)
  useEffect(() => {
    if (!dirty) {
      setSections(initialSections);
    }
  }, [initialSections, dirty]);

  const addSection = useCallback(() => {
    const next = [...sections, { title: "", subcategory_ids: [], sort_order: sections.length }];
    setSections(next);
    setDirty(true);
    setActiveSection(next.length - 1);
  }, [sections]);

  const removeSection = useCallback((idx: number) => {
    const next = sections.filter((_, i) => i !== idx).map((s, i) => ({ ...s, sort_order: i }));
    setSections(next);
    setDirty(true);
    if (activeSection === idx) setActiveSection(null);
  }, [sections, activeSection]);

  const updateTitle = useCallback((idx: number, title: string) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, title } : s)));
    setDirty(true);
  }, []);

  const addSubcategory = useCallback((sectionIdx: number, subId: string) => {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIdx && !s.subcategory_ids.includes(subId)
          ? { ...s, subcategory_ids: [...s.subcategory_ids, subId] }
          : s
      )
    );
    setDirty(true);
    setSearchQuery("");
  }, []);

  const removeSubcategory = useCallback((sectionIdx: number, subId: string) => {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIdx ? { ...s, subcategory_ids: s.subcategory_ids.filter((id) => id !== subId) } : s
      )
    );
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await onSave(sections);
      setDirty(false);
    } catch {
      // Save failed — keep dirty so user can retry
    }
  }, [sections, onSave]);

  // All assigned subcategory IDs (across all sections)
  const assignedIds = new Set(sections.flatMap((s) => s.subcategory_ids));

  // Filter available subcategories for the search
  const filteredSubs = allSubcategories.filter(
    (sub) =>
      !assignedIds.has(sub.id) &&
      (sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.categoryName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-3">
      {sections.map((section, idx) => (
        <div key={idx} className="bg-neutral-800 border border-neutral-700 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={section.title}
              onChange={(e) => updateTitle(idx, e.target.value)}
              className="bg-neutral-900 border border-neutral-600 px-2 py-1 text-sm text-white flex-1"
              placeholder="Section title"
            />
            <button onClick={() => removeSection(idx)} className="text-neutral-400 hover:text-red-400 p-1">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Assigned subcategories */}
          <div className="flex flex-wrap gap-1.5">
            {section.subcategory_ids.map((subId) => {
              const sub = allSubcategories.find((s) => s.id === subId);
              return (
                <span
                  key={subId}
                  className="inline-flex items-center gap-1 bg-neutral-700 text-xs text-neutral-200 px-2 py-0.5"
                >
                  {sub?.name || subId}
                  <button
                    onClick={() => removeSubcategory(idx, subId)}
                    className="text-neutral-400 hover:text-red-400"
                  >
                    <span className="text-xs">&times;</span>
                  </button>
                </span>
              );
            })}
          </div>

          {/* Add subcategory search */}
          {activeSection === idx && (
            <div className="relative">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-neutral-900 border border-neutral-600 px-2 py-1 text-sm text-white w-full"
                placeholder="Search subcategories..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setActiveSection(null);
                    setSearchQuery("");
                  }
                }}
              />
              {searchQuery && filteredSubs.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-neutral-800 border border-neutral-700 max-h-48 overflow-y-auto">
                  {filteredSubs.slice(0, 20).map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => addSubcategory(idx, sub.id)}
                      className="w-full text-left px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white"
                    >
                      {sub.name}
                      <span className="text-xs text-neutral-500 ml-2">{sub.categoryName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection !== idx && (
            <button
              onClick={() => { setActiveSection(idx); setSearchQuery(""); }}
              className="text-xs text-neutral-500 hover:text-neutral-300"
            >
              + Add subcategory
            </button>
          )}
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button
          onClick={addSection}
          className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white"
        >
          <Plus className="w-3.5 h-3.5" /> Add section
        </button>

        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-white text-black px-3 py-1 text-xs font-medium hover:bg-neutral-200 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
            Save sections
          </button>
        )}
      </div>
    </div>
  );
}
