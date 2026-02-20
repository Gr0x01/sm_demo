"use client";

import { useState, useCallback, useRef } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { Upload, X, Loader2 } from "lucide-react";

interface SwatchUploadProps {
  orgId: string;
  optionId: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
  onRemoved: () => void;
}

export function SwatchUpload({ orgId, optionId, currentUrl, onUploaded, onRemoved }: SwatchUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;

    setUploading(true);
    try {
      const supabase = createSupabaseBrowser();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${orgId}/swatches/${optionId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("swatches")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("swatches")
        .getPublicUrl(path);

      // Bust browser cache by appending timestamp
      const url = `${publicUrl}?t=${Date.now()}`;
      onUploaded(url);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      console.error("Swatch upload failed:", err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [orgId, optionId, onUploaded]);

  const handleRemove = useCallback(async () => {
    if (!currentUrl) return;
    setUploading(true);
    try {
      const supabase = createSupabaseBrowser();
      // Extract storage path: everything after /object/public/swatches/
      const urlObj = new URL(currentUrl);
      const pathMatch = urlObj.pathname.match(/\/object\/public\/swatches\/(.+)/);
      if (pathMatch) {
        const storagePath = decodeURIComponent(pathMatch[1]);
        await supabase.storage.from("swatches").remove([storagePath]);
      }
      onRemoved();
    } catch (err) {
      console.error("Swatch remove failed:", err);
    } finally {
      setUploading(false);
    }
  }, [currentUrl, onRemoved]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }, [upload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
  }, [upload]);

  return (
    <div className="space-y-2">
      {currentUrl && (
        <div className="flex items-center gap-2">
          <img src={currentUrl} alt="Current swatch" className="w-12 h-12 object-cover border border-slate-300" />
          <button
            onClick={handleRemove}
            disabled={uploading}
            className="text-xs text-red-600 hover:text-red-500 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Remove
          </button>
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border border-dashed px-3 py-2 text-center cursor-pointer transition-colors text-xs ${
          isDragOver
            ? "border-slate-400 bg-slate-100"
            : "border-slate-300 hover:border-slate-500 bg-slate-50"
        } ${uploading ? "pointer-events-none opacity-50" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileInput}
          className="hidden"
        />
        {uploading ? (
          <span className="flex items-center justify-center gap-1 text-slate-600">
            <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-1 text-slate-500">
            <Upload className="w-3 h-3" /> Drop swatch or click to upload
          </span>
        )}
      </div>
    </div>
  );
}
