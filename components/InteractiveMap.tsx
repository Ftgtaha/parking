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
    tempSpot?: { x_coord: number; y_coord: number; floor_level: number; width?: number; height?: number; rotation?: number } | null;
    selectedSpotId?: number | null;
    gate?: { x: number; y: number } | null;
    onGateClick?: () => void;
    onSpotMoveEnd?: (id: number, x: number, y: number) => void;
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
    onSpotMoveEnd,
    spotWidth = 60,
    spotHeight = 100,
}, ref) => {
    const [lastClickedCoord, setLastClickedCoord] = useState<{ x: number; y: number } | null>(null);
    const [draggedSpot, setDraggedSpot] = useState<{ id: number; startX: number; startY: number; initialSpotX: number; initialSpotY: number } | null>(null);
    const [currentDragPos, setCurrentDragPos] = useState<{ x: number; y: number } | null>(null);
    const mapContainerRef = React.useRef<HTMLDivElement>(null);

    const [mapDimensions, setMapDimensions] = useState<{ width: number; height: number } | null>(null);

    // Filter spots for the current floor
    const floorSpots = spots.filter((s) => s.floor_level === activeFloor);

    const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!devMode) return;
        // If dragging, ignore click
        if (draggedSpot) return;

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

    // Drag Handlers
    const handleSpotPointerDown = (e: React.PointerEvent, spot: Spot) => {
        if (!devMode) return;
        e.stopPropagation();
        e.preventDefault(); // Prevent default touch actions like scroll/zoom while dragging

        const target = e.currentTarget as HTMLElement;
        target.setPointerCapture(e.pointerId);

        setDraggedSpot({
            id: spot.id,
            startX: e.clientX,
            startY: e.clientY,
            initialSpotX: spot.x_coord,
            initialSpotY: spot.y_coord,
        });
        setCurrentDragPos({ x: spot.x_coord, y: spot.y_coord });
    };

    const handleSpotPointerMove = (e: React.PointerEvent) => {
        if (!draggedSpot || !mapContainerRef.current) return;
        e.stopPropagation();
        e.preventDefault();

        const mapRect = mapContainerRef.current.getBoundingClientRect();

        // Calculate delta in pixels
        const deltaXPixels = e.clientX - draggedSpot.startX;
        const deltaYPixels = e.clientY - draggedSpot.startY;

        // Convert delta to percentage relative to current map size (handles zoom)
        const deltaXPercent = (deltaXPixels / mapRect.width) * 100;
        const deltaYPercent = (deltaYPixels / mapRect.height) * 100;

        const newX = draggedSpot.initialSpotX + deltaXPercent;
        const newY = draggedSpot.initialSpotY + deltaYPercent;

        setCurrentDragPos({ x: newX, y: newY });
    };

    const handleSpotPointerUp = (e: React.PointerEvent) => {
        if (!draggedSpot) return;
        e.stopPropagation();

        const target = e.currentTarget as HTMLElement;
        target.releasePointerCapture(e.pointerId);

        if (onSpotMoveEnd && currentDragPos) {
            // Round to 2 decimals for cleanliness
            const finalX = Math.round(currentDragPos.x * 100) / 100;
            const finalY = Math.round(currentDragPos.y * 100) / 100;
            onSpotMoveEnd(draggedSpot.id, finalX, finalY);
        }

        setDraggedSpot(null);
        setCurrentDragPos(null);
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
                        <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div
                                ref={mapContainerRef}
                                className={clsx("relative", devMode && "cursor-crosshair")}
                                style={{
                                    aspectRatio: mapDimensions ? `${mapDimensions.width} / ${mapDimensions.height}` : undefined,
                                    width: mapDimensions ? 'auto' : '100%',
                                    height: mapDimensions ? 'auto' : '100%',
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                }}
                                onClick={handleMapClick}
                            >
                                {/* Background Map Image */}
                                <img
                                    src={imageUrl}
                                    alt="Parking Map"
                                    className="w-full h-full object-contain block" // block removes bottom spacing
                                    onLoad={(e) => {
                                        const img = e.currentTarget;
                                        setMapDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                                    }}
                                />

                                {/* Spots Overlay - Only render when we have dimensions to ensure correct placement */}
                                {mapDimensions && floorSpots.map((spot) => {
                                    // Calculate relative size based on the specific image's natural dimensions
                                    // accurately representing "pixels on the image"
                                    const sWidth = (spot as any).width || spotWidth;
                                    const sHeight = (spot as any).height || spotHeight;
                                    const sRotation = (spot as any).rotation || 0;

                                    const widthStyle = `${(sWidth / mapDimensions.width) * 100}%`;
                                    const heightStyle = `${(sHeight / mapDimensions.height) * 100}%`;

                                    const isDragging = draggedSpot?.id === spot.id;
                                    const x = isDragging && currentDragPos ? currentDragPos.x : spot.x_coord;
                                    const y = isDragging && currentDragPos ? currentDragPos.y : spot.y_coord;

                                    return (
                                        <div
                                            key={spot.id}
                                            id={`spot-${spot.id}`}
                                            onPointerDown={(e) => handleSpotPointerDown(e, spot)}
                                            onPointerMove={handleSpotPointerMove}
                                            onPointerUp={handleSpotPointerUp}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Only trigger click if not dragging (simple check: if we just released a drag, we might fallback here? 
                                                // actually onPointerUp happens before onClick usually, but preventing default in pointerdown often kills click. 
                                                // So we might technically block `onSpotClick` during drag mode.
                                                // But let's keep it simply separated: 
                                                // If we didn't drag significantly? Ideally separate drag vs click logic.
                                                // For now, let's allow click if valid.
                                                if (!isDragging) onSpotClick?.(spot);
                                            }}
                                            className={clsx(
                                                "absolute cursor-pointer transition-all duration-300",
                                                "flex items-center justify-center rounded-md shadow-md z-10",
                                                // Highlight Selected Spot
                                                selectedSpotId === spot.id ? "z-50 ring-4 ring-blue-500 scale-110 shadow-xl" : "hover:scale-110",
                                                // Status Colors with Pulse for Reserved/Occupied
                                                spot.status === 0 ? "bg-green-500 border-2 border-white" : "",
                                                spot.status === 1 ? "bg-purple-600 border-2 border-white animate-pulse" : "",
                                                spot.status === 2 ? "bg-red-500 border-2 border-white" : "",
                                                // Dragging styles
                                                isDragging ? "z-[60] scale-125 opacity-90 shadow-2xl ring-4 ring-yellow-400 cursor-grabbing transition-none" : ""
                                            )}
                                            style={{
                                                left: `${x}%`,
                                                top: `${y}%`,
                                                width: widthStyle,
                                                height: heightStyle,
                                                transform: `translate(-50%, -50%) rotate(${sRotation}deg)`,
                                                touchAction: 'none', // Critical for dragging on touch devices without scrolling page
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
                                {tempSpot && tempSpot.floor_level === activeFloor && mapDimensions && (
                                    <div
                                        className="absolute z-60 pointer-events-none"
                                        style={{
                                            left: `${tempSpot.x_coord}%`,
                                            top: `${tempSpot.y_coord}%`,
                                            width: `${((tempSpot.width || spotWidth) / mapDimensions.width) * 100}%`,
                                            height: `${((tempSpot.height || spotHeight) / mapDimensions.height) * 100}%`,
                                            transform: `translate(-50%, -50%) rotate(${tempSpot.rotation || 0}deg)`,
                                        }}
                                    >
                                        <div className="w-full h-full bg-blue-500/40 border-2 border-dashed border-white rounded shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-pulse flex items-center justify-center">
                                            <div className="w-2 h-2 bg-white rounded-full"></div>
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
