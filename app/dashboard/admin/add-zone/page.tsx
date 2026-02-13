'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Loader2, Upload, Map as MapIcon, CheckCircle, AlertCircle, Building, Sun, Trash2 } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AddZonePage() {
    const { role } = useUser();
    const router = useRouter();

    const [name, setName] = useState('');
    const [type, setType] = useState<'building' | 'outdoor'>('building');
    const [totalFloors, setTotalFloors] = useState<number>(1);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch Zones
    const [zones, setZones] = useState<any[]>([]);
    const [loadingZones, setLoadingZones] = useState(true);

    // Edit State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

    const fetchZones = async () => {
        try {
            const { data, error } = await supabase
                .from('zones')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setZones(data || []);
        } catch (err) {
            console.error('Error fetching zones:', err);
        } finally {
            setLoadingZones(false);
        }
    };

    useEffect(() => {
        if (role === 'admin') {
            fetchZones();
        }
    }, [role]);

    // Initial Role Check - MOVE RETURN AFTER HOOKS
    // Better to let hooks run, and just render access denied if needed, 
    // BUT since we use router.push, we might want to useEffect for redirect or just render differently.
    // simpler to just render the Access Denied view if role check fails, but keep hooks above.

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();

        // If editing, we don't strictly need a NEW file if we have an existing one.
        if (!editingId && (!file || !name)) {
            setError('Please provide both a name and an image.');
            return;
        }
        if (editingId && !file && !currentImageUrl) {
            setError('Please provide a name and an image.');
            return;
        }

        setUploading(true);
        setError(null);

        try {
            let publicUrl = currentImageUrl;

            // 1. Upload Image (if new file selected)
            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `zone-maps/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('parking-assets')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from('parking-assets')
                    .getPublicUrl(filePath);

                publicUrl = data.publicUrl;
            }

            if (!publicUrl) throw new Error("Image URL is missing");

            if (editingId) {
                // UPDATE Existing Zone
                const { error: updateError } = await supabase
                    .from('zones')
                    .update({
                        name,
                        type,
                        total_floors: type === 'building' ? (totalFloors || 1) : 1,
                        image_url: publicUrl,
                    })
                    .eq('id', editingId);

                if (updateError) throw updateError;
                alert('Zone updated successfully!');
            } else {
                // INSERT New Zone
                const { error: insertError } = await supabase
                    .from('zones')
                    .insert([
                        {
                            name,
                            type,
                            total_floors: type === 'building' ? (totalFloors || 1) : 1,
                            image_url: publicUrl,
                            gate_x: 50,
                            gate_y: 50
                        }
                    ]);

                if (insertError) throw insertError;
                alert('Zone added successfully!');
            }

            // Reset Form
            setName('');
            setFile(null);
            setEditingId(null);
            setCurrentImageUrl(null);
            setTotalFloors(1);
            setType('building');

            // Refresh List
            fetchZones();

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'An error occurred');
        } finally {
            setUploading(false);
        }
    };





    const handleDeleteZone = async (id: number, imageUrl: string) => {
        if (!confirm('Are you sure you want to delete this zone? This action cannot be undone.')) return;

        try {
            if (imageUrl) {
                const path = imageUrl.split('/').pop();
                if (path) {
                    await supabase.storage
                        .from('parking-assets')
                        .remove([`zone-maps/${path}`]);
                }
            }

            const { error } = await supabase
                .from('zones')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setZones(prev => prev.filter(z => z.id !== id));
            // If we deleted the one we were editing, reset form
            if (editingId === id) {
                handleCancelEdit();
            }
            alert('Zone deleted successfully.');

        } catch (err: any) {
            console.error('Error deleting zone:', err);
            alert('Error deleting zone: ' + err.message);
        }
    };

    const startEditing = (zone: any) => {
        setEditingId(zone.id);
        setName(zone.name);
        setType(zone.type);
        setTotalFloors(zone.total_floors);
        setCurrentImageUrl(zone.image_url);
        setFile(null); // Reset file input
        setError(null);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setName('');
        setType('building');
        setTotalFloors(1);
        setCurrentImageUrl(null);
        setFile(null);
        setError(null);
    };

    if (role !== 'admin') {
        return <div className="p-8 text-center text-red-500">Access Denied. Admins only.</div>;
    }



    return (
        <div className="max-w-4xl mx-auto p-6 space-y-12">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-8 flex items-center gap-3">
                    <MapIcon className="text-blue-600" />
                    {editingId ? 'Edit Parking Zone' : 'Add New Parking Zone'}
                </h1>

                <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                    <form onSubmit={handleUpload} className="space-y-6">

                        {/* Zone Name */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Zone Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Science Building Parking"
                                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                required
                            />
                        </div>

                        {/* Zone Type */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Zone Type</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setType('building')}
                                    className={`p-4 rounded-xl border-2 text-center transition-all flex flex-col items-center gap-2 ${type === 'building'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold'
                                        : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <Building size={24} />
                                    Building (Indoor)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('outdoor')}
                                    className={`p-4 rounded-xl border-2 text-center transition-all flex flex-col items-center gap-2 ${type === 'outdoor'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold'
                                        : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <Sun size={24} />
                                    Outdoor (Open Air)
                                </button>
                            </div>
                        </div>

                        {/* Total Floors (Only for Building) */}
                        {type === 'building' && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Number of Floors (Including Ground)
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={totalFloors || ''}
                                    onChange={(e) => setTotalFloors(parseInt(e.target.value) || 0)}
                                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    required
                                />
                            </div>
                        )}

                        {/* Image Upload */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Map Image</label>
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                {file ? (
                                    <div className="flex flex-col items-center text-green-600">
                                        <CheckCircle size={32} className="mb-2" />
                                        <span className="font-medium">{file.name}</span>
                                    </div>
                                ) : currentImageUrl ? (
                                    <div className="flex flex-col items-center text-blue-600">
                                        <img src={currentImageUrl} alt="Current" className="h-32 mb-2 rounded shadow-sm" />
                                        <span className="font-medium">Current Image (Click to Change)</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-slate-400">
                                        <Upload size={32} className="mb-2" />
                                        <span className="font-medium">Click or Drag Map Image Here</span>
                                        <span className="text-xs mt-1">PNG, JPG up to 5MB</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <div className="flex gap-4">
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={uploading}
                                className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploading ? <Loader2 className="animate-spin" /> : <Upload size={20} />}
                                {uploading ? (editingId ? 'Updating Zone...' : 'Creating Zone...') : (editingId ? 'Update Zone' : 'Create Zone')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Zones List */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Existing Zones</h2>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {loadingZones ? (
                        <div className="p-8 text-center text-slate-500">Loading zones...</div>
                    ) : zones.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No zones created yet.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 font-semibold text-slate-600">Map</th>
                                        <th className="p-4 font-semibold text-slate-600">Name</th>
                                        <th className="p-4 font-semibold text-slate-600">Type</th>
                                        <th className="p-4 font-semibold text-slate-600">Floors</th>
                                        <th className="p-4 font-semibold text-slate-600 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {zones.map((zone) => (
                                        <tr key={zone.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4">
                                                <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                                                    {zone.image_url && (
                                                        <img
                                                            src={zone.image_url}
                                                            alt={zone.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 font-medium text-slate-800">{zone.name}</td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${zone.type === 'building'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {zone.type === 'building' ? <Building size={12} /> : <Sun size={12} />}
                                                    {zone.type === 'building' ? 'Building' : 'Outdoor'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-600">
                                                {zone.type === 'building' ? zone.total_floors : '-'}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => startEditing(zone)}
                                                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Edit Zone"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteZone(zone.id, zone.image_url)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete Zone"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
