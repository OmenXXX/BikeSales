import React, { useState } from 'react';
import Tooltip from '../common/Tooltip';

const StructureList = ({
    title,
    icon,
    data,
    fields,
    onSave,
    isSecurity = false,
    primaryColor = '#334155'
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [passcodeConfirm, setPasscodeConfirm] = useState('');
    const [confirmingId, setConfirmingId] = useState(null);

    const handleEdit = (record) => {
        setEditingId(record.recordId);
        setEditForm(record.fieldData);
        setIsAdding(false);
    };

    const handleSave = async (recordId = null) => {
        // Validation for passcodes
        if (isSecurity) {
            if (!editForm.Passcode || editForm.Passcode.length !== 6 || isNaN(editForm.Passcode)) {
                alert('Passcode must be exactly 6 digits.');
                return;
            }
        }

        const success = await onSave({ recordId, fieldData: editForm });
        if (success) {
            setEditingId(null);
            setIsAdding(false);
            setEditForm({});
        }
    };

    const handleAdd = () => {
        setEditForm(fields.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {}));
        setIsAdding(true);
        setEditingId(null);
    };

    return (
        <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-sm overflow-hidden flex flex-col h-[600px] hover:shadow-xl hover:border-slate-100 transition-all duration-500">
            {/* Header */}
            <div className="p-8 border-b border-slate-50 flex items-center justify-between pb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: primaryColor }}>
                        <span className="material-icons-round">{icon}</span>
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{data.length} Records Configured</p>
                    </div>
                </div>

                <Tooltip text={`Add New ${title}`}>
                    <button
                        onClick={handleAdd}
                        className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all duration-300 flex items-center justify-center"
                    >
                        <span className="material-icons-round text-lg">add</span>
                    </button>
                </Tooltip>
            </div>

            {/* List / Form Container */}
            <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-slate-50/30">
                {isAdding && (
                    <RecordForm
                        fields={fields}
                        form={editForm}
                        setForm={setEditForm}
                        onSave={() => handleSave()}
                        onCancel={() => setIsAdding(false)}
                        primaryColor={primaryColor}
                        title={`New ${title}`}
                    />
                )}

                {data.map(item => {
                    const isEditing = editingId === item.recordId;

                    if (isEditing) {
                        return (
                            <RecordForm
                                key={item.recordId}
                                fields={fields}
                                form={editForm}
                                setForm={setEditForm}
                                onSave={() => handleSave(item.recordId)}
                                onCancel={() => setEditingId(null)}
                                primaryColor={primaryColor}
                                title="Edit Record"
                            />
                        );
                    }

                    return (
                        <div
                            key={item.recordId}
                            className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-slate-300 hover:shadow-md transition-all duration-300"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3">
                                    <h4 className="font-black text-slate-900 truncate">
                                        {fields.map(f => item.fieldData[f.key]).filter(Boolean).slice(0, 1).join(' ')}
                                    </h4>
                                    {isSecurity && (
                                        <span className={`w-2 h-2 rounded-full ${item.fieldData.Status === 'Active' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'bg-slate-200'}`}></span>
                                    )}
                                </div>
                                <p className="text-[10px] uppercase font-black tracking-wider text-slate-400 mt-1">
                                    {fields.slice(1).map(f => `${f.label}: ${item.fieldData[f.key] || 'N/A'}`).join(' • ')}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                <button
                                    onClick={() => handleEdit(item)}
                                    className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors flex items-center justify-center"
                                >
                                    <span className="material-icons-round text-lg">edit</span>
                                </button>
                                {isSecurity && (
                                    <button
                                        onClick={() => {
                                            setConfirmingId(confirmingId === item.recordId ? null : item.recordId);
                                            setPasscodeConfirm('');
                                        }}
                                        className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center ${confirmingId === item.recordId ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-400 hover:text-slate-900'}`}
                                    >
                                        <span className="material-icons-round text-lg">{confirmingId === item.recordId ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                )}
                            </div>

                            {/* Passcode Confirmation Modal-in-line */}
                            {confirmingId === item.recordId && (
                                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center rounded-[2.5rem]">
                                    <h5 className="text-sm font-black text-slate-900 mb-2 uppercase tracking-widest">Confirm Access</h5>
                                    <p className="text-[10px] font-bold text-slate-400 mb-6">Enter authorized passcode to view this key</p>
                                    <div className="flex gap-2 mb-8">
                                        <input
                                            type="password"
                                            maxLength={6}
                                            value={passcodeConfirm}
                                            onChange={(e) => setPasscodeConfirm(e.target.value)}
                                            className="w-32 bg-slate-100 border-2 border-transparent py-3 px-4 rounded-xl text-center font-black tracking-[0.3em] focus:outline-none focus:bg-white focus:border-slate-200 transition-all"
                                            placeholder="••••••"
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => {
                                                if (passcodeConfirm === item.fieldData.Passcode) {
                                                    alert(`The passcode for ${item.fieldData.Label} is: ${item.fieldData.Passcode}`);
                                                    setConfirmingId(null);
                                                } else {
                                                    alert('Incorrect passcode.');
                                                }
                                            }}
                                            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest"
                                        >
                                            Verify
                                        </button>
                                    </div>
                                    <button onClick={() => setConfirmingId(null)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Cancel</button>
                                </div>
                            )}
                        </div>
                    );
                })}

                {data.length === 0 && !isAdding && (
                    <div className="flex flex-col items-center justify-center h-full opacity-30">
                        <span className="material-icons-round text-4xl mb-3">inventory_2</span>
                        <p className="text-xs font-black uppercase tracking-widest">No configurations yet</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const RecordForm = ({ fields, form, setForm, onSave, onCancel, primaryColor, title }) => (
    <div className="bg-white p-7 rounded-3xl border-2 border-slate-900/5 shadow-xl space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{title}</span>
            <button onClick={onCancel} className="text-slate-300 hover:text-slate-900 transition-colors">
                <span className="material-icons-round">close</span>
            </button>
        </div>

        <div className="space-y-5">
            {fields.map(f => (
                <div key={f.key} className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">{f.label}</label>
                    <input
                        type={f.type || 'text'}
                        value={form[f.key] || ''}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                        placeholder={f.placeholder}
                        className="w-full bg-slate-50 border border-transparent py-4 px-5 rounded-2xl text-xs font-black text-slate-900 focus:outline-none focus:bg-white focus:border-slate-100 transition-all placeholder:text-slate-300"
                    />
                </div>
            ))}
        </div>

        <button
            onClick={onSave}
            className="w-full py-4 rounded-2xl text-white font-black text-[11px] uppercase tracking-[0.2em] transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            style={{ backgroundColor: primaryColor }}
        >
            Save Configuration
        </button>
    </div>
);

export default StructureList;
