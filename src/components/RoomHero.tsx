"use client";

import type { RoomConfig } from "@/lib/room-config";

interface RoomHeroProps {
  room: RoomConfig;
  generatedImageUrl: string | null;
  isGenerating: boolean;
}

export function RoomHero({ room, generatedImageUrl, isGenerating }: RoomHeroProps) {
  return (
    <div className="relative w-full aspect-[16/9] max-h-[45vh] rounded-xl overflow-hidden bg-gray-100">
      {isGenerating && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium text-[var(--color-navy)]">
            Generating your kitchen...
          </p>
          <p className="text-xs text-gray-400 mt-1">
            This takes 10-30 seconds
          </p>
        </div>
      )}

      <img
        src={generatedImageUrl || room.image}
        alt={room.name}
        className="w-full h-full object-cover"
      />

      {!generatedImageUrl && !isGenerating && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-5 py-4">
          <p className="text-white text-lg font-bold">{room.name}</p>
          <p className="text-white/70 text-sm">{room.subtitle}</p>
        </div>
      )}
    </div>
  );
}
