import React, { useState, useEffect } from 'react';
import Tooltip from '../common/Tooltip';
import { useStatus } from '../../context/StatusContext';

const StructureList = ({
    title,
    icon,
    data,
    fields,
    primaryColor,
    onSave,
    onCreate,
    onDelete,
    isLoading
}) => {
    const { showConfirm } = useStatus();
    const [editingId, setEditingId] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    const [editData, setEditData] = useState({});
    const [newRecordData, setNewRecordData] = useState({});
    const [confirmEditValue, setConfirmEditValue] = useState('');
    const [confirmCreateValue, setConfirmCreateValue] = useState('');

    const validatePasscode = (value) => {
        return value.replace(/[^0-9]/g, '');
    };

    const getFieldDisplayValue = (field, value) => {
        if (field.type === 'select' && field.options) {
            const option = field.options.find(opt => opt.value === value);
            return option ? option.label : value;
        }
        return value;
    };

    const handleEditChange = (key, value) => {
        let finalValue = value;
        if (key === 'Passcode') finalValue = validatePasscode(value);
        setEditData(prev => ({ ...prev, [key]: finalValue }));
    };

    const handleNewChange = (key, value) => {
        let finalValue = value;
        if (key === 'Passcode') finalValue = validatePasscode(value);
        setNewRecordData(prev => ({ ...prev, [key]: finalValue }));
    };

    const startCreating = () => {
        const initial = {};
        fields.forEach(f => {
            if (f.defaultValue !== undefined) initial[f.key] = f.defaultValue;
            else initial[f.key] = '';
        });
        setNewRecordData(initial);
        setConfirmCreateValue('');
        setIsCreating(true);
    };

    const handleCreate = async () => {
        if (newRecordData.hasOwnProperty('Passcode') && newRecordData.Passcode !== confirmCreateValue) {
            setError('Passcodes do not match!');
            setIsSaving(false);
            return;
        }

        try {
            await onCreate(newRecordData);
            setIsCreating(false);
            setNewRecordData({});
            setConfirmCreateValue('');
        } catch (err) {
            setError(err.error || err.message || 'Failed to create record');
        } finally {
            setIsSaving(false);
        }
    };

    const startEditing = (record) => {
        setEditingId(record.recordId);
        const filtered = {};
        fields.forEach(f => {
            filtered[f.key] = record.fieldData[f.key];
        });
        setEditData(filtered);
        if (filtered.hasOwnProperty('Passcode')) {
            setConfirmEditValue(filtered.Passcode);
        }
    };

    const handleSave = async (recordId) => {
        if (editData.hasOwnProperty('Passcode') && editData.Passcode !== confirmEditValue) {
            setError('Passcodes do not match!');
            setIsSaving(false);
            return;
        }

        try {
            await onSave(recordId, editData);
            setEditingId(null);
            setEditData({});
            setConfirmEditValue('');
        } catch (err) {
            setError(err.error || err.message || 'Failed to update record');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = async (item) => {
        const itemName = item.fieldData[fields[0].key];
        const confirmed = await showConfirm({
            title: `Delete ${title.slice(0, -1)}`,
            message: `Are you sure you want to permanently delete "${itemName}"? This action cannot be undone.`,
            confirmText: 'Delete',
            type: 'error'
        });

        if (confirmed) {
            try {
                setIsSaving(true);
                await onDelete(item.recordId);
            } catch (err) {
                setError(err.error || err.message || 'Failed to delete record');
            } finally {
                setIsSaving(false);
            }
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-white rounded-[2rem] border border-slate-100 shadow-sm md:h-full relative">
            {/* Header */}
            <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-white/50 backdrop-blur-sm z-10 rounded-t-[2rem]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
                        <span className="material-icons-round">{icon}</span>
                    </div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">{title}</h3>
                </div>
                <Tooltip text={`Add New ${title.slice(0, -1)}`} position="bottom">
                    <button
                        onClick={startCreating}
                        className="w-8 h-8 rounded-full bg-[#1a1d21] text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                    >
                        <span className="material-icons-round text-lg">add</span>
                    </button>
                </Tooltip>
            </div>

            {/* List */}
            <div className="md:flex-1 md:overflow-y-auto p-3 space-y-2 rounded-b-[2rem]">
                {isLoading ? (
                    <div className="space-y-3 py-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-12 bg-slate-50 rounded-xl animate-pulse flex items-center px-4 gap-4">
                                <div className="w-8 h-4 bg-slate-100 rounded"></div>
                                <div className="flex-1 h-4 bg-slate-100 rounded"></div>
                                <div className="w-16 h-4 bg-slate-100 rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : (!Array.isArray(data) || data.length === 0) ? (
                    <div className="text-center py-10 text-slate-300 text-xs font-bold uppercase tracking-widest">No Records Found</div>
                ) : (
                    data.map(item => (
                        <div key={item.recordId} className="group relative">
                            {editingId === item.recordId ? (
                                // Edit Mode
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-inner space-y-3">
                                    {/* Status Toggle at Top */}
                                    {fields.find(f => f.key === 'Active') && (
                                        <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-200/50">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEditChange('Active', editData['Active'] == 1 ? 0 : 1)}
                                                    className={`w-8 h-4 rounded-full relative transition-colors ${editData['Active'] == 1 ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                                >
                                                    <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${editData['Active'] == 1 ? 'translate-x-4' : 'translate-x-0'}`}></span>
                                                </button>
                                                <span className="text-[9px] font-bold text-slate-500 uppercase">{editData['Active'] == 1 ? 'Active' : 'Inactive'}</span>
                                            </div>
                                        </div>
                                    )}

                                    {fields.filter(f => f.key !== 'Active').map(field => {
                                        if (field.key === 'Passcode') {
                                            return (
                                                <div key={field.key} className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
                                                        <input
                                                            type="text"
                                                            value={editData[field.key] || ''}
                                                            onChange={e => handleEditChange(field.key, e.target.value)}
                                                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-slate-300"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm {field.label}</label>
                                                        <input
                                                            type="password"
                                                            placeholder="Confirm..."
                                                            value={confirmEditValue}
                                                            onChange={e => setConfirmEditValue(e.target.value)}
                                                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-slate-300"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        }
                                        if (field.type === 'select') {
                                            return (
                                                <div key={field.key} className="space-y-1">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
                                                    <div className="relative">
                                                        <select
                                                            value={editData[field.key] || ''}
                                                            onChange={e => handleEditChange(field.key, e.target.value)}
                                                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-slate-300 appearance-none"
                                                        >
                                                            <option value="" disabled>Select {field.label}...</option>
                                                            {field.options?.map(opt => (
                                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                            ))}
                                                        </select>
                                                        <span className="material-icons-round absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-sm">expand_more</span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div key={field.key} className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
                                                <input
                                                    type="text"
                                                    value={editData[field.key] || ''}
                                                    onChange={e => handleEditChange(field.key, e.target.value)}
                                                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-slate-300"
                                                />
                                            </div>
                                        );
                                    })}
                                    <div className="flex items-center gap-2 pt-2">
                                        <Tooltip text="Save Changes" className="flex-1 w-full">
                                            <button
                                                onClick={() => handleSave(item.recordId)}
                                                disabled={isSaving}
                                                className="w-full py-1.5 rounded-lg bg-[#1a1d21] text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50"
                                            >
                                                {isSaving ? '...' : 'Save'}
                                            </button>
                                        </Tooltip>
                                        <Tooltip text="Cancel Editing" className="flex-1 w-full">
                                            <button
                                                onClick={() => { setEditingId(null); setError(null); }}
                                                disabled={isSaving}
                                                className="w-full py-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50"
                                            >
                                                Cancel
                                            </button>
                                        </Tooltip>
                                    </div>
                                    {editingId === item.recordId && error && (
                                        <p className="text-[9px] font-bold text-rose-500 mt-2 text-center">{error}</p>
                                    )}
                                </div>
                            ) : (
                                // View Mode
                                <div className="p-2 px-4 rounded-2xl border border-transparent hover:bg-slate-50 hover:border-slate-100 transition-all group/item">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-black text-slate-700">{item.fieldData[fields[0].key]}</h4>
                                            {fields.find((f, i) => i > 0 && f.key !== 'Active' && !f.hideInList) && (
                                                <p className="text-xs text-slate-400 font-medium mt-0.5">
                                                    {item.fieldData[fields.find((f, i) => i > 0 && f.key !== 'Active' && !f.hideInList).key]}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {/* Status Indicator (Moved to left of Edit) */}
                                            {fields.find(f => f.key === 'Active') && (
                                                <div className="flex items-center gap-1.5 pr-2 border-r border-slate-100">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${item.fieldData.Active == 1 ? 'bg-emerald-500' : 'bg-rose-400'}`}></div>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.fieldData.Active == 1 ? 'Active' : 'Inactive'}</span>
                                                </div>
                                            )}
                                            <Tooltip text="Edit Record">
                                                <button
                                                    onClick={() => startEditing(item)}
                                                    className="opacity-40 hover:opacity-100 p-2 rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-[#1a1d21] transition-all"
                                                >
                                                    <span className="material-icons-round text-sm">edit</span>
                                                </button>
                                            </Tooltip>
                                            {onDelete && (
                                                <Tooltip text="Delete Record">
                                                    <button
                                                        onClick={() => handleDeleteClick(item)}
                                                        className="opacity-20 hover:opacity-100 p-2 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all font-black"
                                                    >
                                                        <span className="material-icons-round text-sm">delete</span>
                                                    </button>
                                                </Tooltip>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Create Modal (Centered with Dimmed Background) */}
            {isCreating && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    {/* Backdrop / Dimmer */}
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-[4px] animate-fade-in"
                        onClick={() => setIsCreating(false)}
                    ></div>

                    {/* Modal Content */}
                    <div className="w-full max-w-lg bg-white shadow-2xl rounded-[2.5rem] p-8 flex flex-col relative z-10 animate-scale-in">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-[#1a1d21] flex items-center justify-center shadow-inner">
                                    <span className="material-icons-round text-2xl">{icon}</span>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">New {title.slice(0, -1)}</h3>
                                    {fields.find(f => f.key === 'Active') && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                                            <button
                                                onClick={() => handleNewChange('Active', newRecordData['Active'] == 1 ? 0 : 1)}
                                                className={`w-10 h-5 rounded-full relative transition-colors ${newRecordData['Active'] == 1 ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                            >
                                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${newRecordData['Active'] == 1 ? 'translate-x-5' : 'translate-x-0'}`}></span>
                                            </button>
                                            <span className="text-[10px] font-black text-slate-600 uppercase">{newRecordData['Active'] == 1 ? 'Active' : 'Inactive'}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <Tooltip text="Close Modal">
                                <button onClick={() => { setIsCreating(false); setError(null); }} className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 flex items-center justify-center transition-colors">
                                    <span className="material-icons-round text-xl">close</span>
                                </button>
                            </Tooltip>
                        </div>

                        <div className="space-y-6">
                            {fields.map(field => {
                                if (field.key === 'Passcode') {
                                    return (
                                        <div key={field.key} className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
                                                <input
                                                    type="text"
                                                    value={newRecordData[field.key] || ''}
                                                    onChange={e => handleNewChange(field.key, e.target.value)}
                                                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-[#7393B3] focus:bg-white transition-all placeholder-slate-300"
                                                    placeholder="Enter..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm {field.label}</label>
                                                <input
                                                    type="password"
                                                    value={confirmCreateValue}
                                                    onChange={e => setConfirmCreateValue(e.target.value)}
                                                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-[#7393B3] focus:bg-white transition-all placeholder-slate-300"
                                                    placeholder="Confirm..."
                                                />
                                            </div>
                                        </div>
                                    );
                                }
                                if (field.key === 'Active') return null;
                                return (
                                    <div key={field.key} className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
                                        {field.type === 'checkbox' ? (
                                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                                <button
                                                    onClick={() => handleNewChange(field.key, newRecordData[field.key] == 1 ? 0 : 1)}
                                                    className={`w-12 h-6 rounded-full relative transition-colors ${newRecordData[field.key] == 1 ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                                >
                                                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${newRecordData[field.key] == 1 ? 'translate-x-6' : 'translate-x-0'}`}></span>
                                                </button>
                                                <span className="text-sm font-black text-slate-700">{newRecordData[field.key] == 1 ? 'Active' : 'Inactive'}</span>
                                            </div>
                                        ) : field.type === 'select' ? (
                                            <div className="relative">
                                                <select
                                                    value={newRecordData[field.key] || ''}
                                                    onChange={e => handleNewChange(field.key, e.target.value)}
                                                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-[#7393B3] focus:bg-white transition-all appearance-none"
                                                >
                                                    <option value="" disabled>Select {field.label}...</option>
                                                    {field.options?.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                                <span className="material-icons-round absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">expand_more</span>
                                            </div>
                                        ) : (
                                            <input
                                                type="text"
                                                value={newRecordData[field.key] || ''}
                                                onChange={e => handleNewChange(field.key, e.target.value)}
                                                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-[#7393B3] focus:bg-white transition-all placeholder-slate-300"
                                                placeholder={`Enter ${field.label}...`}
                                                autoFocus={field === fields[0]}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="pt-8 mt-4 border-t border-slate-50 space-y-4">
                            <Tooltip text={`Commit and Create ${title.slice(0, -1)}`} className="w-full">
                                <button
                                    onClick={handleCreate}
                                    disabled={isSaving}
                                    className="w-full py-4 rounded-2xl bg-[#1a1d21] text-white font-black text-sm uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all transform active:scale-[0.98] disabled:opacity-50"
                                >
                                    {isSaving ? 'Synchronizing...' : `Create ${title.slice(0, -1)}`}
                                </button>
                            </Tooltip>
                            {error && (
                                <p className="text-[11px] font-black text-rose-500 text-center animate-shake uppercase tracking-wider">{error}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StructureList;
