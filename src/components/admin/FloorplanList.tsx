"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, Check, X, Loader2 } from "lucide-react";
// Subset of FloorplanItem returned by getFloorplanItems query
interface FloorplanItem {
  id: string;
  name: string;
  slug: string;
  community: string | null;
  is_active: boolean;
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

interface FloorplanListProps {
  floorplans: FloorplanItem[];
  orgId: string;
  orgSlug: string;
  isAdmin: boolean;
}

export function FloorplanList({ floorplans: initial, orgId, orgSlug, isAdmin }: FloorplanListProps) {
  const router = useRouter();
  const [floorplans, setFloorplans] = useState(initial);
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addCommunity, setAddCommunity] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCommunity, setEditCommunity] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = useCallback(async () => {
    if (!addName.trim()) return;
    setAdding(true);
    try {
      const data = await apiCall("/api/admin/floorplans", "POST", {
        org_id: orgId,
        name: addName.trim(),
        community: addCommunity.trim() || undefined,
      });
      setFloorplans((prev) => [...prev, data]);
      setAddName("");
      setAddCommunity("");
      setShowAdd(false);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create floorplan");
    } finally {
      setAdding(false);
    }
  }, [addName, addCommunity, orgId, router]);

  const handleUpdate = useCallback(async (fp: FloorplanItem) => {
    setSaving(true);
    try {
      const data = await apiCall(`/api/admin/floorplans/${fp.id}`, "PATCH", {
        org_id: orgId,
        name: editName.trim() || fp.name,
        community: editCommunity.trim() || null,
      });
      setFloorplans((prev) => prev.map((f) => (f.id === fp.id ? data : f)));
      setEditingId(null);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }, [editName, editCommunity, orgId, router]);

  const handleToggleActive = useCallback(async (fp: FloorplanItem) => {
    try {
      const data = await apiCall(`/api/admin/floorplans/${fp.id}`, "PATCH", {
        org_id: orgId,
        is_active: !fp.is_active,
      });
      setFloorplans((prev) => prev.map((f) => (f.id === fp.id ? data : f)));
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to toggle");
    }
  }, [orgId, router]);

  const handleDelete = useCallback(async (fp: FloorplanItem) => {
    if (!confirm(`Delete "${fp.name}"? This will remove all steps and photos.`)) return;
    setDeletingId(fp.id);
    try {
      await apiCall(`/api/admin/floorplans/${fp.id}`, "DELETE", { org_id: orgId });
      setFloorplans((prev) => prev.filter((f) => f.id !== fp.id));
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }, [orgId, router]);

  return (
    <div className="space-y-3">
      {floorplans.map((fp) => {
        const isEditing = editingId === fp.id;
        const isDeleting = deletingId === fp.id;

        return (
          <div
            key={fp.id}
            className="bg-neutral-900 border border-neutral-800 p-4 flex items-center gap-4"
          >
            {isEditing ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-neutral-800 border border-neutral-700 px-2 py-1 text-sm text-white flex-1"
                  placeholder="Name"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUpdate(fp);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
                <input
                  value={editCommunity}
                  onChange={(e) => setEditCommunity(e.target.value)}
                  className="bg-neutral-800 border border-neutral-700 px-2 py-1 text-sm text-white w-40"
                  placeholder="Community"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUpdate(fp);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
                <button
                  onClick={() => handleUpdate(fp)}
                  disabled={saving}
                  className="text-green-400 hover:text-green-300 p-1"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button onClick={() => setEditingId(null)} className="text-neutral-400 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/admin/${orgSlug}/floorplans/${fp.id}`}
                    className="text-sm font-medium text-white hover:text-blue-400 transition-colors"
                  >
                    {fp.name}
                  </Link>
                  {fp.community && (
                    <span className="text-xs text-neutral-500 ml-2">{fp.community}</span>
                  )}
                </div>

                <button
                  onClick={() => handleToggleActive(fp)}
                  className={`text-xs px-2 py-0.5 border transition-colors ${
                    fp.is_active
                      ? "border-green-800 text-green-400 hover:bg-green-900/30"
                      : "border-neutral-700 text-neutral-500 hover:bg-neutral-800"
                  }`}
                >
                  {fp.is_active ? "Active" : "Inactive"}
                </button>

                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingId(fp.id);
                        setEditName(fp.name);
                        setEditCommunity(fp.community || "");
                      }}
                      className="text-neutral-400 hover:text-white p-1"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(fp)}
                      disabled={isDeleting}
                      className="text-neutral-400 hover:text-red-400 p-1"
                    >
                      {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {isAdmin && (
        <>
          {showAdd ? (
            <div className="bg-neutral-900 border border-neutral-800 p-4 space-y-3">
              <div className="flex gap-2">
                <input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="bg-neutral-800 border border-neutral-700 px-2 py-1 text-sm text-white flex-1"
                  placeholder="Floorplan name"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                    if (e.key === "Escape") setShowAdd(false);
                  }}
                />
                <input
                  value={addCommunity}
                  onChange={(e) => setAddCommunity(e.target.value)}
                  className="bg-neutral-800 border border-neutral-700 px-2 py-1 text-sm text-white w-40"
                  placeholder="Community (optional)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                    if (e.key === "Escape") setShowAdd(false);
                  }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={adding || !addName.trim()}
                  className="bg-white text-black px-3 py-1 text-sm font-medium hover:bg-neutral-200 disabled:opacity-50"
                >
                  {adding ? "Creating..." : "Create"}
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  className="text-neutral-400 hover:text-white text-sm px-3 py-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              <Plus className="w-4 h-4" /> Add floorplan
            </button>
          )}
        </>
      )}
    </div>
  );
}
