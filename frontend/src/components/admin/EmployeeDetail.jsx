import React, { useState, useEffect } from 'react';
import Tooltip from '../common/Tooltip';
import { suspendUser, activateUser, getRecords, updateRecord } from '../../api';

const EmployeeDetail = ({
    employee,
    isEditing,
    setIsEditing,
    primaryColor,
    carbonFiberStyle,
    canEdit
}) => {
    const data = employee.fieldData;
    const recordId = employee.recordId;
    const isActive = data.Active === '1' || data.Active === 1;

    const [formData, setFormData] = useState({ ...data });
    const [modules, setModules] = useState([]);
    const [loadingModules, setLoadingModules] = useState(false);
    const [saving, setSaving] = useState(false);
    const [modulePermissions, setModulePermissions] = useState({});

    // Update formData if employee prop changes
    useEffect(() => {
        setFormData({ ...employee.fieldData });
    }, [employee]);

    useEffect(() => {
        const fetchModules = async () => {
            setLoadingModules(true);
            try {
                const response = await getRecords('Modules', {
                    query: [{ Active: "1" }]
                });
                if (response.success) {
                    setModules(response.data || []);

                    const initialPermissions = {};

                    // 1. Parse existing permissions from AccessLevelJSON
                    let existingPermissions = {};
                    try {
                        if (data.AccessLevelJSON) {
                            existingPermissions = JSON.parse(data.AccessLevelJSON);
                        }
                    } catch (e) {
                        console.warn("Failed to parse AccessLevelJSON", e);
                    }

                    // 2. Map active modules to their existing permissions or default to 'None'
                    (response.data || []).forEach(m => {
                        const moduleName = m.fieldData.ModuleName;
                        initialPermissions[moduleName] = existingPermissions[moduleName] || 'None';
                    });

                    setModulePermissions(initialPermissions);
                }
            } catch (err) {
                console.error("Failed to fetch modules", err);
            } finally {
                setLoadingModules(false);
            }
        };

        fetchModules();
    }, []);

    const handlePermissionChange = (moduleName, level) => {
        setModulePermissions(prev => ({
            ...prev,
            [moduleName]: level
        }));
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updateData = {
                ...formData,
                AccessLevelJSON: JSON.stringify(modulePermissions)
            };

            // Call API to update record
            const result = await updateRecord('Employees', recordId, updateData);

            if (result.success) {
                setIsEditing(false);
                // We reload to ensure parent and list view get fresh data
                window.location.reload();
            }
        } catch (err) {
            console.error("Save failed", err);
            alert("Failed to save changes: " + (err.error || "Unknown error"));
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setFormData({ ...data });
        // Re-initialize permissions from original data
        try {
            if (data.AccessLevelJSON) {
                setModulePermissions(JSON.parse(data.AccessLevelJSON));
            }
        } catch (e) { }
        setIsEditing(false);
    };

    const handleToggleStatus = async () => {
        const isCurrentlyActive = isActive;
        const newStatus = isCurrentlyActive ? "SUSPENDED" : "1";
        const confirmMessage = isCurrentlyActive
            ? `Are you sure you want to SUSPEND access for ${data.Name_First}? They will be logged out immediately.`
            : `Activate access for ${data.Name_First}?`;

        if (window.confirm(confirmMessage)) {
            try {
                if (isCurrentlyActive) {
                    await suspendUser(data.FireBaseUserID, recordId);
                } else {
                    await activateUser(data.FireBaseUserID, recordId);
                }
                // We reload to ensure all context and UI states are fresh
                window.location.reload();
            } catch (err) {
                console.error("Status toggle failed", err);
                alert("Failed to update status. Please try again.");
            }
        }
    };

    // Button Style Definitions
    const btnStyles = {
        edit: "bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white",
        save: "bg-emerald-50 border-emerald-500/20 text-emerald-600 hover:bg-emerald-600 hover:text-white",
        cancel: "bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white",
        suspend: "bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white",
        activate: "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white",
        sales: "bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white",
        locked: "bg-slate-50 border-slate-100 text-slate-400 opacity-60 cursor-not-allowed"
    };

    return (
        <div className="max-w-7xl mx-auto space-y-4 animate-slide-up pb-10">
            {/* Header / Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                {/* Left Side: Profiling Card */}
                <div className="flex items-center gap-4">
                    <Tooltip text={`${data.Name_First}'s Profile Photo`}>
                        <div className="w-16 h-16 rounded-[1.2rem] overflow-hidden shadow-lg border-2 border-slate-50 relative group bg-slate-50 flex items-center justify-center cursor-help">
                            {data.photo ? (
                                <img
                                    src={data.photo}
                                    alt={data.Name_First}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-xl font-black text-slate-300">
                                    {`${data.Name_First?.[0] || ''}${data.Name_Last?.[0] || ''}`.toUpperCase()}
                                </span>
                            )}
                        </div>
                    </Tooltip>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{data.Name_First} {data.Name_Last}</h2>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <Tooltip text={`Current administrative role: ${data.Role || 'Staff Member'}`}>
                                <div className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[9px] font-black text-slate-500 tracking-widest uppercase truncate max-w-[150px] cursor-help">ID: {data.Role || 'Staff Member'}</div>
                            </Tooltip>
                        </div>
                    </div>
                </div>

                {/* Right Side: Actions & Status */}
                <div className="flex flex-wrap items-center justify-center gap-6">
                    {/* Account Status Indicator */}
                    <Tooltip text={`Account Status: ${isActive ? 'Active and reachable' : 'Inactive / Suspended'}`}>
                        <div className="flex items-center gap-3 pr-4 border-r border-slate-100 h-10 cursor-help">
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </Tooltip>

                    <div className="flex items-center gap-3">
                        {/* Status Toggle (Suspend/Activate) - Only available for Admins */}
                        {canEdit && (
                            <Tooltip text={isActive ? "Disable user access immediately" : "Restore user access to the platform"}>
                                <button
                                    onClick={handleToggleStatus}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${isActive ? btnStyles.suspend : btnStyles.activate}`}
                                >
                                    <span className="material-icons-round text-base">{isActive ? 'person_off' : 'person_add'}</span>
                                    {isActive ? 'Suspend' : 'Activate'}
                                </button>
                            </Tooltip>
                        )}

                        {/* Edit Controls */}
                        <div className="flex gap-2">
                            {canEdit ? (
                                !isEditing ? (
                                    <Tooltip text="Unlock record for editing">
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 group ${btnStyles.edit}`}
                                        >
                                            <span className="material-icons-round text-base group-hover:rotate-12 transition-transform">edit</span>
                                            Edit
                                        </button>
                                    </Tooltip>
                                ) : (
                                    <>
                                        <Tooltip text="Commit all changes to the database">
                                            <button
                                                onClick={handleSave}
                                                disabled={saving}
                                                className={`px-5 py-2.5 rounded-xl border font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 ${btnStyles.save} ${saving ? 'opacity-50 cursor-wait' : ''}`}
                                            >
                                                {saving ? 'Saving...' : 'Save'}
                                            </button>
                                        </Tooltip>
                                        <Tooltip text="Discard unsaved changes and return to read mode">
                                            <button
                                                onClick={handleCancel}
                                                disabled={saving}
                                                className={`px-5 py-2.5 rounded-xl border font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 ${btnStyles.cancel}`}
                                            >
                                                Cancel
                                            </button>
                                        </Tooltip>
                                    </>
                                )
                            ) : (
                                <Tooltip text="Administrative privileges required to modify this record. Contact your system admin for access.">
                                    <div className={`flex items-center gap-3 px-5 py-2.5 rounded-xl border ${btnStyles.locked}`}>
                                        <span className="material-icons-round text-sm">lock</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Locked</span>
                                    </div>
                                </Tooltip>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Column 1: Identity */}
                <div className="space-y-4">
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden h-full">
                        <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <span className="w-1 h-3 rounded-full" style={{ backgroundColor: primaryColor }}></span>
                            Personal Identity
                        </p>

                        <div className="flex flex-col items-start gap-1 mb-8">
                            <div className="flex items-center gap-5">
                                <Tooltip text="System generated initials based on legal name">
                                    <div className="w-20 h-20 rounded-[1.5rem] bg-slate-50 border-4 border-slate-50 overflow-hidden shadow-inner flex-shrink-0 flex items-center justify-center cursor-help">
                                        {data.photo ? (
                                            <img
                                                src={data.photo}
                                                className="w-full h-full object-cover"
                                                alt="Profile"
                                            />
                                        ) : (
                                            <span className="text-3xl font-black text-slate-200">
                                                {`${data.Name_First?.[0] || ''}${data.Name_Last?.[0] || ''}`.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                </Tooltip>
                                <div className="space-y-1 py-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-3xl font-black text-slate-900 tracking-tighter">
                                            {`${data.Name_First?.[0] || ''}${data.Name_Last?.[0] || ''}`.toUpperCase().trim() || '??'}
                                        </span>
                                        {data.Sex && (
                                            <Tooltip text={`Biological Sex: ${data.Sex}`}>
                                                <span className="px-2 py-1 rounded bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-help">{data.Sex}</span>
                                            </Tooltip>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3 mt-2">Initials / Gender</p>
                        </div>

                        <div className="space-y-5">
                            <DetailField label="First Name" field="Name_First" value={formData.Name_First} onChange={handleInputChange} isEditing={isEditing} primaryColor={primaryColor} placeholder="Legal First Name" tooltip="Employee's official first name" />
                            <DetailField label="Middle Name" field="Name_Middle" value={formData.Name_Middle} onChange={handleInputChange} isEditing={isEditing} primaryColor={primaryColor} placeholder="Optional" tooltip="Optional middle name or initial" />
                            <DetailField label="Surname" field="Name_Last" value={formData.Name_Last} onChange={handleInputChange} isEditing={isEditing} primaryColor={primaryColor} placeholder="Family Name" tooltip="Employee's family name / surname" />
                            <DetailField label="Communication Email" field="EmailAddress" value={formData.EmailAddress} onChange={handleInputChange} isEditing={isEditing} icon="alternate_email" primaryColor={primaryColor} placeholder="email@example.com" tooltip="Primary contact email for system notifications" />
                            <DetailField label="Contact Mobile" field="PhoneNumber" value={formData.PhoneNumber} onChange={handleInputChange} isEditing={isEditing} icon="phone" primaryColor={primaryColor} placeholder="+1 (000) 000-0000" tooltip="Direct mobile contact number" />
                        </div>
                    </div>
                </div>

                {/* Column 2: Access & Roles */}
                <div className="space-y-4">
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden h-full">
                        <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <span className="w-1 h-3 rounded-full" style={{ backgroundColor: primaryColor }}></span>
                            System Access
                        </p>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <DetailField label="Network Login" field="LoginName" value={formData.LoginName} onChange={handleInputChange} isEditing={isEditing} primaryColor={primaryColor} placeholder="e.g. j.doe01" tooltip="Internal username used for core system access" />
                            </div>

                            <div className="pt-4 border-t border-slate-50 space-y-4">
                                <div className="flex items-center justify-between px-3">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Administrative Role</label>
                                    {!isEditing && (
                                        <Tooltip text="Verified security clearance level">
                                            <span className="material-symbols-rounded text-slate-300 text-sm cursor-help">verified_user</span>
                                        </Tooltip>
                                    )}
                                </div>

                                {isEditing ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Administrator', 'Manager', 'Sales', 'Developer', 'Staff Operations'].map((role) => (
                                            <Tooltip key={role} text={`Assign the '${role}' security permissions`}>
                                                <label className={`
                                                    flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.98]
                                                    ${formData.Role === role
                                                        ? 'bg-slate-900 border-slate-900 text-white shadow-md font-bold'
                                                        : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-white hover:border-slate-200'}
                                                `}>
                                                    <input
                                                        type="radio"
                                                        name="role"
                                                        className="hidden"
                                                        checked={formData.Role === role}
                                                        onChange={() => handleInputChange('Role', role)}
                                                    />
                                                    <span className={`material-icons-round text-sm ${formData.Role === role ? 'text-white' : 'text-slate-300'}`}>
                                                        {formData.Role === role ? 'check_circle' : 'radio_button_unchecked'}
                                                    </span>
                                                    <span className="text-[10px] font-black uppercase tracking-tight">{role}</span>
                                                </label>
                                            </Tooltip>
                                        ))}
                                    </div>
                                ) : (
                                    <Tooltip text={`The user is currently authorized as: ${data.Role || 'Staff Operations'}`}>
                                        <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-3xl border border-slate-50 shadow-inner group cursor-help">
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-slate-400 group-hover:text-slate-900 transition-colors">
                                                <span className="material-icons-round">security</span>
                                            </div>
                                            <div>
                                                <span className="text-sm font-black text-slate-900 block">{data.Role || 'Staff Operations'}</span>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Assigned Permissions</span>
                                            </div>
                                        </div>
                                    </Tooltip>
                                )}
                            </div>

                            {/* Module Access Levels Section */}
                            <div className="pt-6 border-t border-slate-50 space-y-4">
                                <div className="flex items-center justify-between px-3">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Module Access Levels</label>
                                    <Tooltip text="Granular permissions per system module">
                                        <span className="material-symbols-rounded text-slate-300 text-sm cursor-help">rule</span>
                                    </Tooltip>
                                </div>

                                <div className="max-h-[320px] overflow-y-auto pr-2 custom-scrollbar space-y-3">
                                    {loadingModules ? (
                                        <div className="flex flex-col items-center justify-center py-10 opacity-40">
                                            <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin mb-2"></div>
                                            <span className="text-[10px] font-black uppercase tracking-widest">Loading Modules...</span>
                                        </div>
                                    ) : modules.length > 0 ? (
                                        modules.map((m) => {
                                            const moduleName = m.fieldData.ModuleName;
                                            const currentPermission = modulePermissions[moduleName] || 'None';

                                            return (
                                                <div key={moduleName} className="bg-slate-50/50 rounded-2xl border border-slate-50 p-4 space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{moduleName}</span>
                                                    </div>

                                                    <div className="grid grid-cols-4 gap-1">
                                                        {['Read', 'Edit', 'Delete', 'None'].map((level) => (
                                                            <button
                                                                key={level}
                                                                disabled={!isEditing}
                                                                onClick={() => handlePermissionChange(moduleName, level)}
                                                                className={`
                                                                    py-2 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all
                                                                    ${currentPermission === level
                                                                        ? 'bg-slate-900 text-white shadow-sm'
                                                                        : 'bg-white text-slate-400 border border-slate-50 hover:bg-slate-100'
                                                                    }
                                                                    ${!isEditing && 'cursor-default opacity-80'}
                                                                `}
                                                            >
                                                                {level === 'Edit' ? 'Edit/C' : level}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Active Modules Found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 3: Lifecycle & Validity */}
                <div className="space-y-4">
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden h-full">
                        <div className="flex items-center justify-between mb-8">
                            <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="w-1 h-3 rounded-full" style={{ backgroundColor: primaryColor }}></span>
                                Tenure Record
                            </p>
                            <Tooltip text={data.Validity_EndDate > '20260101' ? "Record is within legal operating dates" : "Record has reached its expiration threshold"}>
                                <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100 cursor-help">
                                    <span className={`w-1.5 h-1.5 rounded-full ${data.Validity_EndDate > '20260101' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></span>
                                    <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">
                                        {data.Validity_EndDate > '20260101' ? 'Valid' : 'Expired'}
                                    </span>
                                </div>
                            </Tooltip>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-slate-50/50 rounded-[2rem] p-6 border border-slate-50 space-y-4">
                                <div className="flex items-center justify-between">
                                    <Tooltip text="Date of hire or activation in system">
                                        <div className="cursor-help">
                                            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Commencement</p>
                                            <p className="text-sm font-black text-slate-900 mt-1">{data.Validity_StartDate || '---'}</p>
                                        </div>
                                    </Tooltip>
                                    <span className="material-icons-round text-slate-200">event_available</span>
                                </div>
                                <div className="w-full h-px bg-slate-100"></div>
                                <div className="flex items-center justify-between">
                                    <Tooltip text="Expected date for review or termination">
                                        <div className="cursor-help">
                                            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Expiry / Renewal</p>
                                            <p className="text-sm font-black text-slate-900 mt-1">{data.Validity_EndDate || '---'}</p>
                                        </div>
                                    </Tooltip>
                                    <span className="material-icons-round text-slate-200">event_busy</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-50 space-y-4">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3 block">Digital Footprint</label>
                                <Tooltip text={`Record initially created on ${data.CreationTimestamp} by ${data.CreatedBy}`} fullWidth>
                                    <div className="w-full bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-center gap-4 cursor-help group">
                                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-slate-900 transition-colors">
                                            <span className="material-icons-round">fingerprint</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-900">{data.CreationTimestamp}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter text-left">Enrolled by {data.CreatedBy || 'Admin System'}</p>
                                        </div>
                                    </div>
                                </Tooltip>

                                {data.ModificationTimestamp && (
                                    <Tooltip text={`Last updated on ${data.ModificationTimestamp} by ${data.ModifiedBy}`} fullWidth>
                                        <div className="w-full flex items-center gap-3 px-3 py-3 bg-slate-50 rounded-xl border border-transparent hover:border-slate-100 transition-all cursor-help">
                                            <span className="material-icons-round text-xs text-slate-300">history_edu</span>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter text-left">
                                                Last Sync: {data.ModificationTimestamp} ({data.ModifiedBy})
                                            </p>
                                        </div>
                                    </Tooltip>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Global Action Section */}
            <div className="flex justify-center pt-1 border-t border-slate-50">
                <Tooltip text="Access historical transaction and sales records for this member">
                    <button
                        onClick={() => alert('Sales activity view coming soon!')}
                        className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl border font-black text-[11px] uppercase tracking-[0.2em] shadow-sm transition-all active:scale-95 group ${btnStyles.sales}`}
                    >
                        <span className="material-icons-round text-xl group-hover:scale-110 transition-transform">receipt_long</span>
                        View Related Sales

                    </button>
                </Tooltip>
            </div>
        </div>
    );
};

/* --- Internal Utilities --- */

const DetailField = ({ label, field, value, onChange, isEditing, icon, primaryColor, dark, placeholder, tooltip }) => (
    <div className="space-y-1 group w-full">
        <label className={`text-[9px] font-black uppercase tracking-widest ml-3 transition-colors ${dark ? 'text-slate-500 group-focus-within:text-white' : 'text-slate-400 group-focus-within:text-slate-800'}`}>{label}</label>
        <Tooltip text={isEditing ? `Click to edit ${label.toLowerCase()}` : (tooltip || `Value of ${label.toLowerCase()}`)} disabled={!isEditing && !tooltip} fullWidth>
            <div className="relative w-full">
                <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => onChange(field, e.target.value)}
                    disabled={!isEditing}
                    placeholder={placeholder || `Enter ${label}...`}
                    className={`
                        w-full py-3 lg:py-3.5 pl-4 pr-10 rounded-xl text-xs font-black transition-all focus:outline-none disabled:opacity-60
                        ${dark
                            ? 'bg-white/5 border border-white/5 text-white focus:bg-white/10 focus:border-white/20 placeholder-white/20'
                            : 'bg-slate-50 border border-slate-50 text-slate-800 focus:bg-white focus:shadow-md focus:border-slate-100 placeholder-slate-300'
                        }
                        ${!isEditing && 'cursor-help'}
                    `}
                    style={{
                        borderColor: isEditing && !dark ? 'transparent' : ''
                    }}
                    onFocus={(e) => isEditing && !dark && (e.target.style.borderColor = primaryColor)}
                    onBlur={(e) => !dark && (e.target.style.borderColor = 'transparent')}
                />
                {icon && (
                    <span className={`material-icons-round absolute right-3 top-1/2 -translate-y-1/2 text-base ${dark ? 'text-white/20' : 'text-slate-300'}`} style={{ color: isEditing && !dark ? primaryColor : 'inherit' }}>{icon}</span>
                )}
            </div>
        </Tooltip>
    </div>
);

export default EmployeeDetail;
