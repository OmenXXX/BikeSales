import React, { useState, useEffect, useCallback } from 'react';
import StructureList from './StructureList';
import { getRecords, getCenters, getWarehouses, createRecord, updateRecord, deleteRecord } from '../../api';
import { useStatus } from '../../context/StatusContext';

/** Numeric compare for FileMaker SortOrder values like 1, 1.2, 2.5 */
const compareModuleSortOrder = (a, b) => {
    const na = parseFloat(String(a?.fieldData?.SortOrder ?? '').replace(',', '.'));
    const nb = parseFloat(String(b?.fieldData?.SortOrder ?? '').replace(',', '.'));
    const ha = !Number.isNaN(na);
    const hb = !Number.isNaN(nb);
    if (!ha && !hb) return 0;
    if (!ha) return 1;
    if (!hb) return -1;
    return na - nb;
};

const nextSubmoduleSortOrder = (parentRecord, existingChildren) => {
    const pid = String(parentRecord?.fieldData?.ModuleID ?? '').trim();
    if (!pid) return null;
    const index = (existingChildren?.length || 0) + 1;
    return parseFloat(`${pid}.${index}`);
};

const AdminStructure = ({ primaryColor }) => {
    const { showStatus } = useStatus();
    const [modules, setModules] = useState([]);
    const [centers, setCenters] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [passcodes, setPasscodes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [subModulesModal, setSubModulesModal] = useState({
        open: false,
        parent: null,
        items: [],
        loading: false,
    });
    const [newSubForm, setNewSubForm] = useState({ name: '', active: 1 });
    const [subFormSaving, setSubFormSaving] = useState(false);

    const fetchSubModules = useCallback(async (parentRecord) => {
        const pid = String(parentRecord?.fieldData?.ModuleID ?? '').trim();
        if (!pid) return [];
        const res = await getRecords('Modules', {
            query: [{ ModuleParentID: `==${pid}` }],
            sort: [{ fieldName: 'SortOrder', sortOrder: 'ascend' }],
            limit: 500,
        });
        const rows = Array.isArray(res.data) ? [...res.data] : [];
        rows.sort(compareModuleSortOrder);
        return rows;
    }, []);

    const openSubModulesModal = useCallback(
        async (parentRecord) => {
            setSubModulesModal({ open: true, parent: parentRecord, items: [], loading: true });
            setNewSubForm({ name: '', active: 1 });
            try {
                const items = await fetchSubModules(parentRecord);
                setSubModulesModal((s) => ({ ...s, items, loading: false }));
            } catch (e) {
                console.error('fetchSubModules', e);
                setSubModulesModal((s) => ({ ...s, items: [], loading: false }));
                showStatus({
                    type: 'error',
                    title: 'Could not load submodules',
                    message: e.error || e.message || 'Request failed.',
                });
            }
        },
        [fetchSubModules, showStatus]
    );

    const handleCreateSubmodule = async () => {
        const parent = subModulesModal.parent;
        if (!parent || !newSubForm.name.trim()) {
            showStatus({
                type: 'error',
                title: 'Missing name',
                message: 'Enter a module name for the new submodule.',
            });
            return;
        }
        const sortOrder = nextSubmoduleSortOrder(parent, subModulesModal.items);
        if (sortOrder == null || Number.isNaN(sortOrder)) {
            showStatus({
                type: 'error',
                title: 'Invalid parent',
                message: 'Parent record must have a ModuleID before adding submodules.',
            });
            return;
        }
        setSubFormSaving(true);
        try {
            await createRecord('Modules', {
                ModuleName: newSubForm.name.trim(),
                Active: newSubForm.active ? 1 : 0,
                ModuleParentID: parent.fieldData.ModuleID,
                ModuleParentName: parent.fieldData.ModuleName || '',
                SortOrder: sortOrder,
            });
            showStatus({
                type: 'success',
                title: 'Submodule created',
                message: `Sort order ${sortOrder} assigned.`,
            });
            setNewSubForm({ name: '', active: 1 });
            await fetchData();
            const items = await fetchSubModules(parent);
            setSubModulesModal((s) => ({ ...s, items }));
        } catch (error) {
            console.error('create submodule', error);
            showStatus({
                type: 'error',
                title: 'Create failed',
                message: error.error || error.message || 'Could not create submodule.',
            });
        } finally {
            setSubFormSaving(false);
        }
    };

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
        <>
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
                        {
                            key: 'ModuleID',
                            label: 'Module ID',
                            readOnly: true,
                            hideOnCreate: true,
                            hideInList: true,
                            editRowGroup: 'moduleIdSort',
                        },
                        {
                            key: 'SortOrder',
                            label: 'Sort order',
                            readOnly: true,
                            hideOnCreate: true,
                            hideInList: true,
                            editRowGroup: 'moduleIdSort',
                        },
                        {
                            key: 'ModuleParentName',
                            label: 'Parent module',
                            readOnly: true,
                            hideOnCreate: true,
                            hideInList: true,
                            hideIfEmpty: true,
                        },
                        {
                            key: 'ModuleParentID',
                            label: 'Parent ID',
                            readOnly: true,
                            hideOnCreate: true,
                            hideInList: true,
                            hideIfEmpty: true,
                        },
                        { key: 'Active', label: 'Status', type: 'checkbox', defaultValue: 1 },
                    ]}
                    onCreate={(data) => handleCreate('Modules', data)}
                    onSave={(id, data) => handleSave('Modules', id, data)}
                    onDelete={(id) => handleDelete('Modules', id)}
                    onEditEnd={() =>
                        setSubModulesModal({ open: false, parent: null, items: [], loading: false })
                    }
                    editFooter={(parentRecord) => (
                        <button
                            type="button"
                            onClick={() => void openSubModulesModal(parentRecord)}
                            className="flex w-full min-h-[2.25rem] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-indigo-200 hover:bg-slate-50 transition-colors"
                        >
                            <span className="material-icons-round text-base text-indigo-500 shrink-0">account_tree</span>
                            <span className="truncate">Show submodules</span>
                        </button>
                    )}
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

        {subModulesModal.open && subModulesModal.parent && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                <button
                    type="button"
                    className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                    aria-label="Close submodules dialog"
                    onClick={() =>
                        setSubModulesModal({ open: false, parent: null, items: [], loading: false })
                    }
                />
                <div className="relative z-10 w-full max-w-lg max-h-[85vh] flex flex-col bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 shrink-0">
                        <div className="flex items-center justify-between gap-4">
                            <h3 className="flex-1 min-w-0 text-sm md:text-base font-black text-slate-800 tracking-tight leading-snug">
                                <span className="text-slate-500 font-bold">Sub - modules for </span>
                                <span className="text-slate-900">
                                    {subModulesModal.parent.fieldData.ModuleName || 'Module'}
                                </span>
                                <span className="text-slate-300 font-normal mx-1.5">|</span>
                                <span className="text-slate-500 font-bold">ParentID : </span>
                                <span className="text-indigo-600">
                                    {subModulesModal.parent.fieldData.ModuleID ?? '—'}
                                </span>
                            </h3>
                            <button
                                type="button"
                                onClick={() =>
                                    setSubModulesModal({ open: false, parent: null, items: [], loading: false })
                                }
                                className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 flex items-center justify-center"
                            >
                                <span className="material-icons-round">close</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-2 min-h-0">
                        {subModulesModal.loading ? (
                            <div className="py-12 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Loading…
                            </div>
                        ) : subModulesModal.items.length === 0 ? (
                            <p className="py-8 text-center text-sm font-bold text-slate-400">
                                No submodules yet. Add one below.
                            </p>
                        ) : (
                            subModulesModal.items.map((row) => (
                                <div
                                    key={row.recordId}
                                    className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-100 bg-slate-50/50"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-black text-slate-800 truncate">
                                            {row.fieldData.ModuleName || '—'}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                            SortOrder{' '}
                                            <span className="text-indigo-600">{row.fieldData.SortOrder ?? '—'}</span>
                                            {' · '}
                                            ID {row.fieldData.ModuleID ?? '—'}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-6 border-t border-slate-100 bg-slate-50/80 shrink-0 space-y-4">
                        {/* <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Add submodule
                        </p> */}
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                Module name
                            </label>
                            <input
                                type="text"
                                value={newSubForm.name}
                                onChange={(e) => setNewSubForm((s) => ({ ...s, name: e.target.value }))}
                                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-300"
                                placeholder="New submodule name…"
                            />
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <p className="min-w-0 text-[10px] text-slate-500 font-medium">
                                Next <span className="font-black text-slate-700">SortOrder</span>:{' '}
                                {(() => {
                                    const n = nextSubmoduleSortOrder(subModulesModal.parent, subModulesModal.items);
                                    return n != null && !Number.isNaN(n) ? n : '—';
                                })()}
                            </p>
                            <div className="flex shrink-0 items-center gap-2">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    Active
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setNewSubForm((s) => ({ ...s, active: s.active ? 0 : 1 }))
                                    }
                                    className={`w-10 h-5 rounded-full relative transition-colors ${newSubForm.active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                >
                                    <span
                                        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${newSubForm.active ? 'translate-x-5' : 'translate-x-0'}`}
                                    />
                                </button>
                            </div>
                        </div>
                        
                        <button
                            type="button"
                            disabled={subFormSaving}
                            onClick={() => void handleCreateSubmodule()}
                            className="w-full py-3 rounded-2xl bg-[#1a1d21] text-white text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50"
                        >
                            {subFormSaving ? 'Saving…' : 'Create submodule'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default AdminStructure;
