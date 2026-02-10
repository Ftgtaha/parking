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
    className?: string;
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
    className,
}: MapControlsProps) {
    const activeZone = zones.find((z) => z.id === currentZoneId);

    // Calculate floors array based on active zone
    // Default to [0] if no zone or outdoor
    const floors = activeZone?.type === 'building'
        ? Array.from({ length: activeZone.total_floors }, (_, i) => i)
        : [0];

    return (
        <div className={clsx(
            "flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4 bg-white/90 backdrop-blur-sm p-2 md:p-3 rounded-xl shadow-sm border border-slate-200 transition-all",
            className
        )}>

            {/* Zone Switcher */}
            <div className="flex items-center space-x-2 overflow-x-auto max-w-full pb-1 md:pb-0 scrollbar-hide">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1 shrink-0">
                    <MapIcon size={14} /> <span className="hidden md:inline">Zone</span>
                </span>
                <div className="flex bg-slate-100/50 p-0.5 rounded-lg gap-1">
                    {zones.length === 0 ? (
                        <span className="text-[10px] text-slate-400 px-2 py-1">Loading...</span>
                    ) : (
                        zones.map((zone) => (
                            <button
                                key={zone.id}
                                onClick={() => onZoneChange(zone.id)}
                                className={clsx(
                                    "px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap",
                                    currentZoneId === zone.id
                                        ? "bg-white text-blue-600 shadow-sm border border-slate-100"
                                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
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
                <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-left-4 border-t md:border-t-0 border-slate-100 pt-2 md:pt-0">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                        <Layers size={14} /> <span className="hidden md:inline">Floor</span>
                    </span>
                    <div className="flex bg-slate-100/50 p-0.5 rounded-lg space-x-1">
                        {floors.map((floor) => (
                            <button
                                key={floor}
                                onClick={() => onFloorChange(floor)}
                                className={clsx(
                                    "w-8 h-7 flex items-center justify-center rounded-md text-xs font-bold transition-all",
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
