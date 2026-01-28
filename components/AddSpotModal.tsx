
import React, { useState, useEffect } from 'react';
import { X, Save, MapPin, Loader2 } from 'lucide-react';

interface AddSpotModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (spotNumber: string, status: number) => void;
    coordinates: { x: number; y: number };
    floor: number;
    zoneName: string;
    isLoading: boolean;
    errorMessage: string | null;
}

export function AddSpotModal({
    isOpen,
    onClose,
    onSave,
    coordinates,
    floor,
    zoneName,
    isLoading,
    errorMessage,
}: AddSpotModalProps) {
    const [spotNumber, setSpotNumber] = useState('');
    const [status, setStatus] = useState(0); // 0: Available, 1: Reserved, 2: Occupied

    // specific effect to reset form when opening
    useEffect(() => {
        if (isOpen) {
            setSpotNumber('');
            setStatus(0);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!spotNumber.trim()) return;
        onSave(spotNumber, status);
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="w-full max-w-md bg-white/30 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl p-8 relative overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decorative background blob */}
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                            <MapPin className="text-blue-600" />
                            New Spot
                        </h2>
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="p-2 hover:bg-white/50 rounded-full transition-colors text-slate-600 disabled:opacity-50"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-4 mb-6 text-sm text-slate-600 bg-white/50 p-4 rounded-xl border border-white/50">
                        <div className="flex justify-between">
                            <span className="font-semibold">Zone:</span>
                            <span>{zoneName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-semibold">Floor:</span>
                            <span>{floor === 0 ? 'Ground' : floor}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-semibold">Coordinates:</span>
                            <span className="font-mono text-xs">{coordinates.x}%, {coordinates.y}%</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Spot Number
                            </label>
                            <input
                                type="text"
                                value={spotNumber}
                                onChange={(e) => setSpotNumber(e.target.value)}
                                placeholder="e.g. A-101"
                                disabled={isLoading}
                                className="w-full px-4 py-3 bg-white/70 border border-white/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 font-semibold disabled:opacity-50"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Initial Status
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { val: 0, label: 'Available', color: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' },
                                    { val: 1, label: 'Reserved', color: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200' },
                                    { val: 2, label: 'Occupied', color: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200' },
                                ].map((opt) => (
                                    <button
                                        key={opt.val}
                                        type="button"
                                        onClick={() => setStatus(opt.val)}
                                        disabled={isLoading}
                                        className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all disabled:opacity-50 ${status === opt.val ? 'ring-2 ring-offset-1 ring-blue-500 ' + opt.color.replace('100', '200') : opt.color
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {errorMessage && (
                            <div className="p-3 bg-red-100 border border-red-200 text-red-700 text-sm rounded-xl font-medium">
                                Error: {errorMessage}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isLoading}
                                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!spotNumber.trim() || isLoading}
                                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                {isLoading ? 'Saving...' : 'Save Spot'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
