import React, { useState, useEffect } from 'react';
import StructureList from './StructureList';
import { getRecords, createRecord, updateRecord } from '../../api';

const AdminStructure = ({ primaryColor }) => {
    const [modules, setModules] = useState([]);
    const [centers, setCenters] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [passcodes, setPasscodes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [modRes, cenRes, wahRes, pacRes] = await Promise.allSettled([
                getRecords('Modules'),
                getRecords('Centers'), 
                getRecords('Warehouses'), 
                getRecords('PAC')
            ]);

            if (modRes.status === 'fulfilled') setModules(modRes.value.data);
            if (cenRes.status === 'fulfilled') setCenters(cenRes.value.data);
            if (wahRes.status === 'fulfilled') setWarehouses(wahRes.value.data);
            if (pacRes.status === 'fulfilled') setPasscodes(pacRes.value.data);

        } catch (error) {
            console.error("Error fetching structure data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = async (layout, data, refreshSetter) => {
        try {
            await createRecord(layout, data);
            fetchData(); 
        } catch (error) {
            console.error(`Failed to create ${layout}:`, error);
            throw error;
        }
    };

    const handleSave = async (layout, recordId, data) => {
        try {
            await updateRecord(layout, recordId, data);
            fetchData();
        } catch (error) {
            console.error(`Failed to update ${layout}:`, error);
            throw error;
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-6 p-6 md:p-10 overflow-hidden">

            <div className="flex-1 min-w-[300px] h-full">
                <StructureList
                    title="Modules"
                    icon="view_module" 
                    data={modules}
                    layoutName="Modules"
                    isLoading={isLoading}
                    primaryColor={primaryColor}
                    fields={[
                        { key: 'ModuleName', label: 'Module Name', type: 'text' },
                        { key: 'Active', label: 'Status', type: 'checkbox', defaultValue: 1 }
                    ]}
                    onCreate={(data) => handleCreate('Modules', data)}
                    onSave={(id, data) => handleSave('Modules', id, data)}
                />
            </div>

            <div className="flex-1 min-w-[300px] h-full flex flex-col gap-6">

                <div className="flex-1 h-1/2 min-h-0">
                    <StructureList
                        title="Centers"
                        icon="business"
                        data={centers}
                        layoutName="Centers"
                        isLoading={isLoading}
                        primaryColor={primaryColor}
                        fields={[
                            { key: 'CenterName', label: 'Center Name', type: 'text' },
                            { key: 'CenterCode', label: 'Code', type: 'text' },
                            { key: 'Location', label: 'Location', type: 'text' }
                        ]}
                        onCreate={(data) => handleCreate('Centers', data)}
                        onSave={(id, data) => handleSave('Centers', id, data)}
                    />
                </div>

                <div className="flex-1 h-1/2 min-h-0">
                    <StructureList
                        title="Passcodes"
                        icon="vpn_key"
                        data={passcodes}
                        layoutName="PAC"
                        isLoading={isLoading}
                        primaryColor="#A855F7" 
                        fields={[
                            { key: 'UsedForDescription', label: 'Description', type: 'text' },
                            { key: 'Passcode', label: 'Passcode', type: 'text', hideInList: true },
                            { key: 'Active', label: 'Active Status', type: 'checkbox', defaultValue: 1 }
                        ]}
                        onCreate={(data) => handleCreate('PAC', data)}
                        onSave={(id, data) => handleSave('PAC', id, data)}
                    />
                </div>
            </div>

            <div className="flex-1 min-w-[300px] h-full">
                <StructureList
                    title="Warehouses"
                    icon="warehouse"
                    data={warehouses}
                    layoutName="Warehouses"
                    isLoading={isLoading}
                    primaryColor={primaryColor}
                    fields={[
                        { key: 'WarehouseName', label: 'Warehouse Name', type: 'text' },
                        { key: 'WarehouseCode', label: 'Code', type: 'text' },
                        { key: 'CenterID', label: 'Center ID', type: 'text' }
                    ]}
                    onCreate={(data) => handleCreate('Warehouses', data)}
                    onSave={(id, data) => handleSave('Warehouses', id, data)}
                />
            </div>

        </div>
    );
};

export default AdminStructure;
