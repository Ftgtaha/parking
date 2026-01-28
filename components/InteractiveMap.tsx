'use client';

import React, { useState, forwardRef } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { Spot } from '@/hooks/useRealtimeSpots';
import { clsx } from 'clsx';
import { MapPin, RotateCcw, DoorOpen } from 'lucide-react';

interface InteractiveMapProps {
    imageUrl: string;
    spots: Spot[];
    activeFloor: number;
    devMode: boolean;
    onSpotClick?: (spot: Spot) => void;
    onMapClick?: (x: number, y: number) => void;
    tempSpot?: { x_coord: number; y_coord: number; floor_level: number } | null;
    selectedSpotId?: number | null;
    gate?: { x: number; y: number } | null;
    onGateClick?: () => void;
}

export const InteractiveMap = forwardRef<ReactZoomPanPinchRef, InteractiveMapProps>(({
    imageUrl,
    spots,
    activeFloor,
    devMode,
    onSpotClick,
    onMapClick,
    tempSpot,
    selectedSpotId,
    gate,
    onGateClick,
}, ref) => {
    const [lastClickedCoord, setLastClickedCoord] = useState<{ x: number; y: number } | null>(null);

    // Filter spots for the current floor
    const floorSpots = spots.filter((s) => s.floor_level === activeFloor);

    const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!devMode) return;

        // Calculate relative coordinates in percentage
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        // Round to 2 decimal places
        const roundedX = Math.round(x * 100) / 100;
        const roundedY = Math.round(y * 100) / 100;

        // console.log(`Map Click: x_coord=${roundedX}, y_coord=${roundedY}`);
        setLastClickedCoord({ x: roundedX, y: roundedY });

        if (onMapClick) {
            onMapClick(roundedX, roundedY);
        }
    };

    return (
        <div className="relative w-full h-[600px] bg-slate-200 rounded-xl overflow-hidden shadow-inner border border-slate-300 group">
            {/* Dev Mode Indicator */}
            {devMode && (
                <div className="absolute top-4 right-4 z-50 bg-black/80 text-green-400 text-xs font-mono p-2 rounded border border-green-500 shadow-xl pointer-events-none">
                    ADMIN MODE ACTIVE <br />
                    Click map to capture coords
                    {lastClickedCoord && (
                        <div className="mt-1 pt-1 border-t border-gray-700 text-white">
                            Last: {lastClickedCoord.x}%, {lastClickedCoord.y}%
                        </div>
                    )}
                </div>
            )}

            <TransformWrapper
                ref={ref}
                limitToBounds={true}
                minScale={1}
                maxScale={4}
                wheel={{ step: 0.1 }}
                pinch={{ step: 5 }}
            >
                {({ resetTransform }) => (
                    <>
                        <div className="absolute bottom-4 right-4 z-50">
                            <button
                                onClick={() => resetTransform()}
                                className="bg-white/90 backdrop-blur p-2 rounded-lg shadow-md border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all active:scale-95"
                                title="Reset View"
                            >
                                <RotateCcw size={20} />
                            </button>
                        </div>
                        <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%' }}>
                            <div
                                className={clsx("relative w-full h-full", devMode && "cursor-crosshair")}
                                onClick={handleMapClick}
                            >
                                {/* Background Map Image */}
                                <img
                                    src={imageUrl}
                                    alt="Parking Map"
                                    className="w-full h-full object-contain"
                                />

                                {/* Spots Overlay */}
                                {floorSpots.map((spot) => (
                                    <div
                                        key={spot.id}
                                        id={`spot-${spot.id}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSpotClick?.(spot);
                                        }}
                                        className={clsx(
                                            "absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300",
                                            "flex items-center justify-center rounded-full shadow-md z-10",
                                            // Highlight Selected Spot
                                            selectedSpotId === spot.id ? "z-50 ring-4 ring-blue-500 scale-125 shadow-xl" : "hover:scale-125",
                                            // Status Colors with Pulse for Reserved/Occupied
                                            spot.status === 0 ? "w-6 h-6 bg-green-500 border-2 border-white" : "",
                                            spot.status === 1 ? "w-8 h-8 bg-purple-600 border-2 border-white animate-pulse" : "",
                                            spot.status === 2 ? "w-6 h-6 bg-red-500 border-2 border-white" : ""
                                        )}
                                        style={{
                                            left: `${spot.x_coord}%`,
                                            top: `${spot.y_coord}%`,
                                        }}
                                        title={`Spot: ${spot.spot_number} (${spot.status === 0 ? 'Free' : spot.status === 1 ? 'Reserved' : 'Occupied'})`}
                                    >
                                        {spot.status !== 0 && (
                                            <span className="text-[8px] font-bold text-white tracking-tighter">
                                                {spot.spot_number}
                                            </span>
                                        )}
                                    </div>
                                ))}

                                {/* Ghost Marker (Temp Spot) */}
                                {tempSpot && tempSpot.floor_level === activeFloor && (
                                    <div
                                        className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none animate-bounce"
                                        style={{
                                            left: `${tempSpot.x_coord}%`,
                                            top: `${tempSpot.y_coord}%`,
                                        }}
                                    >
                                        <div className="w-8 h-8 bg-blue-500/50 border-2 border-blue-400 rounded-full flex items-center justify-center backdrop-blur-sm shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                                            <div className="w-3 h-3 bg-blue-100 rounded-full animate-ping" />
                                        </div>
                                    </div>
                                )}

                                {/* Gate / Entrance Icon */}
                                {gate && activeFloor === 0 && (
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onGateClick?.();
                                        }}
                                        className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center cursor-pointer group/gate"
                                        style={{
                                            left: `${gate.x}%`,
                                            top: `${gate.y}%`,
                                        }}
                                        title="Entrance (Click to Manage)"
                                    >
                                        <div className="bg-white p-1.5 rounded-full shadow-lg border-2 border-slate-800 group-hover/gate:scale-110 group-hover/gate:border-red-600 transition-all">
                                            <DoorOpen size={24} className="text-slate-800 group-hover/gate:text-red-600" />
                                        </div>
                                        <span className="mt-1 text-[10px] font-black bg-slate-800 text-white px-2 py-0.5 rounded shadow-sm group-hover/gate:bg-red-600">
                                            ENTRANCE
                                        </span>
                                    </div>
                                )}
                            </div>
                        </TransformComponent>
                    </>
                )}
            </TransformWrapper>


        </div>
    );
});

InteractiveMap.displayName = 'InteractiveMap';
