import React, { useState, useEffect } from 'react';
import api from '../../api';
import StructureList from './StructureList';

const AdminStructure = ({ primaryColor }) => {
    const [loading, setLoading] = useState(true);
    const [structureData, setStructureData] = useState({
        modules: [],
        centers: [],
        warehouses: [],
        passcodes: []
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [modulesRes, centersRes, warehousesRes, passcodesRes] = await Promise.all([
                api.get('/records/MODULES'),
                api.get('/records/CENTERS'),
                api.get('/records/WAREHOUSES'),
                api.get('/records/PASSCODES')
            ]);

            setStructureData({
                modules: modulesRes.data.data || [],
                centers: centersRes.data.data || [],
                warehouses: warehousesRes.data.data || [],
                passcodes: passcodesRes.data.data || []
            });
        } catch (error) {
            console.error('Error fetching structure records:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async (type, record) => {
        try {
            const endpoint = `/records/${type.toUpperCase()}`;
            if (record.recordId) {
                await api.patch(`${endpoint}/${record.recordId}`, { fieldData: record.fieldData });
            } else {
                await api.post(endpoint, { fieldData: record.fieldData });
            }
            fetchData();
            return true;
        } catch (error) {
            console.error(`Error saving ${type}:`, error);
            return false;
        }
    };

    return (
        <div className="p-8 space-y-12 max-w-[1400px] mx-auto pb-40">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-slate-900 text-white shadow-lg">
                            <span className="material-icons-round text-2xl">hub</span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">System Infrastructure</h2>
                    </div>
                    <p className="text-slate-500 font-bold ml-14">Define modules, logistics nodes, and security parameters.</p>
                </div>

                <button
                    onClick={fetchData}
                    className="flex items-center gap-3 bg-white px-6 py-3.5 rounded-2xl border-2 border-slate-50 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all duration-300 font-black text-[11px] uppercase tracking-widest text-slate-900 group"
                >
                    <span className={`material-icons-round text-lg transition-transform duration-500 group-hover:rotate-180 ${loading ? 'animate-spin' : ''}`}>refresh</span>
                    Synchronize Data
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-96 bg-slate-50 rounded-[2.5rem] animate-pulse"></div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <StructureList
                        title="Application Modules"
                        icon="apps"
                        data={structureData.modules}
                        onSave={(rec) => handleSave('modules', rec)}
                        fields={[
                            { label: 'Module ID', key: 'id', placeholder: 'e.g. sales' },
                            { label: 'Name/Label', key: 'label', placeholder: 'e.g. Sales Desk' },
                            { label: 'Material Icon', key: 'icon', placeholder: 'e.g. shopping_cart' }
                        ]}
                        primaryColor="#334155"
                    />

                    <StructureList
                        title="Operational Centers"
                        icon="location_city"
                        data={structureData.centers}
                        onSave={(rec) => handleSave('centers', rec)}
                        fields={[
                            { label: 'Identification', key: 'ID_Center', placeholder: 'e.g. C01' },
                            { label: 'Location Name', key: 'Name', placeholder: 'e.g. Brooklyn Warehouse' }
                        ]}
                    />

                    <StructureList
                        title="Distribution Hubs"
                        icon="inventory_2"
                        data={structureData.warehouses}
                        onSave={(rec) => handleSave('warehouses', rec)}
                        fields={[
                            { label: 'Warehouse ID', key: 'ID_Warehouse', placeholder: 'e.g. WH01' },
                            { label: 'Center Link', key: 'ID_Center', placeholder: 'Parent Center ID' },
                            { label: 'Tag/Label', key: 'Label', placeholder: 'e.g. Main Storage' }
                        ]}
                    />

                    <StructureList
                        title="Security Access Keys"
                        icon="key"
                        data={structureData.passcodes}
                        onSave={(rec) => handleSave('passcodes', rec)}
                        isSecurity={true}
                        fields={[
                            { label: 'Key Holder', key: 'Label', placeholder: 'e.g. Admin Override' },
                            { label: 'Access Code', key: 'Passcode', placeholder: '6-digit numeric', type: 'password' }
                        ]}
                        primaryColor="#0f172a"
                    />
                </div>
            )}
        </div>
    );
};

export default AdminStructure;
