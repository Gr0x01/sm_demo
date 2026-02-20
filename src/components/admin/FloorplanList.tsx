"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Upload, ImageIcon, X, ArrowRight, Search } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

interface FloorplanItem {
  id: string;
  name: string;
  slug: string;
  community: string | null;
  is_active: boolean;
  cover_image_path: string | null;
  created_at: string | null;
  step_count: number;
  photo_count: number;
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

function formatCreatedDate(value: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest("a,button,input,textarea,select,label,[role='button'],[data-no-row-nav='true']");
}

function mergeFloorplanState(
  incoming: Partial<FloorplanItem> & { id: string },
  fallback?: FloorplanItem
): FloorplanItem {
  return {
    id: incoming.id,
    name: incoming.name ?? fallback?.name ?? "Untitled Floorplan",
    slug: incoming.slug ?? fallback?.slug ?? "",
    community: incoming.community ?? fallback?.community ?? null,
    is_active: incoming.is_active ?? fallback?.is_active ?? false,
    cover_image_path: incoming.cover_image_path ?? fallback?.cover_image_path ?? null,
    created_at: incoming.created_at ?? fallback?.created_at ?? null,
    step_count: incoming.step_count ?? fallback?.step_count ?? 0,
    photo_count: incoming.photo_count ?? fallback?.photo_count ?? 0,
  };
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
              data-no-row-nav="true"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              className="text-white/80 hover:text-white p-1"
              title="Replace cover"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
            <button
              data-no-row-nav="true"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="text-white/80 hover:text-white p-1"
              title="Remove cover"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
                e.target.value = "";
              }}
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
    <div
      data-no-row-nav="true"
      className="relative w-24 shrink-0 aspect-[16/10] bg-slate-50 border border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-slate-400 transition-colors"
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
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
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
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [coverCacheBust, setCoverCacheBust] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const handleAdd = useCallback(async () => {
    if (!addName.trim()) return;
    setAdding(true);
    try {
      const data = await apiCall("/api/admin/floorplans", "POST", {
        org_id: orgId,
        name: addName.trim(),
        community: addCommunity.trim() || undefined,
      });
      setFloorplans((prev) => [...prev, mergeFloorplanState(data)]);
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

  const handleToggleActive = useCallback(async (fp: FloorplanItem) => {
    try {
      const data = await apiCall(`/api/admin/floorplans/${fp.id}`, "PATCH", {
        org_id: orgId,
        is_active: !fp.is_active,
      });
      setFloorplans((prev) =>
        prev.map((current) => (current.id === fp.id ? mergeFloorplanState(data, current) : current))
      );
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to toggle");
    }
  }, [orgId, router]);

  const handleCoverUpload = useCallback(async (fp: FloorplanItem, file: File) => {
    if (!file.type.startsWith("image/")) return;
    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
      alert("Cover image must be under 5 MB.");
      return;
    }
    setUploadingId(fp.id);
    try {
      const supabase = createSupabaseBrowser();
      const ext = file.name.split(".").pop() || "jpg";
      const storagePath = `${orgId}/floorplans/${fp.id}.${ext}`;

      if (fp.cover_image_path && fp.cover_image_path !== storagePath) {
        await supabase.storage.from("rooms").remove([fp.cover_image_path]).catch(() => {});
      }

      const { error: uploadError } = await supabase.storage
        .from("rooms")
        .upload(storagePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const data = await apiCall(`/api/admin/floorplans/${fp.id}`, "PATCH", {
        org_id: orgId,
        cover_image_path: storagePath,
      });
      setFloorplans((prev) =>
        prev.map((current) => (current.id === fp.id ? mergeFloorplanState(data, current) : current))
      );
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
      const data = await apiCall(`/api/admin/floorplans/${fp.id}`, "PATCH", {
        org_id: orgId,
        cover_image_path: null,
      });
      setFloorplans((prev) =>
        prev.map((current) => (current.id === fp.id ? mergeFloorplanState(data, current) : current))
      );

      const supabase = createSupabaseBrowser();
      await supabase.storage.from("rooms").remove([fp.cover_image_path]).catch(() => {});
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove cover");
    } finally {
      setUploadingId(null);
    }
  }, [orgId, router]);

  const filteredFloorplans = floorplans.filter((fp) => {
    if (statusFilter === "active" && !fp.is_active) return false;
    if (statusFilter === "inactive" && fp.is_active) return false;
    if (!searchQuery.trim()) return true;
    const needle = searchQuery.toLowerCase();
    return fp.name.toLowerCase().includes(needle) || (fp.community ?? "").toLowerCase().includes(needle);
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
        <p className="text-xs text-slate-500">
          Click a floorplan row to open setup. Edit and delete actions are inside the floorplan page.
        </p>
        <div className="flex items-center gap-2">
          <label className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-slate-300 pl-7 pr-2 py-1 text-xs text-slate-900 min-w-44"
              placeholder="Search floorplans"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
            className="bg-white border border-slate-300 px-2 py-1 text-xs text-slate-900"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {filteredFloorplans.map((fp) => {
        const isUploading = uploadingId === fp.id;
        const coverSrc = fp.cover_image_path
          ? `${getCoverUrl(supabaseUrl, fp.cover_image_path)}?t=${coverCacheBust[fp.id] || ""}`
          : null;
        const detailHref = `/admin/${orgSlug}/floorplans/${fp.id}`;

        return (
          <div
            key={fp.id}
            className="bg-slate-50 border border-slate-200 p-4 flex gap-4 hover:border-slate-300 transition-colors cursor-pointer"
            role="link"
            tabIndex={0}
            onClick={(e) => {
              if (isInteractiveTarget(e.target)) return;
              router.push(detailHref);
            }}
            onKeyDown={(e) => {
              if (isInteractiveTarget(e.target)) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(detailHref);
              }
            }}
          >
            <CoverImageCell
              coverSrc={coverSrc}
              isUploading={isUploading}
              isAdmin={isAdmin}
              onUpload={(file) => handleCoverUpload(fp, file)}
              onRemove={() => handleCoverRemove(fp)}
            />

            <div className="flex-1 min-w-0 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{fp.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  <span className="bg-slate-200/70 px-2 py-0.5">
                    Community: {fp.community || "Not set"}
                  </span>
                  <span className="bg-slate-200/70 px-2 py-0.5">Steps: {fp.step_count}</span>
                  <span className="bg-slate-200/70 px-2 py-0.5">Photos: {fp.photo_count}</span>
                  <span className="bg-slate-200/70 px-2 py-0.5">Created: {formatCreatedDate(fp.created_at)}</span>
                </div>
              </div>

              <button
                data-no-row-nav="true"
                onClick={() => handleToggleActive(fp)}
                className={`text-xs px-2 py-0.5 border transition-colors ${
                  fp.is_active
                    ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                    : "border-slate-300 text-slate-500 hover:bg-slate-100"
                }`}
              >
                {fp.is_active ? "Active" : "Inactive"}
              </button>

              <Link
                data-no-row-nav="true"
                href={detailHref}
                className="text-xs text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 px-2.5 py-1 inline-flex items-center gap-1"
              >
                Open setup
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        );
      })}

      {filteredFloorplans.length === 0 && (
        <div className="bg-slate-50 border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
          No floorplans match your filters.
        </div>
      )}

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
