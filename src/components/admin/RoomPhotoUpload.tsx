"use client";

import { useState, useCallback, useRef } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { Upload, Loader2 } from "lucide-react";

import type { AdminStepPhoto } from "@/types";

interface RoomPhotoUploadProps {
  orgId: string;
  stepId: string;
  onUploaded: (photo: AdminStepPhoto) => void;
}

async function validateImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to read image"));
    };
    img.src = URL.createObjectURL(file);
  });
}

export function RoomPhotoUpload({ orgId, stepId, onUploaded }: RoomPhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Only JPG, PNG, and WebP images are supported.");
      return;
    }

    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    if (file.size > MAX_FILE_SIZE) {
      setError("File too large. Maximum 20MB.");
      return;
    }

    setError(null);
    setUploading(true);

    let imagePath: string | null = null;
    try {
      // Client-side dimension check
      const { width, height } = await validateImageDimensions(file);
      if (width < 1024 || height < 1024) {
        setError(`Image too small (${width}x${height}). Minimum 1024x1024.`);
        setUploading(false);
        return;
      }

      const supabase = createSupabaseBrowser();
      const ext = file.name.split(".").pop() || "jpg";
      const uuid = crypto.randomUUID();
      imagePath = `${orgId}/rooms/${stepId}/${uuid}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("rooms")
        .upload(imagePath, file, { upsert: false });

      if (uploadError) throw uploadError;

      // Create step_photos record
      const res = await fetch("/api/admin/step-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: orgId,
          step_id: stepId,
          image_path: imagePath,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create photo record");

      onUploaded(data);
      imagePath = null; // success — don't clean up
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      console.error("Room photo upload failed:", err);
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      // Clean up orphaned storage file if upload succeeded but DB insert failed
      if (imagePath) {
        const supabase = createSupabaseBrowser();
        await supabase.storage.from("rooms").remove([imagePath]).catch(() => {});
      }
    } finally {
      setUploading(false);
    }
  }, [orgId, stepId, onUploaded]);

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
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border border-dashed px-4 py-6 text-center cursor-pointer transition-colors ${
          isDragOver
            ? "border-neutral-400 bg-neutral-800"
            : "border-neutral-700 hover:border-neutral-500 bg-neutral-900"
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
          <span className="flex items-center justify-center gap-2 text-neutral-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2 text-neutral-500 text-sm">
            <Upload className="w-4 h-4" /> Drop room photo or click to upload
          </span>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
