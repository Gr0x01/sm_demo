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
        <div key={idx} className="bg-slate-50 border border-slate-200 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={section.title}
              onChange={(e) => updateTitle(idx, e.target.value)}
              className="bg-white border border-slate-300 px-2 py-1 text-sm text-slate-900 flex-1"
              placeholder="Section title"
            />
            <button onClick={() => removeSection(idx)} className="text-slate-500 hover:text-red-600 p-1">
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
                  className="inline-flex items-center gap-1 bg-slate-200 text-xs text-slate-700 px-2 py-0.5"
                >
                  {sub?.name || subId}
                  <button
                    onClick={() => removeSubcategory(idx, subId)}
                    className="text-slate-500 hover:text-red-600"
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
                className="bg-white border border-slate-300 px-2 py-1 text-sm text-slate-900 w-full"
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
                <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 max-h-48 overflow-y-auto shadow-sm">
                  {filteredSubs.slice(0, 20).map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => addSubcategory(idx, sub.id)}
                      className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    >
                      {sub.name}
                      <span className="text-xs text-slate-500 ml-2">{sub.categoryName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection !== idx && (
            <button
              onClick={() => { setActiveSection(idx); setSearchQuery(""); }}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              + Add subcategory
            </button>
          )}
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button
          onClick={addSection}
          className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
        >
          <Plus className="w-3.5 h-3.5" /> Add section
        </button>

        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-slate-900 text-white px-3 py-1 text-xs font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
            Save sections
          </button>
        )}
      </div>
    </div>
  );
}
