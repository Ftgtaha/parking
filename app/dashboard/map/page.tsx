'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { InteractiveMap } from '@/components/InteractiveMap';
import { MapControls, ZoneData } from '@/components/MapControls';
import { AddSpotModal } from '@/components/AddSpotModal';
import { GateSelectionModal } from '@/components/GateSelectionModal';
import { useRealtimeSpots, Spot } from '@/hooks/useRealtimeSpots';
import { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { supabase } from '@/lib/supabaseClient';
import { MapPin, ZoomIn, ZoomOut, User, Navigation, LogOut, Loader2, DoorOpen, XCircle, CheckCircle2, Layers, ChevronDown, ChevronUp, Car, Copy } from 'lucide-react';
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
    const [gates, setGates] = useState<{ id: number; x: number; y: number; name: string }[]>([]);
    const [selectedGateId, setSelectedGateId] = useState<number | null>(null);
    const [isSetGateMode, setIsSetGateMode] = useState(false);
    const [gateNameInput, setGateNameInput] = useState('');
    const [isGateModalOpen, setIsGateModalOpen] = useState(false);

    // Spot Config State
    const [spotWidth, setSpotWidth] = useState(60);
    const [spotHeight, setSpotHeight] = useState(100);
    const [spotRotation, setSpotRotation] = useState(0);
    const [isSavingConfig, setIsSavingConfig] = useState(false);

    // Multi-Select State
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
    const [selectedSpotIds, setSelectedSpotIds] = useState<number[]>([]);

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
                // Only set these if NO spot is selected, otherwise we might overwrite spot editing
                if (!selectedSpot) {
                    setSpotWidth(zone.spot_width || 60);
                    setSpotHeight(zone.spot_height || 100);
                }
            }
        }
    }, [currentZoneId, zones, selectedSpot]); // added selectedSpot dependency to prevent overwrite

    // Sync selectedSpot with realtime data
    useEffect(() => {
        if (selectedSpot) {
            const updated = spots.find(s => s.id === selectedSpot.id);
            if (updated) {
                // We only update the non-dimensional properties to avoid jitter/reset while editing
                // OR we can update everything but we must safeguard the slider state.
                // actually, if we are dragging the slider, the local state (spotWidth) is the source of truth.
                // The realtime update might bring in the "old" width before our save commits.
                // So we should NOT update selectedSpot's width/height from realtime while we are editing?
                // For now, let's just keep selectedSpot fresh but NOT reset sliders.
                setSelectedSpot(updated);
            } else {
                // Spot deleted?
                setSelectedSpot(null);
            }
        }

    }, [spots]);

    // Keyboard controls for moving selected spot
    useEffect(() => {
        if (!selectedSpot || !adminMode) return;

        const handleKeyDown = async (e: KeyboardEvent) => {
            // Ignore if typing in an input
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

            const step = e.shiftKey ? 1.0 : 0.1; // Shift for faster movement
            let dx = 0;
            let dy = 0;

            switch (e.key) {
                case 'ArrowUp': dy = -step; break;
                case 'ArrowDown': dy = step; break;
                case 'ArrowLeft': dx = -step; break;
                case 'ArrowRight': dx = step; break;
                default: return; // Exit if not an arrow key
            }

            e.preventDefault(); // Prevent scrolling

            // Calculate new coords
            const newX = Math.round((selectedSpot.x_coord + dx) * 100) / 100;
            const newY = Math.round((selectedSpot.y_coord + dy) * 100) / 100;

            // Optimistic update
            updateSpot(selectedSpot.id, { x_coord: newX, y_coord: newY });

            // Persist to DB (Debouncing would be better but this is simple for now)
            const { error } = await supabase
                .from('spots')
                .update({ x_coord: newX, y_coord: newY })
                .eq('id', selectedSpot.id);

            if (error) console.error("Move error:", error);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedSpot, adminMode]);

    // We use || to fallback if 0 somehow or null
    // This logic handles initial zone load defaults




    // Fetch Gates when zone changes
    useEffect(() => {
        if (!currentZoneId) {
            setGates([]);
            setSelectedGateId(null);
            return;
        }

        const fetchGates = async () => {
            const { data, error } = await supabase
                .from('gates')
                .select('*')
                .eq('zone_id', currentZoneId)
                .order('id', { ascending: true });

            if (data) {
                setGates(data.map(g => ({ id: g.id, x: g.x_coord, y: g.y_coord, name: g.name })));
            } else if (error) {
                console.error('Error fetching gates:', error);
            }
        };

        fetchGates();

        // Also ensure spot dims are fresh (from existing logic)
        const zone = zones.find(z => z.id === currentZoneId);
        if (zone) {
            if (zone.spot_width) setSpotWidth(zone.spot_width);
            if (zone.spot_height) setSpotHeight(zone.spot_height);
        }
    }, [currentZoneId, zones]);

    // Derived active zone
    const activeZone = zones.find(z => z.id === currentZoneId);

    // Filter spots for active zone
    const zoneSpots = useMemo(() => {
        return spots.filter((s) => s.zone_id === currentZoneId);
    }, [spots, currentZoneId]);

    // Auto-select single gate
    useEffect(() => {
        if (gates.length === 1 && !selectedGateId) {
            setSelectedGateId(gates[0].id);
        }
    }, [gates, selectedGateId]);

    // --- Actions ---

    // Save Spot Config
    // Save Spot Config (Context Aware)
    const handleSaveSpotConfig = async () => {
        setIsSavingConfig(true);

        if (selectedSpot) {
            // Save to Specific Spot
            const { error } = await supabase
                .from('spots')
                .update({
                    width: spotWidth,
                    height: spotHeight
                })
                .eq('id', selectedSpot.id);

            if (error) {
                alert('Error saving spot size: ' + error.message);
            } else {
                // Update local selectedSpot with new dims to prevent "jumping" back
                setSelectedSpot({ ...selectedSpot, width: spotWidth, height: spotHeight });
                alert('Spot size updated!');
            }
        } else {
            // Save to Zone Defaults
            if (!currentZoneId) return;
            const { error } = await supabase
                .from('zones')
                .update({
                    spot_width: spotWidth,
                    spot_height: spotHeight
                })
                .eq('id', currentZoneId);

            if (error) {
                if (error.message?.includes('column "spot_width" of relation "zones" does not exist')) {
                    alert('Database schema is missing columns. Please ask developer to fix.');
                } else {
                    alert('Error saving config: ' + error.message);
                }
            } else {
                setZones(prev => prev.map(z => z.id === currentZoneId ? { ...z, spot_width: spotWidth, spot_height: spotHeight } : z));
                alert('Zone default spot settings saved!');
            }
        }
        setIsSavingConfig(false);
    };

    // Rotate Spot
    // Rotate Spot
    const handleRotateSpot = () => {
        // Swap dimensions
        const newW = spotHeight;
        const newH = spotWidth;
        setSpotWidth(newW);
        setSpotHeight(newH);

        // Instant update if spot selected
        if (selectedSpot) {
            updateSpot(selectedSpot.id, { width: newW, height: newH });
        }
    };

    const handleRotationChange = (val: number) => {
        setSpotRotation(val);
        if (selectedSpot) updateSpot(selectedSpot.id, { rotation: val });
    };

    const handleWidthChange = (val: number) => {
        setSpotWidth(val);
        if (selectedSpot) updateSpot(selectedSpot.id, { width: val });
    };

    const handleHeightChange = (val: number) => {
        setSpotHeight(val);
        if (selectedSpot) updateSpot(selectedSpot.id, { height: val });
    };

    const handleFindNearest = () => {
        if (gates.length === 0) {
            alert('No entrances found! Please ask an admin to set an entrance.');
            return;
        }

        if (!selectedGateId) {
            setIsGateModalOpen(true);
            return;
        }

        const selectedGate = gates.find(g => g.id === selectedGateId);
        if (!selectedGate) return;

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
            const distA = Math.hypot(a.x_coord - selectedGate.x, a.y_coord - selectedGate.y);
            const distB = Math.hypot(b.x_coord - selectedGate.x, b.y_coord - selectedGate.y);
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
        if (isMultiSelectMode) {
            setSelectedSpotIds(prev => {
                if (prev.includes(spot.id)) {
                    return prev.filter(id => id !== spot.id);
                }
                return [...prev, spot.id];
            });
            // Clear single select to avoid confusion
            setSelectedSpot(null);
            return;
        }

        setSelectedSpot(spot);
        // Sync sliders to this spot's dims
        // We only do this ONCE when selecting the spot.
        setSpotWidth(spot.width || activeZone?.spot_width || 60);
        setSpotHeight(spot.height || activeZone?.spot_height || 100);
        setSpotRotation(spot.rotation || 0);

        if (mapRef.current) {
            const node = document.getElementById(`spot-${spot.id}`);
            if (node) {
                mapRef.current.zoomToElement(node, 2.5, 1000, "easeOut");
            } else {
                mapRef.current.centerView(1.5, 500, "easeInOutQuad");
            }
        }
    };

    const handleBulkDelete = async () => {
        if (selectedSpotIds.length === 0) return;

        if (!confirm(`Are you sure you want to delete ${selectedSpotIds.length} selected spots? This cannot be undone.`)) {
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('spots')
                .delete()
                .in('id', selectedSpotIds);

            if (error) throw error;

            // UI update handled by realtime subscription usually, but we can force clear
            setSelectedSpotIds([]);
            setIsMultiSelectMode(false); // Optional: exit mode after delete
            alert('Spots deleted successfully!');
        } catch (err: any) {
            console.error('Bulk Delete Error:', err);
            alert('Failed to delete spots: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSpotDeselect = () => {
        setSelectedSpot(null);
        // Revert sliders to Zone Defaults
        if (activeZone) {
            setSpotWidth(activeZone.spot_width || 60);
            setSpotHeight(activeZone.spot_height || 100);
            setSpotRotation(0);
        }
    };

    const handleRemoveGate = async (id: number) => {
        if (!currentZoneId) return;
        if (confirm('Permanently remove this entrance?')) {
            const { error } = await supabase
                .from('gates')
                .delete()
                .eq('id', id);

            if (error) {
                alert('Error removing gate: ' + error.message);
            } else {
                setGates(prev => prev.filter(g => g.id !== id));
                if (selectedGateId === id) setSelectedGateId(null);
            }
        }
    };

    const handleCopyLayout = async () => {
        if (!currentZoneId || !activeZone) return;

        // confirm with user
        if (!confirm(`Are you sure you want to copy the layout from Floor ${currentFloor === 0 ? 'G' : currentFloor} to ALL other floors in this building?\n\nThis will DELETE existing spots on other floors and replace them.`)) {
            return;
        }

        setIsSaving(true);

        try {
            // 1. Get spots on current floor
            const sourceSpots = spots.filter(s => s.zone_id === currentZoneId && s.floor_level === currentFloor);

            if (sourceSpots.length === 0) {
                alert('No spots to copy on this floor.');
                setIsSaving(false);
                return;
            }

            // 2. Loop through all floors
            const totalFloors = activeZone.total_floors || 1; // Default to 1 if not set
            const targetFloors = [];

            for (let f = 0; f < totalFloors; f++) {
                if (f !== currentFloor) targetFloors.push(f);
            }

            if (targetFloors.length === 0) {
                alert('No other floors to copy to.');
                setIsSaving(false);
                return;
            }

            // 3. Delete existing spots on target floors
            const { error: deleteError } = await supabase
                .from('spots')
                .delete()
                .eq('zone_id', currentZoneId)
                .in('floor_level', targetFloors);

            if (deleteError) throw deleteError;

            // 4. Prepare new spots
            const newSpots: any[] = [];

            targetFloors.forEach(floor => {
                sourceSpots.forEach(spot => {
                    // Cleaner name generation: 
                    // If spot is "A1", on floor 2 it becomes "A1-F2"
                    // If spot is already "A1-F0", strip suffix first? 
                    // check if spot number already has a -F suffix
                    let baseName = spot.spot_number;
                    const suffixRegex = /-F\d+$/;
                    if (suffixRegex.test(baseName)) {
                        baseName = baseName.replace(suffixRegex, '');
                    }

                    newSpots.push({
                        zone_id: currentZoneId,
                        spot_number: `${baseName}-F${floor === 0 ? 'G' : floor}`, // -F2, -FG
                        floor_level: floor,
                        x_coord: spot.x_coord,
                        y_coord: spot.y_coord,
                        width: spot.width,
                        height: spot.height,
                        rotation: spot.rotation,
                        status: 0, // Always available

                    });
                });
            });

            // 5. Insert new spots
            const { error: insertError } = await supabase
                .from('spots')
                .insert(newSpots);

            if (insertError) throw insertError;

            alert(`Successfully copied layout to ${targetFloors.length} floors!`);
            // Realtime subscription should handle updating the UI for other floors when we switch

        } catch (err: any) {
            console.error('Copy Layout Error:', err);
            alert('Failed to copy layout: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Admin Interactions
    const handleMapClick = async (x: number, y: number) => {
        if (isSetGateMode && currentZoneId) {
            const name = prompt("Enter name for this entrance (e.g., Gate A):", "New Gate");
            if (!name) return;

            const { data, error } = await supabase
                .from('gates')
                .insert([{
                    zone_id: currentZoneId,
                    name: name,
                    x_coord: Math.round(x),
                    y_coord: Math.round(y)
                }])
                .select()
                .single();

            if (error) {
                alert('Failed to add gate: ' + error.message);
            } else if (data) {
                setGates(prev => [...prev, { id: data.id, x: data.x_coord, y: data.y_coord, name: data.name }]);
                setIsSetGateMode(false);
                alert('Gate Added Successfully!');
            }
            return;
        }

        setStartSpot({ x, y });
        // NOTE: We do NOT reset dimensions here. context-aware sliders determine new spot size.
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
                    width: spotWidth,
                    height: spotHeight,
                    rotation: spotRotation
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

        // Use the value as-is (already rounded to 2 decimals by InteractiveMap)
        // or ensure we keep precision if needed.
        const roundedX = x;
        const roundedY = y;

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

                {/* Selected Gate Indicator (Mobile/Desktop) */}
                {selectedGateId && !adminMode && (
                    <div
                        onClick={() => setIsGateModalOpen(true)}
                        className="hidden md:flex flex-col items-end mr-4 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Entrance</span>
                        <div className="flex items-center gap-1 text-slate-700 font-bold">
                            <DoorOpen size={16} className="text-blue-600" />
                            <span>{gates.find(g => g.id === selectedGateId)?.name}</span>
                        </div>
                    </div>
                )}

                {/* Find Nearest Button (Smart Context) */}
                <button
                    onClick={selectedGateId ? handleFindNearest : () => setIsGateModalOpen(true)}
                    className={clsx(
                        "fixed top-3 right-14 z-50 md:static flex px-4 py-2 md:px-6 md:py-2 rounded-full font-bold shadow-lg items-center space-x-2 transition-all hover:scale-105 active:scale-95 text-xs md:text-base",
                        selectedGateId
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200"
                            : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200 animate-pulse"
                    )}
                >
                    {selectedGateId ? (
                        <>
                            <Navigation size={16} className="md:w-[18px] md:h-[18px]" />
                            <span>Find Nearest Spot</span>
                        </>
                    ) : (
                        <>
                            <DoorOpen size={16} className="md:w-[18px] md:h-[18px]" />
                            <span>Select Entrance</span>
                        </>
                    )}
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
                                {/* Bulk Actions Toolbar */}
                                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-white/50 w-full max-w-lg mx-auto">
                                    <div className="flex gap-2 items-center justify-center mb-4 border-b border-slate-100 pb-4">
                                        <button
                                            onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
                                            className={clsx(
                                                "px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2",
                                                isMultiSelectMode ? "bg-blue-600 text-white shadow-lg ring-2 ring-blue-300" : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                                            )}
                                        >
                                            <Copy size={14} />
                                            {isMultiSelectMode ? 'Done Selecting' : 'Select Multiple'}
                                        </button>

                                        {isMultiSelectMode && selectedSpotIds.length > 0 && (
                                            <button
                                                onClick={handleBulkDelete}
                                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-xs shadow-lg animate-in fade-in flex items-center gap-2"
                                            >
                                                <XCircle size={14} />
                                                Delete ({selectedSpotIds.length})
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {/* Top Bar with Gate/Actions */}
                                <div className="p-3 md:p-4 bg-slate-800 rounded-xl text-white flex gap-3 md:gap-4 items-center flex-wrap shadow-lg">
                                    <span className="font-mono text-green-400 font-bold text-sm md:text-base">ADMIN</span>
                                    <div className="h-4 w-px bg-slate-600 mx-1 md:h-6 md:mx-2"></div>

                                    <button
                                        onClick={handleCopyLayout}
                                        disabled={isSaving}
                                        className="px-3 py-1.5 md:px-4 md:py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-bold transition-all flex items-center gap-2 text-xs md:text-sm disabled:opacity-50"
                                        title="Copy current floor layout to all other floors"
                                    >
                                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                                        <span className="hidden md:inline">Copy Layout</span>
                                    </button>

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
                                        {isSetGateMode ? 'Click Map to Add Gate' : 'Add Entrance'}
                                    </button>

                                    {selectedGateId && (
                                        <button
                                            onClick={() => handleRemoveGate(selectedGateId)}
                                            className="px-3 py-1.5 bg-red-900/50 hover:bg-red-900 text-red-200 rounded-lg text-xs md:text-sm font-semibold border border-red-800 transition-all flex items-center gap-2"
                                        >
                                            <XCircle size={14} />
                                            Remove Selected Gate
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
                                            <h4 className="font-bold text-slate-800 text-sm md:text-base">
                                                {selectedSpot ? `Spot ${selectedSpot.spot_number} Size` : 'Zone Default Size'}
                                            </h4>
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
                                                min="15" max="300" step="1"
                                                value={spotWidth}
                                                onChange={(e) => handleWidthChange(Number(e.target.value))}
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
                                                min="15" max="300" step="1"
                                                value={spotHeight}
                                                onChange={(e) => handleHeightChange(Number(e.target.value))}
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
                    tempSpot={startSpot ? {
                        x_coord: startSpot.x,
                        y_coord: startSpot.y,
                        floor_level: currentFloor,
                        width: spotWidth,
                        height: spotHeight,
                        rotation: spotRotation
                    } : null}
                    selectedSpotId={selectedSpot?.id}
                    gates={gates}
                    selectedGateId={selectedGateId}
                    onGateClick={(id) => setSelectedGateId(id)}
                    onSpotMoveEnd={handleSpotMoveEnd}

                    spotWidth={spotWidth}
                    spotHeight={spotHeight}
                    selectedSpotIds={selectedSpotIds}
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

                {/* --- Gate Selection Modal --- */}
                <GateSelectionModal
                    isOpen={isGateModalOpen}
                    onClose={() => setIsGateModalOpen(false)}
                    gates={gates}
                    selectedGateId={selectedGateId}
                    onSelectGate={(id) => {
                        setSelectedGateId(id);
                        setIsGateModalOpen(false);
                        // Optional: Trigger find nearest immediately?
                        // Let's just select it for now, user can click find again or we can trigger it.
                        // Ideally we trigger it but we need to pass state. 
                        // For now just select.
                    }}
                />

                {/* --- Spot Detail Panel --- */}
                {selectedSpot && !isAddMode && (
                    <div className="fixed bottom-0 left-0 right-0 md:absolute md:top-4 md:bottom-auto md:left-auto md:right-4 w-full md:w-72 bg-white/95 backdrop-blur-md p-3 md:p-6 rounded-t-2xl md:rounded-2xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.2)] md:shadow-2xl border-t md:border border-slate-100 md:border-white/50 animate-in slide-in-from-bottom-10 md:slide-in-from-right-10 z-[60]">
                        <div className="flex justify-between items-start mb-2 md:mb-4">
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selected Spot</span>
                                <h3 className="text-xl md:text-3xl font-black text-slate-800">{selectedSpot.spot_number}</h3>
                            </div>
                            <button onClick={handleSpotDeselect} className="p-1.5 -mr-2 -mt-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
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
