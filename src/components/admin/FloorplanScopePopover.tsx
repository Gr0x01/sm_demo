"use client";

import { useState, useEffect, useRef } from "react";
import { Target } from "lucide-react";

interface FloorplanScopePopoverProps {
  orgId: string;
  level: "category" | "subcategory" | "option";
  entityId: string;
  floorplans: { id: string; name: string }[];
  inheritedFrom?: string; // e.g. "Category: CABINETS"
}

export function FloorplanScopePopover({
  orgId,
  level,
  entityId,
  floorplans,
  inheritedFrom,
}: FloorplanScopePopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Reset loaded state when entity changes
  useEffect(() => {
    setLoaded(false);
    setSelectedIds(new Set());
  }, [entityId]);

  // Load current scopes when opened
  useEffect(() => {
    if (!open || loaded) return;
    setLoading(true);
    fetch(`/api/admin/scope?level=${level}&entity_ids=${entityId}&org_id=${orgId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Load failed");
        return r.json();
      })
      .then((data) => {
        const ids = (data.scopes ?? []).map((s: Record<string, string>) => s.floorplan_id);
        setSelectedIds(new Set(ids));
        setLoaded(true);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, loaded, level, entityId, orgId]);

  const handleToggle = (fpId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(fpId)) next.delete(fpId); else next.add(fpId);
      return next;
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: orgId,
          level,
          entity_id: entityId,
          floorplan_ids: Array.from(selectedIds),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setOpen(false);
    } catch (err) {
      console.error("Scope save failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const isAllFloorplans = selectedIds.size === 0;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className={`p-1 transition-colors ${
          isAllFloorplans && loaded
            ? "text-neutral-600 hover:text-neutral-400"
            : loaded
              ? "text-amber-500 hover:text-amber-400"
              : "text-neutral-600 hover:text-neutral-400"
        }`}
        title="Floorplan scope"
      >
        <Target className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute z-50 top-full right-0 mt-1 w-56 bg-neutral-900 border border-neutral-700 shadow-lg p-3 space-y-2">
          <p className="text-xs text-neutral-400 font-medium">Floorplan scope</p>

          {loading ? (
            <p className="text-xs text-neutral-500">Loading...</p>
          ) : (
            <>
              {inheritedFrom && isAllFloorplans && (
                <p className="text-[10px] text-neutral-500 italic">
                  Inherits from: {inheritedFrom}
                </p>
              )}

              <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAllFloorplans}
                  onChange={() => setSelectedIds(new Set())}
                  className="accent-white"
                />
                All floorplans
              </label>

              <div className="border-t border-neutral-800 pt-1 space-y-1">
                {floorplans.map((fp) => (
                  <label key={fp.id} className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(fp.id)}
                      onChange={() => handleToggle(fp.id)}
                      className="accent-white"
                    />
                    {fp.name}
                  </label>
                ))}
              </div>

              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full px-2 py-1.5 text-xs text-white bg-neutral-700 hover:bg-neutral-600 transition-colors disabled:opacity-50"
              >
                Save
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
