import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import { PlusIcon } from '../components/icons';
import { formatCurrency } from '../constants';
import { getSettings, updateSettings } from '../services/api';

const SettingsView: React.FC = () => {
    const [locations, setLocations] = useState<string[]>([]);
    const [perKmCost, setPerKmCost] = useState<number>(0);
    const [newLocation, setNewLocation] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const data = await getSettings();
                if (data) {
                    setLocations(data.locations || []);
                    setPerKmCost(data.per_km_cost || 0);
                }
            } catch (error) {
                console.error("Failed to load settings:", error);
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const saveSettings = async () => {
        setSaving(true);
        try {
            await updateSettings({
                locations,
                per_km_cost: perKmCost
            });
            alert('Settings saved successfully!');
        } catch (error) {
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const addLocation = () => {
        if (newLocation && !locations.includes(newLocation)) {
            setLocations([...locations, newLocation]);
            setNewLocation('');
        }
    };

    const removeLocation = (index: number) => {
        setLocations(locations.filter((_, i) => i !== index));
    };

    if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading Settings...</div>;

    return (
        <div className="space-y-6 max-w-2xl mx-auto pb-20">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Settings</h1>
                <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </header>

            <div className="grid gap-6">
                <Card title="Rate Configurations">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Default Per KM Cost</label>
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-2.5 text-slate-400 font-mono">Rs.</span>
                                    <input
                                        type="number"
                                        className="w-full p-2 pl-10 border rounded-xl font-mono text-lg"
                                        value={perKmCost}
                                        onChange={e => setPerKmCost(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <span className="text-slate-500 font-medium">/ KM</span>
                            </div>
                            <p className="mt-2 text-xs text-slate-400 italic">This rate will be used for auto-calculating ride estimates.</p>
                        </div>
                    </div>
                </Card>

                <Card title="Location Management">
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Add new location..."
                                className="flex-1 p-2 border rounded-xl"
                                value={newLocation}
                                onChange={e => setNewLocation(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && addLocation()}
                            />
                            <button
                                onClick={addLocation}
                                className="bg-slate-100 text-slate-700 p-2 rounded-xl hover:bg-slate-200 transition"
                            >
                                <PlusIcon />
                            </button>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-2 border border-slate-100 min-h-[100px]">
                            <div className="flex flex-wrap gap-2">
                                {locations.map((loc, idx) => (
                                    <div key={idx} className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 flex items-center gap-2 group">
                                        <span className="text-sm font-medium text-slate-700">{loc}</span>
                                        <button
                                            onClick={() => removeLocation(idx)}
                                            className="text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                                {locations.length === 0 && <p className="text-slate-400 text-sm p-4 text-center w-full italic">No locations added yet.</p>}
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 italic">These locations will appear in dropdowns for Trip and Rental routing.</p>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default SettingsView;
