"use client";

import { useEffect, useState } from "react";

interface GeneratedImage {
  selections_hash: string;
  selections_json: Record<string, string>;
  image_path: string;
  prompt: string;
  created_at: string;
  publicUrl: string;
}

export default function AdminPage() {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedHash, setExpandedHash] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  const fetchImages = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/images");
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
        body: JSON.stringify({ deleteAll: true }),
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

  const renderSelections = (json: Record<string, string>) => {
    const entries = Object.entries(json);
    if (!entries.length) return <span className="text-neutral-500">None</span>;
    return (
      <ul className="space-y-1 text-sm">
        {entries.map(([key, value]) => (
          <li key={key} className="flex justify-between gap-4">
            <span className="text-neutral-400 truncate">{key}</span>
            <span className="text-white font-medium truncate text-right">
              {value}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Generated Images
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              {loading
                ? "Loading..."
                : `${images.length} cached image${images.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchImages}
              className="px-4 py-2 bg-neutral-800 text-neutral-300 text-sm font-medium hover:bg-neutral-700 transition-colors"
            >
              Refresh
            </button>
            {images.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="px-4 py-2 bg-red-900/50 text-red-300 text-sm font-medium hover:bg-red-900 transition-colors"
              >
                Delete All
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Grid */}
        {!loading && images.length === 0 && !error && (
          <p className="text-neutral-500 text-center py-20">
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
                className={`bg-neutral-900 border border-neutral-800 overflow-hidden ${
                  isDeleting ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                {/* Image */}
                <div className="aspect-video bg-neutral-800 relative">
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
                      <p className="text-xs text-neutral-500 font-mono truncate">
                        {image.selections_hash}
                      </p>
                      <p className="text-xs text-neutral-400 mt-1">
                        {formatDate(image.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(image)}
                      disabled={isDeleting}
                      className="shrink-0 px-3 py-1.5 bg-red-900/30 text-red-400 text-xs font-medium hover:bg-red-900/60 transition-colors"
                    >
                      {isDeleting ? "..." : "Delete"}
                    </button>
                  </div>

                  {/* Collapsible details */}
                  <button
                    onClick={() =>
                      setExpandedHash(isExpanded ? null : image.selections_hash)
                    }
                    className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors w-full text-left"
                  >
                    {isExpanded ? "▾ Hide details" : "▸ Show details"}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-neutral-800 pt-3 space-y-3">
                      <div>
                        <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Selections</p>
                        {renderSelections(image.selections_json)}
                      </div>
                      {image.prompt && (
                        <div>
                          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Prompt</p>
                          <p className="text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed">{image.prompt}</p>
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
  );
}
