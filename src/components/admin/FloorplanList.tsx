"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, Check, X, Loader2, Copy, Upload, ImageIcon } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

interface FloorplanItem {
  id: string;
  name: string;
  slug: string;
  community: string | null;
  is_active: boolean;
  cover_image_path: string | null;
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
  supabaseUrl: string;
}

function getCoverUrl(supabaseUrl: string, path: string) {
  return `${supabaseUrl}/storage/v1/object/public/rooms/${path}`;
}

function CoverImageCell({
  coverSrc,
  isUploading,
  isAdmin,
  onUpload,
  onRemove,
}: {
  coverSrc: string | null;
  isUploading: boolean;
  isAdmin: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (coverSrc) {
    return (
      <div className="relative w-24 shrink-0 aspect-[16/10] bg-slate-100 overflow-hidden border border-slate-200 group/cover">
        <img src={coverSrc} alt="" className="w-full h-full object-cover" />
        {isAdmin && !isUploading && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={() => inputRef.current?.click()}
              className="text-white/80 hover:text-white p-1"
              title="Replace"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRemove}
              className="text-white/80 hover:text-white p-1"
              title="Remove"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }}
              className="hidden"
            />
          </div>
        )}
        {isUploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          </div>
        )}
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="w-24 shrink-0 aspect-[16/10] bg-slate-100 border border-dashed border-slate-200 flex items-center justify-center">
        <ImageIcon className="w-4 h-4 text-slate-300" />
      </div>
    );
  }

  return (
    <div className="relative w-24 shrink-0 aspect-[16/10] bg-slate-50 border border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-slate-400 transition-colors"
      onClick={() => inputRef.current?.click()}
    >
      {isUploading ? (
        <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
      ) : (
        <Upload className="w-4 h-4 text-slate-400" />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }}
        className="hidden"
      />
    </div>
  );
}

export function FloorplanList({ floorplans: initial, orgId, orgSlug, isAdmin, supabaseUrl }: FloorplanListProps) {
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
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [coverCacheBust, setCoverCacheBust] = useState<Record<string, number>>({});

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

  const handleDuplicate = useCallback(async (fp: FloorplanItem) => {
    setDuplicatingId(fp.id);
    try {
      const data = await apiCall(`/api/admin/floorplans/${fp.id}/duplicate`, "POST", { org_id: orgId });
      setFloorplans((prev) => [...prev, data]);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to duplicate");
    } finally {
      setDuplicatingId(null);
    }
  }, [orgId, router]);

  const handleCoverUpload = useCallback(async (fp: FloorplanItem, file: File) => {
    if (!file.type.startsWith("image/")) return;
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      alert("Cover image must be under 5 MB.");
      return;
    }
    setUploadingId(fp.id);
    try {
      const supabase = createSupabaseBrowser();
      const ext = file.name.split(".").pop() || "jpg";
      const storagePath = `${orgId}/floorplans/${fp.id}.${ext}`;

      // Delete old file if path differs (e.g. extension changed)
      if (fp.cover_image_path && fp.cover_image_path !== storagePath) {
        await supabase.storage.from("rooms").remove([fp.cover_image_path]).catch(() => {});
      }

      const { error: uploadError } = await supabase.storage
        .from("rooms")
        .upload(storagePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      // Save path to DB
      const data = await apiCall(`/api/admin/floorplans/${fp.id}`, "PATCH", {
        org_id: orgId,
        cover_image_path: storagePath,
      });
      setFloorplans((prev) => prev.map((f) => (f.id === fp.id ? data : f)));
      setCoverCacheBust((prev) => ({ ...prev, [fp.id]: Date.now() }));
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingId(null);
    }
  }, [orgId, router]);

  const handleCoverRemove = useCallback(async (fp: FloorplanItem) => {
    if (!fp.cover_image_path) return;
    setUploadingId(fp.id);
    try {
      // Null the DB reference first — if this fails, the file is still intact
      const data = await apiCall(`/api/admin/floorplans/${fp.id}`, "PATCH", {
        org_id: orgId,
        cover_image_path: null,
      });
      setFloorplans((prev) => prev.map((f) => (f.id === fp.id ? data : f)));

      // Then delete the storage file (best-effort — orphan is harmless)
      const supabase = createSupabaseBrowser();
      await supabase.storage.from("rooms").remove([fp.cover_image_path]).catch(() => {});
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove cover");
    } finally {
      setUploadingId(null);
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
        const isUploading = uploadingId === fp.id;
        const isBusy = adding || saving || !!deletingId || !!duplicatingId;
        const coverSrc = fp.cover_image_path
          ? `${getCoverUrl(supabaseUrl, fp.cover_image_path)}?t=${coverCacheBust[fp.id] || ""}`
          : null;

        return (
          <div
            key={fp.id}
            className="bg-slate-50 border border-slate-200 p-4 flex gap-4"
          >
            {/* Cover image thumbnail */}
            <CoverImageCell
              coverSrc={coverSrc}
              isUploading={isUploading}
              isAdmin={isAdmin}
              onUpload={(file) => handleCoverUpload(fp, file)}
              onRemove={() => handleCoverRemove(fp)}
            />

            {/* Content */}
            <div className="flex-1 min-w-0 flex items-center gap-4">
              {isEditing ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-white border border-slate-300 px-2 py-1 text-sm text-slate-900 flex-1"
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
                    className="bg-white border border-slate-300 px-2 py-1 text-sm text-slate-900 w-40"
                    placeholder="Community"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdate(fp);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <button
                    onClick={() => handleUpdate(fp)}
                    disabled={saving}
                    className="text-emerald-700 hover:text-emerald-600 p-1"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-slate-900 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/admin/${orgSlug}/floorplans/${fp.id}`}
                      className="text-sm font-medium text-slate-900 hover:text-slate-700 transition-colors"
                    >
                      {fp.name}
                    </Link>
                    {fp.community && (
                      <span className="text-xs text-slate-500 ml-2">{fp.community}</span>
                    )}
                  </div>

                  <button
                    onClick={() => handleToggleActive(fp)}
                    className={`text-xs px-2 py-0.5 border transition-colors ${
                      fp.is_active
                        ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                        : "border-slate-300 text-slate-500 hover:bg-slate-100"
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
                        disabled={isBusy}
                        className="text-slate-500 hover:text-slate-900 p-1 disabled:opacity-40"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(fp)}
                        disabled={isBusy}
                        className="text-slate-500 hover:text-slate-900 p-1 disabled:opacity-40"
                        title="Duplicate"
                      >
                        {duplicatingId === fp.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDelete(fp)}
                        disabled={isBusy}
                        className="text-slate-500 hover:text-red-600 p-1 disabled:opacity-40"
                      >
                        {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}

      {isAdmin && (
        <>
          {showAdd ? (
            <div className="bg-slate-50 border border-slate-200 p-4 space-y-3">
              <div className="flex gap-2">
                <input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="bg-white border border-slate-300 px-2 py-1 text-sm text-slate-900 flex-1"
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
                  className="bg-white border border-slate-300 px-2 py-1 text-sm text-slate-900 w-40"
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
                  className="bg-slate-900 text-white px-3 py-1 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                >
                  {adding ? "Creating..." : "Create"}
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
              <Plus className="w-4 h-4" /> Add floorplan
            </button>
          )}
        </>
      )}
    </div>
  );
}
