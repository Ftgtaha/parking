'use client';

import { clsx } from 'clsx';
import { Layers, Map as MapIcon, ShieldCheck } from 'lucide-react';

export interface ZoneData {
    id: number;
    name: string;
    type: 'building' | 'outdoor';
    total_floors: number;
    image_url?: string;
    spot_width?: number; // Optional until DB migration is guaranteed
    spot_height?: number; // Optional until DB migration is guaranteed
}

interface MapControlsProps {
    zones: ZoneData[];
    currentZoneId: number | null;
    currentFloor: number;
    devMode: boolean;
    onZoneChange: (zoneId: number) => void;
    onFloorChange: (floor: number) => void;
    onDevModeToggle: () => void;
    isAdmin?: boolean;
}

export function MapControls({
    zones,
    currentZoneId,
    currentFloor,
    devMode,
    onZoneChange,
    onFloorChange,
    onDevModeToggle,
    isAdmin = false,
}: MapControlsProps) {
    const activeZone = zones.find((z) => z.id === currentZoneId);

    // Calculate floors array based on active zone
    // Default to [0] if no zone or outdoor
    const floors = activeZone?.type === 'building'
        ? Array.from({ length: activeZone.total_floors }, (_, i) => i)
        : [0];

    return (
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">

            {/* Zone Switcher */}
            <div className="flex items-center space-x-2 overflow-x-auto max-w-full pb-2 md:pb-0">
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2 shrink-0">
                    <MapIcon size={16} /> Zone
                </span>
                <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                    {zones.length === 0 ? (
                        <span className="text-xs text-slate-400 px-3 py-2">Loading zones...</span>
                    ) : (
                        zones.map((zone) => (
                            <button
                                key={zone.id}
                                onClick={() => onZoneChange(zone.id)}
                                className={clsx(
                                    "px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
                                    currentZoneId === zone.id
                                        ? "bg-white text-blue-600 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                {zone.name}
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Floor Switcher (Only visible for Building) */}
            {activeZone?.type === 'building' && (
                <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-left-4">
                    <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                        <Layers size={16} /> Floor
                    </span>
                    <div className="flex bg-slate-100 p-1 rounded-lg space-x-1">
                        {floors.map((floor) => (
                            <button
                                key={floor}
                                onClick={() => onFloorChange(floor)}
                                className={clsx(
                                    "w-10 h-8 flex items-center justify-center rounded-md text-sm font-bold transition-all",
                                    currentFloor === floor
                                        ? "bg-blue-600 text-white shadow-md"
                                        : "bg-white text-slate-600 hover:bg-slate-200"
                                )}
                            >
                                {floor === 0 ? 'G' : floor}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Admin Toggle */}
            {isAdmin && (
                <div className="ml-auto border-l pl-4 border-slate-200">
                    <button
                        onClick={onDevModeToggle}
                        className={clsx(
                            "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                            devMode
                                ? "bg-red-50 text-red-600 border border-red-200"
                                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                        )}
                    >
                        <ShieldCheck size={18} />
                        <span>{devMode ? 'Admin Mode ON' : 'Admin Mode'}</span>
                    </button>
                </div>
            )}
        </div>
    );
}
