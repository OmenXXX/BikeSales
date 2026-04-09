import React, { useState, useEffect } from 'react';
import StructureList from './StructureList';
import { getRecords, getCenters, getWarehouses, createRecord, updateRecord, deleteRecord } from '../../api';
import { useStatus } from '../../context/StatusContext';

const AdminStructure = ({ primaryColor }) => {
    const { showStatus } = useStatus();
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
                getCenters(),
                getWarehouses(),
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

    // Generic Handlers
    const handleCreate = async (layout, data, refreshSetter) => {
        try {
            await createRecord(layout, data);
            showStatus({
                type: 'success',
                title: 'Record Created',
                message: `New entry added successfully to ${layout}.`
            });
            fetchData(); // Simple refresh for now
        } catch (error) {
            console.error(`Failed to create ${layout}:`, error);
            showStatus({
                type: 'error',
                title: 'Creation Failed',
                message: error.error || error.message || `Failed to create record in ${layout}.`
            });
            throw error;
        }
    };

    const handleSave = async (layout, recordId, data) => {
        try {
            await updateRecord(layout, recordId, data);
            showStatus({
                type: 'success',
                title: 'Record Updated',
                message: `Changes to ${layout} record have been synchronized.`
            });
            fetchData();
        } catch (error) {
            console.error(`Failed to update ${layout}:`, error);
            showStatus({
                type: 'error',
                title: 'Update Failed',
                message: error.error || error.message || `Failed to update record in ${layout}.`
            });
            throw error;
        }
    };

    const handleDelete = async (layout, recordId) => {
        try {
            await deleteRecord(layout, recordId);
            showStatus({
                type: 'success',
                title: 'Record Deleted',
                message: `Entry has been removed from ${layout}.`
            });
            fetchData();
        } catch (error) {
            console.error(`Failed to delete ${layout}:`, error);
            showStatus({
                type: 'error',
                title: 'Deletion Failed',
                message: error.error || error.message || `Failed to delete record in ${layout}.`
            });
            throw error;
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 p-6 md:p-10">

            {/* Modules Column */}
            <div className="flex-1 min-w-[300px] md:h-full">
                <StructureList
                    title="Modules"
                    icon="view_module" // Material Icon
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
                    onDelete={(id) => handleDelete('Modules', id)}
                />
            </div>

            {/* Centers & Passcodes Column (Split) */}
            <div className="flex-1 min-w-[300px] md:h-full flex flex-col gap-6">

                {/* Centers (Half Height) */}
                <div className="flex-1 md:h-1/2 min-h-[300px] md:min-h-0">
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
                        onDelete={(id) => handleDelete('Centers', id)}
                    />
                </div>

                {/* Passcodes (Half Height) */}
                <div className="flex-1 md:h-1/2 min-h-[300px] md:min-h-0">
                    <StructureList
                        title="Passcodes"
                        icon="vpn_key"
                        data={passcodes}
                        layoutName="PAC"
                        isLoading={isLoading}
                        primaryColor="#A855F7" // Different accent color for distinction? Or keep primary? User said maintain style. Keeping primary might be safer, but purple fits "Provisions". Let's stick to primaryColor if not specified.
                        fields={[
                            { key: 'UsedForDescription', label: 'Description', type: 'text' },
                            { key: 'Passcode', label: 'Passcode', type: 'text', hideInList: true },
                            { key: 'Active', label: 'Active Status', type: 'checkbox', defaultValue: 1 }
                        ]}
                        onCreate={(data) => handleCreate('PAC', data)}
                        onSave={(id, data) => handleSave('PAC', id, data)}
                        onDelete={(id) => handleDelete('PAC', id)}
                    />
                </div>
            </div>

            {/* Warehouses Column */}
            <div className="flex-1 min-w-[300px] md:h-full">
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
                        {
                            key: 'CenterID',
                            label: 'Center ID',
                            type: 'select',
                            options: centers.map(c => ({
                                value: c.fieldData.CenterCode,
                                label: `${c.fieldData.CenterName} (${c.fieldData.CenterCode})`
                            }))
                        }
                    ]}
                    onCreate={(data) => handleCreate('Warehouses', data)}
                    onSave={(id, data) => handleSave('Warehouses', id, data)}
                    onDelete={(id) => handleDelete('Warehouses', id)}
                />
            </div>

        </div>
    );
};

export default AdminStructure;
