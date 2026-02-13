
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
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="w-full sm:max-w-md bg-white/95 sm:bg-white/80 backdrop-blur-xl border-t sm:border border-white/40 shadow-2xl rounded-t-3xl sm:rounded-3xl p-5 sm:p-8 relative overflow-hidden transition-all animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decorative background blob */}
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-4 sm:mb-6">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2">
                            <MapPin className="text-blue-600" size={20} />
                            New Spot
                        </h2>
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="p-1.5 hover:bg-white/50 rounded-full transition-colors text-slate-600 disabled:opacity-50"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-2 sm:space-y-4 mb-4 sm:mb-6 text-xs sm:text-sm text-slate-600 bg-white/50 p-3 sm:p-4 rounded-xl border border-white/50">
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
                            <span className="font-mono text-[10px] sm:text-xs">{coordinates.x}%, {coordinates.y}%</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                        <div>
                            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1 sm:mb-2">
                                Spot Number
                            </label>
                            <input
                                type="text"
                                value={spotNumber}
                                onChange={(e) => setSpotNumber(e.target.value)}
                                placeholder="e.g. A-101"
                                disabled={isLoading}
                                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-white/70 border border-white/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 font-semibold disabled:opacity-50 text-sm"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1 sm:mb-2">
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
                                        className={`py-2 px-1 rounded-lg text-[10px] sm:text-xs font-bold border transition-all disabled:opacity-50 ${status === opt.val ? 'ring-2 ring-offset-1 ring-blue-500 ' + opt.color.replace('100', '200') : opt.color
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>



                        {errorMessage && (
                            <div className="p-3 bg-red-100 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl font-medium">
                                Error: {errorMessage}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isLoading}
                                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors disabled:opacity-50 text-xs sm:text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!spotNumber.trim() || isLoading}
                                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                            >
                                {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                {isLoading ? 'Saving...' : 'Save Spot'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
