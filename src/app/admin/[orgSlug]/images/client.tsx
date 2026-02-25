"use client";

import { useEffect, useState } from "react";

interface GeneratedImage {
  selections_hash: string;
  selections_json: Record<string, unknown>;
  image_path: string;
  prompt: string;
  created_at: string;
  publicUrl: string;
  intermediateImages?: Array<{
    id: string;
    label: string;
    path: string;
    publicUrl: string;
  }>;
}

export function AdminImagesClient({ orgId }: { orgId: string }) {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedHash, setExpandedHash] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  const fetchImages = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/images?org_id=${orgId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImages(data.images);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleDelete = async (image: GeneratedImage) => {
    if (!confirm("Delete this generated image?")) return;
    setDeleting((prev) => new Set(prev).add(image.selections_hash));
    try {
      const res = await fetch("/api/admin/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: orgId,
          selections_hash: image.selections_hash,
          image_path: image.image_path,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setImages((prev) =>
        prev.filter((i) => i.selections_hash !== image.selections_hash)
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(image.selections_hash);
        return next;
      });
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`Delete all ${images.length} generated images?`)) return;
    try {
      const res = await fetch("/api/admin/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: orgId, deleteAll: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setImages([]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete all failed");
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const renderSelections = (json: Record<string, unknown>) => {
    const entries = Object.entries(json).filter(([key]) => key !== "_debugPassArtifacts");
    if (!entries.length) return <span className="text-slate-500">None</span>;
    return (
      <ul className="space-y-1 text-sm">
        {entries.map(([key, value]) => (
          <li key={key} className="flex justify-between gap-4">
            <span className="text-slate-500 truncate">{key}</span>
            <span className="text-slate-800 font-medium truncate text-right">
              {typeof value === "string"
                ? value
                : typeof value === "number" || typeof value === "boolean"
                  ? String(value)
                  : JSON.stringify(value)}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl space-y-6">
        {/* Header */}
        <div className="border border-slate-200 bg-white/90 backdrop-blur px-5 py-5 md:px-6 md:py-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400 font-semibold">Media Cache</p>
              <h1 className="text-3xl leading-tight tracking-tight mt-2">
                Generated Images
              </h1>
              <p className="text-slate-600 text-sm mt-2">
                {loading
                  ? "Loading..."
                  : `${images.length} cached image${images.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchImages}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-100 transition-colors"
              >
                Refresh
              </button>
              {images.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium hover:bg-red-500 transition-colors"
                >
                  Delete All
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="border border-slate-200 bg-white px-4 py-4 md:px-5 md:py-5 shadow-sm">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Grid */}
          {!loading && images.length === 0 && !error && (
            <p className="text-slate-500 text-center py-20">
              No generated images found.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {images.map((image) => {
              const isExpanded = expandedHash === image.selections_hash;
              const isDeleting = deleting.has(image.selections_hash);

              return (
                <div
                  key={image.selections_hash}
                  className={`border border-slate-200 bg-white overflow-hidden shadow-sm ${
                    isDeleting ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  {/* Image */}
                  <div className="aspect-video bg-slate-100 relative">
                    <img
                      src={image.publicUrl}
                      alt="Generated room"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 font-mono truncate">
                          {image.selections_hash}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatDate(image.created_at)}
                          {typeof image.selections_json._model === "string" && (
                            <span className="ml-2 text-amber-700 font-mono">
                              [{image.selections_json._model}]
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(image)}
                        disabled={isDeleting}
                        className="shrink-0 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors"
                      >
                        {isDeleting ? "..." : "Delete"}
                      </button>
                    </div>

                    {/* Collapsible details */}
                    <button
                      onClick={() =>
                        setExpandedHash(isExpanded ? null : image.selections_hash)
                      }
                      className="text-xs text-slate-600 hover:text-slate-900 transition-colors w-full text-left"
                    >
                      {isExpanded ? "Hide details" : "Show details"}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-200 pt-3 space-y-3">
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Selections</p>
                          {renderSelections(image.selections_json)}
                        </div>
                        {!!image.intermediateImages?.length && (
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Intermediate Passes</p>
                            <div className="grid grid-cols-1 gap-3">
                              {image.intermediateImages.map((artifact) => (
                                <div key={artifact.path} className="border border-slate-200 bg-slate-50 p-2">
                                  <p className="text-[11px] text-slate-600 mb-2">{artifact.label}</p>
                                  <div className="aspect-video bg-white overflow-hidden">
                                    <img
                                      src={artifact.publicUrl}
                                      alt={artifact.label}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {image.prompt && (
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Prompt</p>
                            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{image.prompt}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
