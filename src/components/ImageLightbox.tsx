"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ImageLightboxProps {
  src?: string;
  color?: string;
  alt: string;
  onClose: () => void;
  onRetry?: () => void;
}

export function ImageLightbox({ src, color, alt, onClose, onRetry }: ImageLightboxProps) {
  const [visible, setVisible] = useState(false);

  // Animate in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-200"
        style={{ opacity: visible ? 1 : 0 }}
      />

      {/* Content */}
      <div
        className="relative z-10 flex flex-col items-center w-full max-w-2xl transition-all duration-200"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.95)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-20 w-10 h-10 bg-white flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200"
          aria-label="Close"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image */}
        <div className="relative w-full overflow-hidden shadow-2xl bg-gray-100 border-2 border-white/20">
          {src ? (
            <img
              src={src}
              alt={alt}
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          ) : color ? (
            <div className="w-full aspect-square max-h-[60vh]" style={{ backgroundColor: color }} />
          ) : null}

          {onRetry && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-4 pt-8 pb-3 flex justify-end">
              <button
                onClick={() => { onRetry(); onClose(); }}
                className="px-3 py-1.5 bg-white/90 text-slate-800 text-xs font-semibold uppercase tracking-wider hover:bg-white transition-colors cursor-pointer backdrop-blur-sm"
              >
                Retry
              </button>
            </div>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}
