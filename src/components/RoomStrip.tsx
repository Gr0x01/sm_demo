"use client";

import type { RoomConfig } from "@/lib/room-config";

interface RoomStripProps {
  rooms: RoomConfig[];
  activeRoomId: string;
  onSelectRoom: (roomId: string) => void;
}

export function RoomStrip({ rooms, activeRoomId, onSelectRoom }: RoomStripProps) {
  return (
    <div className="flex gap-2 overflow-x-auto py-2 px-1 no-scrollbar">
      {rooms.map((room) => {
        const isActive = room.id === activeRoomId;
        return (
          <button
            key={room.id}
            onClick={() => onSelectRoom(room.id)}
            className={`flex-shrink-0 group cursor-pointer relative rounded-lg overflow-hidden transition-all ${
              isActive
                ? "ring-2 ring-[var(--color-gold)] shadow-md"
                : "ring-1 ring-gray-200 opacity-70 hover:opacity-100 hover:ring-gray-300"
            }`}
          >
            <div className="w-28 h-20 relative">
              <img
                src={room.image}
                alt={room.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <span className="absolute bottom-1 left-1.5 right-1.5 text-[10px] font-semibold text-white leading-tight">
                {room.name}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
