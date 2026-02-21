"use client";

import { useState, useCallback, useRef } from "react";
import type { DemoSceneAnalysis } from "@/lib/demo-scene";
import { useTrack } from "@/hooks/useTrack";

interface DemoUploaderProps {
  onPhotoAccepted: (photo: {
    dataUrl: string;
    hash: string;
    sceneAnalysis?: DemoSceneAnalysis;
  }) => void;
}

/** Resize and center-crop image to 1536x1024 (3:2) to match generation output */
function resizeImage(file: File): Promise<{ dataUrl: string; width: number; height: number; srcWidth: number; srcHeight: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const targetW = 1536;
      const targetH = 1024;
      const targetRatio = targetW / targetH; // 1.5

      const srcRatio = img.width / img.height;

      // Scale so the image covers the target box, then center-crop
      let sw: number, sh: number, sx: number, sy: number;
      if (srcRatio > targetRatio) {
        // Source is wider — crop sides
        sh = img.height;
        sw = Math.round(img.height * targetRatio);
        sx = Math.round((img.width - sw) / 2);
        sy = 0;
      } else {
        // Source is taller — crop top/bottom
        sw = img.width;
        sh = Math.round(img.width / targetRatio);
        sx = 0;
        sy = Math.round((img.height - sh) / 2);
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
      resolve({
        dataUrl: canvas.toDataURL("image/jpeg", 0.85),
        width: targetW,
        height: targetH,
        srcWidth: img.width,
        srcHeight: img.height,
      });
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

/** SHA-256 hash of a data URL's base64 content */
async function hashDataUrl(dataUrl: string): Promise<string> {
  const base64 = dataUrl.split(",")[1];
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

/** Load the sample kitchen photo and return the processed photo object */
export async function loadSamplePhoto(): Promise<{
  dataUrl: string;
  hash: string;
  sceneAnalysis: DemoSceneAnalysis;
}> {
  const res = await fetch("/sample-kitchen.jpg");
  const blob = await res.blob();
  const file = new File([blob], "sample-kitchen.jpg", { type: "image/jpeg" });
  const { dataUrl } = await resizeImage(file);
  const hash = await hashDataUrl(dataUrl);
  return {
    dataUrl,
    hash,
    sceneAnalysis: {
      sceneDescription: "Modern model home kitchen with white shaker cabinets, light granite countertops, stainless steel appliances, hardwood flooring, and a large center island with pendant lights. Natural light from windows on the left.",
      hasIsland: true,
      kitchenType: "l-shape",
      cameraAngle: "straight-on",
      visibleSurfaces: { cabinets: true, countertop: true, backsplash: true, island: true },
      spatialHints: { layout: "Island runs horizontally in the foreground. Upper and lower cabinets span the back wall with a range hood centered. Countertops wrap from left wall along the back. Hardwood flooring throughout." },
    },
  };
}

export function DemoUploader({ onPhotoAccepted }: DemoUploaderProps) {
  const track = useTrack();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setRejection("Please upload an image file (JPEG, PNG, or WebP).");
      track("demo_photo_rejected", { reason: "invalid_type" });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setRejection("Image is too large. Please use a file under 20MB.");
      track("demo_photo_rejected", { reason: "too_large" });
      return;
    }

    setRejection(null);
    setIsValidating(true);

    try {
      const { dataUrl, srcWidth, srcHeight } = await resizeImage(file);

      // Reject portrait orientation — output is always landscape (3:2)
      if (srcHeight > srcWidth) {
        setRejection("Please use a landscape (horizontal) photo. Portrait photos don't work well with our visualization engine.");
        track("demo_photo_rejected", { reason: "portrait" });
        setIsValidating(false);
        return;
      }

      setPreviewUrl(dataUrl);

      // Validate with Gemini
      const res = await fetch("/api/try/validate-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: dataUrl.split(",")[1] }),
      });

      const data = await res.json();

      if (!data.accepted) {
        setRejection(data.reason || "This doesn't appear to be a kitchen photo. Please try a different image.");
        track("demo_photo_rejected", { reason: "not_kitchen" });
        setPreviewUrl(null);
        setIsValidating(false);
        return;
      }

      const hash = await hashDataUrl(dataUrl);
      onPhotoAccepted({
        dataUrl,
        hash,
        sceneAnalysis: {
          sceneDescription: data.sceneDescription,
          hasIsland: data.hasIsland,
          kitchenType: data.kitchenType,
          cameraAngle: data.cameraAngle,
          visibleSurfaces: data.visibleSurfaces,
          spatialHints: data.spatialHints,
        },
      });
    } catch {
      setRejection("Failed to process image. Please try again.");
      setPreviewUrl(null);
    } finally {
      setIsValidating(false);
    }
  }, [onPhotoAccepted, track]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleUseSample = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isValidating) return;
    track("demo_sample_photo_clicked");
    setRejection(null);
    setIsValidating(true);
    try {
      const photo = await loadSamplePhoto();
      onPhotoAccepted(photo);
    } catch {
      setRejection("Failed to load sample photo. Please try uploading your own.");
    } finally {
      setIsValidating(false);
    }
  }, [isValidating, onPhotoAccepted, track]);

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed transition-colors cursor-pointer ${
          isDragOver
            ? "border-slate-900 bg-slate-100"
            : "border-slate-300 hover:border-slate-400 bg-white"
        } ${isValidating ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center py-12 sm:py-14 md:py-16 px-6">
          {isValidating && previewUrl ? (
            <>
              <img src={previewUrl} alt="Preview" className="max-h-48 mb-4 object-contain" />
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Checking photo quality...
              </div>
            </>
          ) : (
            <>
              <svg className="w-10 h-10 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              <p className="text-base font-medium text-slate-700 mb-1">
                Drop a model home photo here
              </p>
              <p className="text-sm text-slate-400">
                or click to browse. Landscape, JPEG, PNG, or WebP.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Sample kitchen — alternative path */}
      <button
        type="button"
        onClick={handleUseSample}
        disabled={isValidating}
        className="w-full flex items-center gap-4 px-4 py-3 border border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 transition-colors text-left group disabled:opacity-50 disabled:pointer-events-none"
      >
        <img
          src="/sample-kitchen.jpg"
          alt="Sample kitchen"
          className="w-20 h-14 object-cover border border-slate-200 shrink-0"
        />
        <div>
          <p className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
            Start with this kitchen
          </p>
          <p className="text-xs text-slate-400">
            No photo handy? Use ours.
          </p>
        </div>
      </button>

      {rejection && (
        <div className="px-4 py-3 bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <div>
            <p>{rejection}</p>
            <button
              onClick={() => { setRejection(null); inputRef.current?.click(); }}
              className="mt-2 text-sm font-semibold text-amber-700 hover:text-amber-900 underline"
            >
              Try another photo
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 text-center">
        Not stored. Not shared. Best results with a well-lit, straight-on shot.
      </p>
    </div>
  );
}
