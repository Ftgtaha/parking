'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { InteractiveMap } from '@/components/InteractiveMap';
import { MapControls, ZoneData } from '@/components/MapControls';
import { AddSpotModal } from '@/components/AddSpotModal';
import { useRealtimeSpots, Spot } from '@/hooks/useRealtimeSpots';
import { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { createClient } from '@supabase/supabase-js';
import { Loader2, Car, Navigation, XCircle, DoorOpen } from 'lucide-react';
import { clsx } from 'clsx';
import { useUser } from '@/contexts/UserContext';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function MapPage() {
    const [zones, setZones] = useState<ZoneData[]>([]);
    const [currentZoneId, setCurrentZoneId] = useState<number | null>(null);
    const [currentFloor, setCurrentFloor] = useState(0);
    const [adminMode, setAdminMode] = useState(false);
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

    const mapRef = useRef<ReactZoomPanPinchRef>(null);
    const { spots, loading: spotsLoading } = useRealtimeSpots();

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
    }, []);

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
                .select('gate_x, gate_y')
                .eq('id', currentZoneId)
                .single();

            if (data && data.gate_x && data.gate_y) {
                setGateLocation({ x: data.gate_x, y: data.gate_y });
            } else {
                setGateLocation(null);
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
                mapRef.current.centerView(1.5, 500, "easeInOut");
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

        const { error } = await supabase
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
            ]);

        setIsSaving(false);

        if (error) {
            console.error('Save Error:', error);
            setSaveError(error.message || 'Unknown error occurred');
        } else {
            setIsAddMode(false);
            setStartSpot(null);
        }
    };

    const updateSpotStatus = async (status: number) => {
        if (!selectedSpot || !userId) return;
        const updates: any = { status };
        if (status === 0) updates.reserved_by = null;
        else updates.reserved_by = userId;

        const { error } = await supabase
            .from('spots')
            .update(updates)
            .eq('id', selectedSpot.id);

        if (error) alert('Error updating spot: ' + error.message);
        else setSelectedSpot(null);
    };

    if (loadingZones || spotsLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-blue-600" /> <span className="ml-2">Loading Map...</span></div>;

    if (!activeZone) return <div className="p-8 text-center text-slate-500">No zones active. Please add a zone in Admin dashboard.</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] relative">
            <div className="mb-4 flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Interactive Map</h2>
                    <p className="text-slate-500 text-sm">
                        {activeZone.name} • {activeZone.type === 'building' ? `Floor ${currentFloor}` : 'Ground'}
                    </p>
                </div>
                <button
                    onClick={handleFindNearest}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center space-x-2 transition-all hover:scale-105 active:scale-95"
                >
                    <Navigation size={18} />
                    <span>Find Nearest Spot</span>
                </button>
            </div>

            {/* Admin Toolbar */}
            {role === 'admin' && adminMode && (
                <div className="mb-4 p-4 bg-slate-800 rounded-xl text-white flex gap-4 items-center animate-in slide-in-from-top-5 flex-wrap">
                    <span className="font-mono text-green-400 font-bold">ADMIN MODE</span>
                    <div className="h-6 w-px bg-slate-600 mx-2"></div>

                    <button
                        onClick={() => setIsSetGateMode(!isSetGateMode)}
                        className={clsx(
                            "px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2",
                            isSetGateMode
                                ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] scale-105"
                                : "bg-slate-700 hover:bg-slate-600 text-slate-200"
                        )}
                    >
                        <DoorOpen size={18} />
                        {isSetGateMode ? 'Click Map to Set Entrance' : 'Set Entrance Location'}
                    </button>

                    {gateLocation && (
                        <button
                            onClick={handleRemoveGate}
                            className="ml-2 px-4 py-2 bg-red-900/50 hover:bg-red-900 text-red-200 rounded-lg text-sm font-semibold border border-red-800 transition-all flex items-center gap-2"
                        >
                            <XCircle size={16} />
                            Remove Entrance
                        </button>
                    )}

                    {!isSetGateMode && (
                        <span className="text-sm text-slate-400">Click map to add spots</span>
                    )}
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
            />

            <div className="flex-1 min-h-0 relative shadow-2xl rounded-2xl overflow-hidden border-4 border-slate-100">
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
                    <div className="absolute top-4 right-4 w-72 bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-white/50 animate-in slide-in-from-right-10 z-50">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Selected Spot</span>
                                <h3 className="text-3xl font-black text-slate-800">{selectedSpot.spot_number}</h3>
                            </div>
                            <button onClick={() => setSelectedSpot(null)} className="text-slate-400 hover:text-slate-600">
                                <XCircle size={24} />
                            </button>
                        </div>
                        {/* Spot Actions Logic (Same as before) */}
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2 text-sm text-slate-600">
                                <span className={clsx("w-3 h-3 rounded-full",
                                    selectedSpot.status === 0 ? "bg-green-500" :
                                        selectedSpot.status === 1 ? "bg-purple-500" : "bg-red-500"
                                )} />
                                <span className="font-medium">
                                    {selectedSpot.status === 0 ? 'Available' : selectedSpot.status === 1 ? 'Reserved' : 'Occupied'}
                                </span>
                            </div>

                            {selectedSpot.status === 0 && (
                                <button
                                    onClick={() => updateSpotStatus(1)}
                                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-lg shadow-purple-200 transition-all flex justify-center items-center space-x-2"
                                >
                                    <span>Reserve Spot</span>
                                </button>
                            )}

                            {/* ... (Keep existing buttons logic) ... */}
                            {selectedSpot.status === 1 && (
                                <div className="space-y-2">
                                    <p className="text-xs text-center text-purple-600 font-medium bg-purple-50 py-2 rounded-lg">Reserved for you</p>
                                    <button onClick={() => updateSpotStatus(2)} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex justify-center items-center gap-2"><Car size={20} /><span>I Parked Here</span></button>
                                    <button onClick={() => updateSpotStatus(0)} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-semibold transition-all">Cancel Reservation</button>
                                </div>
                            )}

                            {selectedSpot.status === 2 && (
                                <button onClick={() => updateSpotStatus(0)} className="w-full py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-medium shadow-xl transition-all">Leaving Spot (Make Free)</button>
                            )}

                            {adminMode && (
                                <button
                                    onClick={async () => {
                                        if (confirm(`Delete spot ${selectedSpot.spot_number}?`)) {
                                            const { error } = await supabase.from('spots').delete().eq('id', selectedSpot.id);
                                            if (error) alert(error.message);
                                            else setSelectedSpot(null);
                                        }
                                    }}
                                    className="w-full py-2 mt-4 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    <XCircle size={16} /> Delete Spot
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
