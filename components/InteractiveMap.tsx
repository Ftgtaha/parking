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
    spotWidth?: number;
    spotHeight?: number;
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
    spotWidth = 60,
    spotHeight = 100,
}, ref) => {
    const [lastClickedCoord, setLastClickedCoord] = useState<{ x: number; y: number } | null>(null);

    // Reference dimensions for consistent responsive sizing
    // We treat the slider values as "pixels on a standard 1200x800 desktop map view"
    const REFERENCE_WIDTH = 1200;
    const REFERENCE_HEIGHT = 800;

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
        <div className="relative w-full h-full bg-slate-200 md:rounded-xl overflow-hidden md:shadow-inner md:border md:border-slate-300 group">
            {/* Dev Mode Indicator */}


            <TransformWrapper
                ref={ref}
                limitToBounds={true}
                minScale={1}
                maxScale={8}
                wheel={{ step: 0.1 }}
                pinch={{ step: 5 }}
            >
                {({ resetTransform }) => (
                    <>
                        <div className="absolute bottom-20 md:bottom-4 right-4 z-40">
                            <button
                                onClick={() => resetTransform()}
                                className="bg-white/90 backdrop-blur p-2 rounded-lg shadow-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all active:scale-95 flex items-center justify-center w-10 h-10 md:w-auto md:h-auto"
                                title="Reset View"
                            >
                                <RotateCcw size={20} className="md:w-5 md:h-5" />
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
                                {floorSpots.map((spot) => {
                                    // Calculate relative size if dimensions available, else fallback to pixels (or better yet, hide until loaded to avoid jump)
                                    // Using pixels as fallback for now
                                    // Calculate relative size based on reference dimensions
                                    // This ensures consistent visual size ratio across all devices
                                    const widthStyle = `${(spotWidth / REFERENCE_WIDTH) * 100}%`;
                                    const heightStyle = `${(spotHeight / REFERENCE_HEIGHT) * 100}%`;

                                    return (
                                        <div
                                            key={spot.id}
                                            id={`spot-${spot.id}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSpotClick?.(spot);
                                            }}
                                            className={clsx(
                                                "absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300",
                                                "flex items-center justify-center rounded-md shadow-md z-10",
                                                // Highlight Selected Spot
                                                selectedSpotId === spot.id ? "z-50 ring-4 ring-blue-500 scale-110 shadow-xl" : "hover:scale-110",
                                                // Status Colors with Pulse for Reserved/Occupied
                                                spot.status === 0 ? "bg-green-500 border-2 border-white" : "",
                                                spot.status === 1 ? "bg-purple-600 border-2 border-white animate-pulse" : "",
                                                spot.status === 2 ? "bg-red-500 border-2 border-white" : ""
                                            )}
                                            style={{
                                                left: `${spot.x_coord}%`,
                                                top: `${spot.y_coord}%`,
                                                width: widthStyle,
                                                height: heightStyle,
                                            }}
                                            title={`Spot: ${spot.spot_number} (${spot.status === 0 ? 'Free' : spot.status === 1 ? 'Reserved' : 'Occupied'})`}
                                        >
                                            {spot.status !== 0 && (
                                                <span
                                                    className={clsx(
                                                        "text-[10px] font-bold text-white tracking-tighter",
                                                        spotHeight > spotWidth ? "-rotate-90" : ""
                                                    )}
                                                    style={{ fontSize: 'container' }}
                                                >
                                                    {spot.spot_number}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}

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
                                        <div className="bg-white p-0.5 md:p-1 rounded-full shadow-md border border-slate-800 group-hover/gate:scale-110 group-hover/gate:border-red-600 transition-all">
                                            <DoorOpen size={14} className="text-slate-800 group-hover/gate:text-red-600 md:w-4 md:h-4 w-3 h-3" />
                                        </div>
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
