'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { InteractiveMap } from '@/components/InteractiveMap';
import { MapControls, ZoneData } from '@/components/MapControls';
import { AddSpotModal } from '@/components/AddSpotModal';
import { useRealtimeSpots, Spot } from '@/hooks/useRealtimeSpots';
import { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { supabase } from '@/lib/supabaseClient';
import { MapPin, ZoomIn, ZoomOut, User, Navigation, LogOut, Loader2, DoorOpen, XCircle, CheckCircle2, Layers, ChevronDown, ChevronUp, Car } from 'lucide-react';
import { clsx } from 'clsx';
import { useUser } from '@/contexts/UserContext';

export default function MapPage() {
    const router = useRouter();
    const [zones, setZones] = useState<ZoneData[]>([]);
    const [currentZoneId, setCurrentZoneId] = useState<number | null>(null);
    const [currentFloor, setCurrentFloor] = useState(0);
    const [adminMode, setAdminMode] = useState(false);
    const [showAdminPanel, setShowAdminPanel] = useState(false); // Default collapsed on mobile
    const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
    const { role, userId } = useUser();
    const [loadingZones, setLoadingZones] = useState(true);

    // Admin Add Spot State
    const [isAddMode, setIsAddMode] = useState(false);
    const [startSpot, setStartSpot] = useState<{ x: number, y: number } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Gate configuration
    const [gateLocation, setGateLocation] = useState<{ x: number, y: number } | null>(null);
    const [isSetGateMode, setIsSetGateMode] = useState(false);

    // Spot Config State
    const [spotWidth, setSpotWidth] = useState(60);
    const [spotHeight, setSpotHeight] = useState(100);
    const [isSavingConfig, setIsSavingConfig] = useState(false);

    const mapRef = useRef<ReactZoomPanPinchRef>(null);
    const { spots, loading: spotsLoading, status, updateSpot, addSpot, removeSpot } = useRealtimeSpots();

    // Fetch Zones on Mount
    useEffect(() => {
        const fetchZones = async () => {
            const { data, error } = await supabase
                .from('zones')
                .select('*')
                .order('id', { ascending: true });

            if (data) {
                setZones(data as ZoneData[]);
                // Default to first zone if available and none selected
                if (!currentZoneId && data.length > 0) {
                    setCurrentZoneId(data[0].id);
                }
            } else if (error) {
                console.error('Error fetching zones:', error);
            }
            setLoadingZones(false);
        };
        fetchZones();

        // Subscribe to Zone changes (for gate and spot settings)
        const channel = supabase
            .channel('realtime_zones')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'zones',
                },
                (payload) => {
                    console.log('Zone Update:', payload);
                    const updatedZone = payload.new as ZoneData;
                    setZones((prev) =>
                        prev.map((z) => (z.id === updatedZone.id ? updatedZone : z))
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Sync state when zone changes
    useEffect(() => {
        if (currentZoneId && zones.length > 0) {
            const zone = zones.find(z => z.id === currentZoneId);
            if (zone) {
                // If the DB has values, use them. Otherwise default.
                // We use || to fallback if 0 somehow or null
                setSpotWidth(zone.spot_width || 60);
                setSpotHeight(zone.spot_height || 100);
            }
        }
    }, [currentZoneId, zones]);

    // Fetch Gate Location when zone changes
    useEffect(() => {
        if (!currentZoneId) {
            setGateLocation(null);
            return;
        }

        // Find in local state first if we have full data, otherwise fetch
        const zone = zones.find(z => z.id === currentZoneId);
        // We might need to fetch fresh gate coords if they change, but for now local state is okay 
        // IF we updated the local state on change.
        // Better to fetch specific gate coords to ensure freshness or use Realtime for zones too.
        // For simplicity, let's fetch fresh gate coords.
        const fetchGate = async () => {
            const { data, error } = await supabase
                .from('zones')
                .select('gate_x, gate_y, spot_width, spot_height')
                .eq('id', currentZoneId)
                .single();

            if (data) {
                if (data.gate_x && data.gate_y) {
                    setGateLocation({ x: data.gate_x, y: data.gate_y });
                } else {
                    setGateLocation(null);
                }

                // Also ensuring we have freshest dimensions
                if (data.spot_width) setSpotWidth(data.spot_width);
                if (data.spot_height) setSpotHeight(data.spot_height);
            }
        };
        fetchGate();
    }, [currentZoneId, zones]); // Included zones in dep to re-run if zones refresh

    // Derived active zone
    const activeZone = zones.find(z => z.id === currentZoneId);

    // Filter spots for active zone
    const zoneSpots = useMemo(() => {
        return spots.filter((s) => s.zone_id === currentZoneId);
    }, [spots, currentZoneId]);

    // --- Actions ---

    // Save Spot Config
    const handleSaveSpotConfig = async () => {
        if (!currentZoneId) return;
        setIsSavingConfig(true);
        const { error } = await supabase
            .from('zones')
            .update({
                spot_width: spotWidth,
                spot_height: spotHeight
            })
            .eq('id', currentZoneId);

        setIsSavingConfig(false);

        if (error) {
            // Helper to auto-fix schema if missing
            if (error.message?.includes('column "spot_width" of relation "zones" does not exist')) {
                alert('Database schema is missing "spot_width/height". Please ask developer to run update_zones_schema.sql');
            } else {
                alert('Error saving config: ' + error.message);
            }
        } else {
            // Update local state for zones to reflect changes without reload
            setZones(prev => prev.map(z => z.id === currentZoneId ? { ...z, spot_width: spotWidth, spot_height: spotHeight } : z));
            alert('Spot settings saved!');
        }
    };

    // Rotate Spot
    const handleRotateSpot = () => {
        setSpotWidth(spotHeight);
        setSpotHeight(spotWidth);
    };

    const handleFindNearest = () => {
        if (!gateLocation) {
            alert('Gate location not set! Please ask an admin to set the entrance.');
            return;
        }

        const availableSpots = zoneSpots.filter(s => s.status === 0);

        if (availableSpots.length === 0) {
            alert('Sorry, no parking spots are available in this zone!');
            return;
        }

        // Sort: Floor (closest to ground ideally? Or current floor?) -> Distance
        // Assuming we want closest to gate regardless of floor, but maybe prefer current floor?
        // Let's stick to simple: Floor asc, then Distance.
        availableSpots.sort((a, b) => {
            if (a.floor_level !== b.floor_level) {
                // Prefer lower floors (closer to exit usually)
                return a.floor_level - b.floor_level;
            }
            const distA = Math.hypot(a.x_coord - gateLocation.x, a.y_coord - gateLocation.y);
            const distB = Math.hypot(b.x_coord - gateLocation.x, b.y_coord - gateLocation.y);
            return distA - distB;
        });

        const bestSpot = availableSpots[0];

        if (bestSpot.floor_level !== currentFloor) {
            setCurrentFloor(bestSpot.floor_level);
        }

        // Timeout to allow floor switch render
        setTimeout(() => {
            handleSpotSelect(bestSpot);
        }, 100);
    };

    const handleSpotSelect = (spot: Spot) => {
        setSelectedSpot(spot);
        if (mapRef.current) {
            const node = document.getElementById(`spot-${spot.id}`);
            if (node) {
                mapRef.current.zoomToElement(node, 2.5, 1000, "easeOut");
            } else {
                mapRef.current.centerView(1.5, 500, "easeInOutQuad");
            }
        }
    };

    const handleRemoveGate = async () => {
        if (!currentZoneId) return;
        if (confirm('Permanently remove the entrance for this zone/floor?')) {
            const { error } = await supabase
                .from('zones')
                .update({ gate_x: null, gate_y: null })
                .eq('id', currentZoneId);

            if (error) {
                alert('Error removing gate: ' + error.message);
            } else {
                setGateLocation(null);
                alert('Entrance removed successfully.');
            }
        }
    };

    // Admin Interactions
    const handleMapClick = async (x: number, y: number) => {
        if (isSetGateMode && currentZoneId) {
            const { error } = await supabase
                .from('zones')
                .update({ gate_x: Math.round(x), gate_y: Math.round(y) })
                .eq('id', currentZoneId);

            if (error) {
                alert('Failed to set gate: ' + error.message);
            } else {
                setGateLocation({ x: Math.round(x), y: Math.round(y) });
                setIsSetGateMode(false);
                alert('Gate Location Updated Successfully!');
            }
            return;
        }

        setStartSpot({ x, y });
        setSaveError(null);
        setIsAddMode(true);
    };

    const handleSaveSpot = async (spotNumber: string, status: number) => {
        if (!startSpot || !currentZoneId) return;
        setIsSaving(true);
        setSaveError(null);

        const { data, error } = await supabase
            .from('spots')
            .insert([
                {
                    zone_id: currentZoneId,
                    spot_number: spotNumber,
                    floor_level: currentFloor,
                    status,
                    x_coord: Math.round(startSpot.x),
                    y_coord: Math.round(startSpot.y),
                }
            ])
            .select()
            .single();

        setIsSaving(false);

        if (error) {
            console.error('Save Error:', error);
            setSaveError(error.message || 'Unknown error occurred');
        } else {
            if (data) {
                addSpot(data as Spot); // Optimistic / Immediate Update
            }
            setIsAddMode(false);
            setStartSpot(null);
        }
    };

    const updateSpotStatus = async (status: number) => {
        if (!selectedSpot || !userId) return;

        // Check for existing reservation if trying to reserve (status 1)
        if (status === 1) {
            const { count, error: checkError } = await supabase
                .from('spots')
                .select('*', { count: 'exact', head: true })
                .eq('reserved_by', userId)
                .in('status', [1, 2]);

            if (checkError) {
                console.error('Error checking reservations:', checkError);
                return;
            }

            if (count && count > 0) {
                alert('You already have an active reservation or parked car. Please complete or cancel it first.');
                return;
            }
        }

        const updates: any = { status };
        if (status === 0) {
            updates.reserved_by = null;
            updates.reserved_at = null;
        } else {
            updates.reserved_by = userId;
            if (status === 1) {
                updates.reserved_at = new Date().toISOString();
            }
        }

        // Optimistic Update
        updateSpot(selectedSpot.id, updates);

        // Clear selection immediately for better UX
        setSelectedSpot(null);

        const { error } = await supabase
            .from('spots')
            .update(updates)
            .eq('id', selectedSpot.id);

        if (error) {
            alert('Error updating spot: ' + error.message);
            // Revert would go here, but for now we rely on user refresh if it fails badly
        } else {
            if (status === 1) {
                router.push('/dashboard/profile');
            }
        }
    }

    const handleSpotMoveEnd = async (id: number, x: number, y: number) => {
        if (!userId || !adminMode) return;

        const roundedX = Math.round(x);
        const roundedY = Math.round(y);

        // Optimistic Update
        updateSpot(id, { x_coord: roundedX, y_coord: roundedY });

        const { error } = await supabase
            .from('spots')
            .update({ x_coord: roundedX, y_coord: roundedY })
            .eq('id', id);

        if (error) {
            console.error('Error updating spot position:', error);
            alert('Failed to save new position: ' + error.message);
        }
    };

    if (loadingZones || spotsLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-blue-600" /> <span className="ml-2">Loading Map...</span></div>;

    if (!activeZone) return <div className="p-8 text-center text-slate-500">No zones active. Please add a zone in Admin dashboard.</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] md:h-[calc(100vh-100px)] relative overflow-hidden md:static">
            {/* Header / Top Bar */}
            <div className="shrink-0 z-20 bg-white px-3 py-2 shadow-sm md:static md:bg-transparent md:shadow-none md:p-0 md:mb-4 flex justify-between items-center transition-all border-b md:border-b-0 border-slate-100">
                <div>
                    <h2 className="text-sm md:text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <span className="hidden md:inline">Interactive Map</span>
                        <span className="md:hidden">Prkng Map</span>
                    </h2>
                    <p className="text-slate-500 text-xs md:text-sm flex items-center gap-2">
                        <span>{activeZone.name} • {activeZone.type === 'building' ? `Floor ${currentFloor}` : 'Ground'}</span>
                        <span className={clsx(
                            "text-[10px] md:text-xs px-1.5 py-0.5 rounded-full border",
                            status === 'SUBSCRIBED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                        )}>
                            {status === 'SUBSCRIBED' ? 'LIVE' : 'OFFLINE'}
                        </span>
                    </p>
                </div>

                {/* Find Nearest Button (Visible on all sizes) */}
                {/* Find Nearest Button (Visible on all sizes) */}
                <button
                    onClick={handleFindNearest}
                    className="fixed top-3 right-14 z-50 md:static flex bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 md:px-6 md:py-2 rounded-full font-bold shadow-lg shadow-blue-200 items-center space-x-2 transition-all hover:scale-105 active:scale-95 text-xs md:text-base"
                >
                    <Navigation size={16} className="md:w-[18px] md:h-[18px]" />
                    <span>Find Nearest Spot</span>
                </button>
            </div>{/* Admin Toolbar (Collapsible) */}

            {/* Admin Toolbar (Collapsible) */}
            {role === 'admin' && adminMode && (
                <div className="absolute top-[52px] md:top-[60px] left-2 right-2 md:left-0 md:right-0 z-40 md:static md:px-0 md:shrink-0 md:mb-4 animate-in slide-in-from-top-2 pointer-events-none">
                    <div className="pointer-events-auto">
                        <button
                            onClick={() => setShowAdminPanel(!showAdminPanel)}
                            className="w-full md:w-auto mb-2 flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg md:rounded-full hover:bg-slate-700 transition-colors shadow-lg md:shadow-none mx-auto"
                        >
                            {showAdminPanel ? (
                                <>Close Admin Panel <ChevronDown size={14} /></>
                            ) : (
                                <>Open Admin Panel <ChevronUp size={14} /></>
                            )}
                        </button>

                        {showAdminPanel && (
                            <div className="space-y-4 animate-in slide-in-from-top-5 max-h-[60vh] overflow-y-auto md:max-h-none md:overflow-visible custom-scrollbar bg-white/95 md:bg-transparent p-2 rounded-xl shadow-2xl md:shadow-none md:p-0 backdrop-blur-md border border-slate-200/50">
                                {/* Top Bar with Gate/Actions */}
                                <div className="p-3 md:p-4 bg-slate-800 rounded-xl text-white flex gap-3 md:gap-4 items-center flex-wrap shadow-lg">
                                    <span className="font-mono text-green-400 font-bold text-sm md:text-base">ADMIN</span>
                                    <div className="h-4 w-px bg-slate-600 mx-1 md:h-6 md:mx-2"></div>

                                    <button
                                        onClick={() => setIsSetGateMode(!isSetGateMode)}
                                        className={clsx(
                                            "px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold transition-all flex items-center gap-2 text-xs md:text-sm",
                                            isSetGateMode
                                                ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] scale-105"
                                                : "bg-slate-700 hover:bg-slate-600 text-slate-200"
                                        )}
                                    >
                                        <DoorOpen size={16} />
                                        {isSetGateMode ? 'Set Entrance' : 'Set Entrance'}
                                    </button>

                                    {gateLocation && (
                                        <button
                                            onClick={handleRemoveGate}
                                            className="px-3 py-1.5 bg-red-900/50 hover:bg-red-900 text-red-200 rounded-lg text-xs md:text-sm font-semibold border border-red-800 transition-all flex items-center gap-2"
                                        >
                                            <XCircle size={14} />
                                            Remove
                                        </button>
                                    )}
                                </div>

                                {/* Spot Configuration Panel */}
                                <div className="p-3 md:p-4 bg-white rounded-xl border-2 border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 md:p-2 bg-purple-100 rounded-lg text-purple-600">
                                            <Layers size={18} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm md:text-base">Spot Size</h4>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 items-center flex-1 w-full md:w-auto">
                                        <div className="flex-1 space-y-1">
                                            <div className="flex justify-between text-[10px] md:text-xs font-bold text-slate-500">
                                                <label>Width</label>
                                                <span>{spotWidth}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="5" max="150" step="1"
                                                value={spotWidth}
                                                onChange={(e) => setSpotWidth(Number(e.target.value))}
                                                className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex justify-between text-[10px] md:text-xs font-bold text-slate-500">
                                                <label>Height</label>
                                                <span>{spotHeight}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="5" max="150" step="1"
                                                value={spotHeight}
                                                onChange={(e) => setSpotHeight(Number(e.target.value))}
                                                className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-2 w-full md:w-auto">
                                        <button
                                            onClick={handleRotateSpot}
                                            className="flex-1 md:flex-none px-3 py-1.5 md:px-4 md:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-xs md:text-sm"
                                            title="Swap Width and Height"
                                        >
                                            <Navigation className="rotate-90" size={14} /> Rotate
                                        </button>
                                        <button
                                            onClick={handleSaveSpotConfig}
                                            disabled={isSavingConfig}
                                            className="flex-1 md:flex-none px-4 py-1.5 md:px-6 md:py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 text-xs md:text-sm"
                                        >
                                            {isSavingConfig ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <MapControls
                zones={zones}
                currentZoneId={currentZoneId}
                currentFloor={currentFloor}
                devMode={role === 'admin' ? adminMode : false}
                isAdmin={role === 'admin'}
                onZoneChange={(id) => {
                    setCurrentZoneId(id);
                    setCurrentFloor(0);
                }}
                onFloorChange={setCurrentFloor}
                onDevModeToggle={() => role === 'admin' && setAdminMode(!adminMode)}
                className="shrink-0 p-2 md:mb-4 shadow-sm border-b md:border-b-0 border-slate-100"
            />

            <div className="flex-1 relative min-h-0 shadow-none md:shadow-2xl rounded-none md:rounded-2xl overflow-hidden border-0 md:border-4 border-slate-100 bg-slate-100">
                <InteractiveMap
                    ref={mapRef}
                    // Use dynamic image URL, fallback to placeholder if missing
                    imageUrl={activeZone.image_url || '/placeholder-map.png'}
                    spots={zoneSpots}
                    activeFloor={currentFloor}
                    devMode={adminMode}
                    onSpotClick={handleSpotSelect}
                    onMapClick={handleMapClick}
                    tempSpot={startSpot ? { x_coord: startSpot.x, y_coord: startSpot.y, floor_level: currentFloor } : null}
                    selectedSpotId={selectedSpot?.id}
                    gate={gateLocation}
                    onGateClick={() => adminMode && handleRemoveGate()}
                    onSpotMoveEnd={handleSpotMoveEnd}
                    spotWidth={spotWidth}
                    spotHeight={spotHeight}
                />

                {/* --- Add Spot Modal --- */}
                {startSpot && (
                    <AddSpotModal
                        isOpen={isAddMode}
                        onClose={() => { setIsAddMode(false); setStartSpot(null); setSaveError(null); }}
                        onSave={handleSaveSpot}
                        coordinates={startSpot}
                        floor={currentFloor}
                        zoneName={activeZone.name}
                        isLoading={isSaving}
                        errorMessage={saveError}
                    />
                )}

                {/* --- Spot Detail Panel --- */}
                {selectedSpot && !isAddMode && (
                    <div className="fixed bottom-0 left-0 right-0 md:absolute md:top-4 md:bottom-auto md:left-auto md:right-4 w-full md:w-72 bg-white/95 backdrop-blur-md p-3 md:p-6 rounded-t-2xl md:rounded-2xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.2)] md:shadow-2xl border-t md:border border-slate-100 md:border-white/50 animate-in slide-in-from-bottom-10 md:slide-in-from-right-10 z-[60]">
                        <div className="flex justify-between items-start mb-2 md:mb-4">
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selected Spot</span>
                                <h3 className="text-xl md:text-3xl font-black text-slate-800">{selectedSpot.spot_number}</h3>
                            </div>
                            <button onClick={() => setSelectedSpot(null)} className="p-1.5 -mr-2 -mt-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                                <ChevronDown className="md:hidden" size={20} />
                                <XCircle className="hidden md:block" size={24} />
                            </button>
                        </div>

                        {/* Spot Actions Logic */}
                        <div className="space-y-2 md:space-y-3">
                            <div className="flex items-center space-x-2 text-xs md:text-sm text-slate-600 mb-2 md:mb-4 p-1.5 md:p-2 bg-slate-50 rounded-lg">
                                <span className={clsx("w-2 h-2 md:w-2.5 md:h-2.5 rounded-full",
                                    selectedSpot.status === 0 ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" :
                                        selectedSpot.status === 1 ? "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                                )} />
                                <span className="font-bold flex-1">
                                    {selectedSpot.status === 0 ? 'Available' : selectedSpot.status === 1 ? 'Reserved' : 'Occupied'}
                                </span>
                                <span className="text-[10px] md:text-xs text-slate-400">
                                    {activeZone?.name} • Floor {selectedSpot.floor_level === 0 ? 'G' : selectedSpot.floor_level}
                                </span>
                            </div>

                            {selectedSpot.status === 0 && (
                                <button
                                    onClick={() => updateSpotStatus(1)}
                                    className="w-full py-2.5 md:py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm md:text-base shadow-lg shadow-purple-200 transition-all flex justify-center items-center space-x-2 active:scale-95"
                                >
                                    <span>Reserve Spot</span>
                                </button>
                            )}

                            {selectedSpot.status === 1 && (
                                <div className="space-y-2">
                                    <p className="text-[10px] md:text-xs text-center text-purple-600 font-medium bg-purple-50 py-1.5 md:py-2 rounded-lg border border-purple-100">Reserved for you</p>
                                    <div className="flex gap-2">
                                        <p className="w-full text-center text-sm text-slate-500 italic">Please go to your profile to confirm or cancel this reservation.</p>
                                    </div>
                                </div>
                            )}

                            {selectedSpot.status === 2 && (
                                selectedSpot.reserved_by === userId ? (
                                    <div className="space-y-2">
                                        <p className="text-[10px] md:text-xs text-center text-green-600 font-medium bg-green-50 py-1.5 md:py-2 rounded-lg border border-green-100">Occupied by you</p>
                                        <div className="flex gap-2">
                                            <p className="w-full text-center text-sm text-slate-500 italic">Go to your profile to leave this spot.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="w-full text-center text-sm text-slate-500 italic">This spot is currently occupied.</p>
                                    </div>
                                )
                            )}

                            {adminMode && (
                                <button
                                    onClick={async () => {
                                        if (confirm(`Delete spot ${selectedSpot.spot_number}?`)) {
                                            const idToDelete = selectedSpot.id;
                                            // Optimistic Delete
                                            removeSpot(idToDelete);
                                            setSelectedSpot(null);

                                            const { error } = await supabase.from('spots').delete().eq('id', idToDelete);
                                            if (error) {
                                                alert(error.message);
                                                // Ideally revert here, but for now relies on refresh if failed
                                            }
                                        }
                                    }}
                                    className="w-full py-2 mt-1 md:mt-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    <XCircle size={14} /> Delete Spot
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
