import React, { useState, useEffect } from 'react';
import api from '../../api';
import Tooltip from '../common/Tooltip';

const EmployeeDetail = ({ employee, onBack, onSave, primaryColor }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState(null);
    const [activeModules, setActiveModules] = useState([]);
    const [loadingModules, setLoadingModules] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);

    // Initial form setup
    useEffect(() => {
        if (employee) {
            setEditForm({ ...employee.fieldData });
            fetchModules();
        }
    }, [employee]);

    const fetchModules = async () => {
        setLoadingModules(true);
        try {
            const res = await api.get('/records/MODULES');
            setActiveModules(res.data.data || []);
        } catch (err) {
            console.error('Error fetching modules:', err);
        } finally {
            setLoadingModules(false);
        }
    };

    const handleToggleStatus = async () => {
        const newStatus = editForm.Status === 'Active' ? 'Inactive' : 'Active';
        setEditForm(prev => ({ ...prev, Status: newStatus }));
    };

    const handleSave = async () => {
        setSaveLoading(true);
        try {
            // Re-structure access JSON if modified (logic would go here)
            const success = await onSave(employee.recordId, editForm);
            if (success) setIsEditing(false);
        } catch (err) {
            console.error('Error in handleSave:', err);
        } finally {
            setSaveLoading(false);
        }
    };

    const handleAccessChange = (moduleId, level) => {
        let currentAccess = {};
        try {
            currentAccess = JSON.parse(editForm.AccessLevelJSON || '{}');
        } catch (e) {
            currentAccess = {};
        }

        if (level === 'None') {
            delete currentAccess[moduleId];
        } else {
            currentAccess[moduleId] = level;
        }

        setEditForm(prev => ({
            ...prev,
            AccessLevelJSON: JSON.stringify(currentAccess)
        }));
    };

    if (!editForm) return null;

    const accessMap = (() => {
        try {
            return JSON.parse(editForm.AccessLevelJSON || '{}');
        } catch (e) {
            return {};
        }
    })();

    return (
        <div className="min-h-full bg-slate-50/50 pb-40 animate-in fade-in duration-700">
            {/* Action Bar */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-8 py-4 flex items-center justify-between shadow-sm">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors group"
                >
                    <span className="material-icons-round text-lg group-hover:-translate-x-1 transition-transform">arrow_back</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Staff Directory</span>
                </button>

                <div className="flex items-center gap-4">
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all active:scale-95"
                        >
                            Modify Profile
                        </button>
                    ) : (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => { setIsEditing(false); setEditForm({ ...employee.fieldData }); }}
                                className="px-8 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
                            >
                                Revert
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saveLoading}
                                className="bg-emerald-500 text-white px-8 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-emerald-200 hover:scale-105 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {saveLoading ? 'Saving...' : 'Commit Changes'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-[1200px] mx-auto px-8 pt-12 space-y-10">
                {/* Profile Header Card */}
                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl p-10 flex flex-col md:flex-row items-center gap-10 relative overflow-hidden group">
                    {/* Visual Decor */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 transition-transform duration-1000 group-hover:scale-110"></div>

                    <div className="relative">
                        <div className="w-40 h-40 rounded-[2.5rem] border-4 border-slate-50 shadow-2xl overflow-hidden group-hover:rotate-3 transition-transform duration-700">
                            <img
                                src={editForm.photo || `https://ui-avatars.com/api/?name=${editForm.Name_First}+${editForm.Name_Last}&background=7393B3&color=fff&size=500`}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        {isEditing && (
                            <button className="absolute -bottom-2 -right-2 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
                                <span className="material-icons-round">photo_camera</span>
                            </button>
                        )}
                    </div>

                    <div className="flex-1 text-center md:text-left relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-2">
                            <h2 className="text-4xl font-black text-slate-900 tracking-tight">{editForm.Name_First} {editForm.Name_Last}</h2>
                            <span className={`self-center md:self-auto px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${editForm.Status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                {editForm.Status}
                            </span>
                        </div>
                        <p className="text-sm font-bold text-slate-400 mb-8">{editForm.Role || 'Staff Operations'} • {editForm.Main_Center || 'HQ Center'}</p>

                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                            <QuickStat icon="badge" label="Employee ID" value={editForm.ID_Employee} />
                            <QuickStat icon="alternate_email" label="Contact info" value={editForm.Email || 'No Email'} />
                        </div>
                    </div>

                    {isEditing && (
                        <div className="flex flex-col gap-2 relative z-10 w-full md:w-auto">
                            <button
                                onClick={handleToggleStatus}
                                className={`w-full md:w-48 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${editForm.Status === 'Active' ? 'border-rose-100 text-rose-500 hover:bg-rose-50' : 'border-emerald-100 text-emerald-500 hover:bg-emerald-50'}`}
                            >
                                {editForm.Status === 'Active' ? 'Suspend Access' : 'Activate User'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Information Sections Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Personal & Detail */}
                    <div className="lg:col-span-2 space-y-10">
                        <SectionContainer title="Personal Identity" icon="person">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <InputField
                                    label="First Name"
                                    value={editForm.Name_First}
                                    editing={isEditing}
                                    onChange={(v) => setEditForm({ ...editForm, Name_First: v })}
                                />
                                <InputField
                                    label="Last Name"
                                    value={editForm.Name_Last}
                                    editing={isEditing}
                                    onChange={(v) => setEditForm({ ...editForm, Name_Last: v })}
                                />
                                <InputField
                                    label="Security Role"
                                    value={editForm.Role}
                                    editing={isEditing}
                                    type="select"
                                    options={['Administrator', 'Standard', 'Restricted']}
                                    onChange={(v) => setEditForm({ ...editForm, Role: v })}
                                />
                                <InputField
                                    label="Management Center"
                                    value={editForm.Main_Center}
                                    editing={isEditing}
                                    onChange={(v) => setEditForm({ ...editForm, Main_Center: v })}
                                />
                            </div>
                        </SectionContainer>

                        {/* Module Access Levels (Interactive Radio Matrix) */}
                        <SectionContainer title="System Access Matrix" icon="lock_open">
                            <div className="overflow-hidden border border-slate-100 rounded-[2rem] bg-slate-50/50">
                                <div className="grid grid-cols-12 bg-slate-900 text-white p-5">
                                    <div className="col-span-4 text-[10px] font-black uppercase tracking-widest opacity-60">Module Name</div>
                                    <div className="col-span-8 grid grid-cols-4 text-center text-[10px] font-black uppercase tracking-widest opacity-60">
                                        <span>None</span>
                                        <span>Read</span>
                                        <span>Write</span>
                                        <span>Full</span>
                                    </div>
                                </div>

                                <div className="divide-y divide-slate-100">
                                    {activeModules.map(module => {
                                        const currentLevel = accessMap[module.fieldData.id] || 'None';
                                        const moduleId = module.fieldData.id;

                                        return (
                                            <div key={module.recordId} className="grid grid-cols-12 p-5 items-center hover:bg-white transition-colors group">
                                                <div className="col-span-4 flex items-center gap-3">
                                                    <span className="material-icons-round text-slate-300 group-hover:text-slate-900 transition-colors text-lg">{module.fieldData.icon}</span>
                                                    <span className="text-[11px] font-black text-slate-700">{module.fieldData.label}</span>
                                                </div>
                                                <div className="col-span-8 grid grid-cols-4 items-center">
                                                    {['None', 'Read', 'Edit/Create', 'Delete'].map((level) => (
                                                        <div key={level} className="flex justify-center">
                                                            <input
                                                                type="radio"
                                                                name={`module-${moduleId}`}
                                                                disabled={!isEditing}
                                                                checked={currentLevel === level}
                                                                onChange={() => handleAccessChange(moduleId, level)}
                                                                className={`w-5 h-5 cursor-pointer accent-slate-900 disabled:cursor-not-allowed`}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </SectionContainer>
                    </div>

                    {/* Sidebar Stats / Secondary Info */}
                    <div className="space-y-10">
                        <SectionContainer title="Security Credentials" icon="vps_status">
                            <div className="space-y-6">
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Fingerprint Status</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                        <span className="text-xs font-black text-slate-900">Registered</span>
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Session Integrity</p>
                                    <div className="flex items-center gap-3">
                                        <span className="material-icons-round text-emerald-500 text-lg">verified_user</span>
                                        <span className="text-xs font-black text-slate-900">Compliant</span>
                                    </div>
                                </div>
                            </div>
                        </SectionContainer>

                        <SectionContainer title="Tenure Records" icon="history">
                            <div className="space-y-4">
                                <HistoryItem date="JAN 12, 2024" label="Role Promotion" sub="Standard -> Admin" />
                                <HistoryItem date="OCT 05, 2023" label="Center Reassignment" sub="NYC -> Brooklyn" />
                                <HistoryItem date="MAY 19, 2023" label="Onboarding" sub="Account Created" />
                            </div>
                        </SectionContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

const QuickStat = ({ icon, label, value }) => (
    <div className="flex items-center gap-3 px-5 py-3 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-white transition-all duration-700">
        <span className="material-icons-round text-slate-300 text-lg">{icon}</span>
        <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">{label}</p>
            <p className="text-[11px] font-bold text-slate-900 leading-none">{value || 'N/A'}</p>
        </div>
    </div>
);

const SectionContainer = ({ title, icon, children }) => (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="p-8 border-b border-slate-50 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                <span className="material-icons-round text-lg">{icon}</span>
            </div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{title}</h3>
        </div>
        <div className="p-8">
            {children}
        </div>
    </div>
);

const InputField = ({ label, value, editing, type = "text", options = [], onChange }) => (
    <div className="space-y-2">
        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
        {editing ? (
            type === "select" ? (
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-slate-50 border border-transparent py-4 px-5 rounded-2xl text-xs font-black text-slate-900 focus:outline-none focus:bg-white focus:border-slate-100 transition-all cursor-pointer"
                >
                    {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            ) : (
                <input
                    type={type}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-slate-50 border border-transparent py-4 px-5 rounded-2xl text-xs font-black text-slate-900 focus:outline-none focus:bg-white focus:border-slate-100 transition-all"
                />
            )
        ) : (
            <div className="bg-slate-50 border border-transparent py-4 px-5 rounded-2xl text-xs font-bold text-slate-600">
                {value || 'Not Defined'}
            </div>
        )}
    </div>
);

const HistoryItem = ({ date, label, sub }) => (
    <div className="flex items-start gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors group">
        <div className="mt-1 w-2 h-2 rounded-full bg-slate-200 group-hover:bg-slate-900 transition-colors"></div>
        <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{date}</p>
            <p className="text-xs font-bold text-slate-900 mb-0.5">{label}</p>
            <p className="text-[10px] font-medium text-slate-400">{sub}</p>
        </div>
    </div>
);

export default EmployeeDetail;
