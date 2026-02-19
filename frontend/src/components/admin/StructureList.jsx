import React, { useState, useEffect } from 'react';
import useFormManager from '../../hooks/useFormManager';
import Tooltip from '../common/Tooltip';

const StructureList = ({
    title,
    icon,
    data,
    fields,
    primaryColor,
    onSave,
    onCreate,
    isLoading
}) => {
    const [editingId, setEditingId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [isCreating, setIsCreating] = useState(false);

    const {
        formData: editData,
        handleChange: handleEditChange,
        getDeltaPayload,
        reset: resetForm,
        setFormData: setEditData
    } = useFormManager({});

    const {
        formData: newRecordData,
        handleChange: handleNewChange,
        reset: resetNewForm
    } = useFormManager({});

    const startCreating = () => {
        const initial = {};
        fields.forEach(f => {
            if (f.defaultValue !== undefined) initial[f.key] = f.defaultValue;
            else initial[f.key] = '';
        });
        resetNewForm(initial);
        setIsCreating(true);
    };

    const handleCreate = async () => {
        setError(null);
        setIsSaving(true);
        try {
            await onCreate(newRecordData);
            setIsCreating(false);
            resetNewForm({});
        } catch (err) {
            setError(err.error || err.message || 'Failed to create record');
        } finally {
            setIsSaving(false);
        }
    };

    const startEditing = (record) => {
        setEditingId(record.recordId);
        resetForm({ ...record.fieldData });
    };

    const handleSave = async (recordId) => {
        setError(null);
        setIsSaving(true);
        try {
            const delta = getDeltaPayload();
            const response = await onSave(recordId, delta);

            if (response && response.data) {
                const index = data.findIndex(item => item.recordId === recordId);
                if (index !== -1) {
                    data[index] = response.data;
                }
            }

            setEditingId(null);
            resetForm({});
        } catch (err) {
            setError(err.error || err.message || 'Failed to update record');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-white rounded-[2rem] border border-slate-100 shadow-sm h-full relative">
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

            <div className="flex-1 overflow-y-auto p-3 space-y-2 rounded-b-[2rem]">
                {isLoading ? (
                    <div className="text-center py-10 text-slate-400 text-xs font-bold uppercase tracking-widest">Loading...</div>
                ) : data.length === 0 ? (
                    <div className="text-center py-10 text-slate-300 text-xs font-bold uppercase tracking-widest">No Records Found</div>
                ) : (
                    data.map(item => (
                        <div key={item.recordId} className="group relative">
                            {editingId === item.recordId ? (
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-inner space-y-3">
                                    {fields.map(field => (
                                        <div key={field.key} className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
                                            {field.type === 'checkbox' ? (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEditChange(field.key, editData[field.key] == 1 ? 0 : 1)}
                                                        className={`w-10 h-5 rounded-full relative transition-colors ${editData[field.key] == 1 ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                                    >
                                                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${editData[field.key] == 1 ? 'translate-x-5' : 'translate-x-0'}`}></span>
                                                    </button>
                                                    <span className="text-xs font-bold text-slate-600">{editData[field.key] == 1 ? 'Active' : 'Inactive'}</span>
                                                </div>
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={editData[field.key] || ''}
                                                    onChange={e => handleEditChange(field.key, e.target.value)}
                                                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-slate-300"
                                                />
                                            )}
                                        </div>
                                    ))}
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
                                <div className="p-4 rounded-2xl border border-transparent hover:bg-slate-50 hover:border-slate-100 transition-all group/item">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="text-sm font-black text-slate-700">{item.fieldData[fields[0].key]}</h4>
                                            {fields.find((f, i) => i > 0 && f.key !== 'Active' && !f.hideInList) && (
                                                <p className="text-xs text-slate-400 font-medium mt-0.5">
                                                    {item.fieldData[fields.find((f, i) => i > 0 && f.key !== 'Active' && !f.hideInList).key]}
                                                </p>
                                            )}
                                        </div>
                                        <Tooltip text="Edit Record">
                                            <button
                                                onClick={() => startEditing(item)}
                                                className="opacity-0 group-hover/item:opacity-100 p-2 rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-[#1a1d21] transition-all"
                                            >
                                                <span className="material-icons-round text-sm">edit</span>
                                            </button>
                                        </Tooltip>
                                    </div>
                                    {fields.find(f => f.key === 'Active') && (
                                        <div className="mt-2 flex items-center gap-1.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${item.fieldData.Active == 1 ? 'bg-emerald-500' : 'bg-rose-400'}`}></div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.fieldData.Active == 1 ? 'Active' : 'Inactive'}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {isCreating && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-[4px] animate-fade-in"
                        onClick={() => setIsCreating(false)}
                    ></div>

                    <div className="w-full max-w-lg bg-white shadow-2xl rounded-[2.5rem] p-8 flex flex-col relative z-10 animate-scale-in">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-[#1a1d21] flex items-center justify-center shadow-inner">
                                    <span className="material-icons-round text-2xl">{icon}</span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">New {title.slice(0, -1)}</h3>
                            </div>
                            <Tooltip text="Close Modal">
                                <button onClick={() => { setIsCreating(false); setError(null); }} className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 flex items-center justify-center transition-colors">
                                    <span className="material-icons-round text-xl">close</span>
                                </button>
                            </Tooltip>
                        </div>

                        <div className="space-y-6">
                            {fields.map(field => (
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
                            ))}
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
