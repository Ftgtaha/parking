'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Loader2, Upload, Map as MapIcon, CheckCircle, AlertCircle, Building, Sun } from 'lucide-react';
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

    // Initial Role Check
    if (role !== 'admin') {
        return <div className="p-8 text-center text-red-500">Access Denied. Admins only.</div>;
    }

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !name) {
            setError('Please provide both a name and an image.');
            return;
        }

        setUploading(true);
        setError(null);

        try {
            // 1. Upload Image
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `zone-maps/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('parking-assets')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('parking-assets')
                .getPublicUrl(filePath);

            // 3. Insert Zone Record
            const { error: insertError } = await supabase
                .from('zones')
                .insert([
                    {
                        name,
                        type,
                        total_floors: type === 'building' ? totalFloors : 1,
                        image_url: publicUrl,
                        // Default gate to center (50, 50) as requested
                        gate_x: 50,
                        gate_y: 50
                    }
                ]);

            if (insertError) throw insertError;

            alert('Zone added successfully!');
            router.push('/dashboard/map');

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'An error occurred');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-3xl font-bold text-slate-800 mb-8 flex items-center gap-3">
                <MapIcon className="text-blue-600" />
                Add New Parking Zone
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
                                value={totalFloors}
                                onChange={(e) => setTotalFloors(parseInt(e.target.value) || 1)}
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

                    <button
                        type="submit"
                        disabled={uploading}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {uploading ? <Loader2 className="animate-spin" /> : <Upload size={20} />}
                        {uploading ? 'Creating Zone...' : 'Create Zone'}
                    </button>
                </form>
            </div>
        </div>
    );
}
