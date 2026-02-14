import React from 'react';
import { DoorOpen, X } from 'lucide-react';
import { clsx } from 'clsx';

interface Gate {
    id: number;
    name: string;
    x: number;
    y: number;
}

interface GateSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    gates: Gate[];
    onSelectGate: (gateId: number) => void;
    selectedGateId: number | null;
}

export function GateSelectionModal({ isOpen, onClose, gates, onSelectGate, selectedGateId }: GateSelectionModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center pointer-events-none">
            {/* Backdrop */}
            {/* Backdrop - Removed blur and reduced opacity to near zero so user can see map clearly */}
            <div
                className="absolute inset-0 bg-black/5 pointer-events-auto transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content - Added some transparency/blur to the modal itself to look modern but keep context */}
            <div className="w-full md:w-[400px] bg-white/95 backdrop-blur-md rounded-t-2xl md:rounded-2xl p-6 shadow-2xl pointer-events-auto transform transition-all animate-in slide-in-from-bottom duration-300 border border-slate-200/50">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Where are you entering from?</h3>
                        <p className="text-slate-500 text-sm mt-1">Select your entrance to find the best spot.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto">
                    {gates.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <p>No entrances found.</p>
                        </div>
                    ) : (
                        gates.map((gate) => (
                            <button
                                key={gate.id}
                                onClick={() => onSelectGate(gate.id)}
                                className={clsx(
                                    "flex items-center p-4 rounded-xl border-2 transition-all group",
                                    selectedGateId === gate.id
                                        ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                                        : "border-slate-100 bg-white hover:border-blue-200 hover:bg-slate-50 text-slate-700"
                                )}
                            >
                                <div className={clsx(
                                    "p-3 rounded-full mr-4 transition-colors",
                                    selectedGateId === gate.id
                                        ? "bg-blue-100 text-blue-600"
                                        : "bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-blue-500"
                                )}>
                                    <DoorOpen size={24} />
                                </div>
                                <div className="text-left">
                                    <span className="block font-bold text-lg">{gate.name}</span>
                                    {selectedGateId === gate.id && (
                                        <span className="text-xs font-semibold text-blue-600 animate-pulse">Running "Find Spot" from here...</span>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
