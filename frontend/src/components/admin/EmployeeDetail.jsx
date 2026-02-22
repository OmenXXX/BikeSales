import React, { useState, useEffect } from 'react';
import Tooltip from '../common/Tooltip';
import { getEmployees, getRecords, updateRecord, suspendUser, activateUser, updateUserCredentials, getModules } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useStatus } from '../../context/StatusContext';

const CustomDropdown = ({ value, options, onChange, placeholder, tooltip, isEditing, primaryColor }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = React.useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value) || options.find(opt => opt.label === value);

    const containerClasses = `
        w-full h-12 lg:h-10 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-between
        bg-slate-50 border border-slate-50 text-slate-900
    `;

    const displayValue = selectedOption ? selectedOption.label : (value || placeholder);
    const isPlaceholder = !value;

    const content = (
        <>
            <span className={isPlaceholder ? 'text-slate-300' : 'text-slate-900 uppercase tracking-widest'}>
                {displayValue}
            </span>
            <span
                className={`material-icons-round text-lg transition-all duration-300 ${isOpen ? 'rotate-180' : ''} ${!isEditing ? 'opacity-0' : 'text-slate-300'}`}
                style={{ color: isOpen && isEditing ? primaryColor : '' }}
            >
                expand_more
            </span>
        </>
    );

    if (!isEditing) {
        return (
            <div className={containerClasses}>
                {content}
            </div>
        );
    }

    return (
        <div className="relative group w-full" ref={dropdownRef}>
            <Tooltip text={tooltip || `Select ${placeholder}`} fullWidth>
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className={`${containerClasses} cursor-pointer hover:bg-white hover:shadow-md transition-all`}
                    style={{
                        borderColor: isOpen ? primaryColor : 'transparent',
                        backgroundColor: isOpen ? '#fff' : ''
                    }}
                >
                    {content}
                </div>
            </Tooltip>

            {isOpen && (
                <div className="absolute z-[100] mt-2 w-full bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in slide-in-from-top-2 duration-200 origin-top">
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {options.map((opt) => (
                            <div
                                key={opt.value}
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className={`
                                    px-4 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors
                                    ${value === opt.value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}
                                `}
                            >
                                {opt.label}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const EmployeeDetail = ({
    employee,
    isEditing,
    setIsEditing,
    primaryColor,
    carbonFiberStyle,
    canEdit,
    onUpdate,
    isLoading
}) => {
    const { userData, logout } = useAuth();
    const { showStatus } = useStatus();
    const data = employee.fieldData;
    const recordId = employee.recordId;
    const isActive = data.Active === '1' || data.Active === 1;
    const isSelf = employee.recordId === userData?.recordId;

    const [formData, setFormData] = useState({ ...data });
    const [modules, setModules] = useState([]);
    const [loadingModules, setLoadingModules] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
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
                // Use specialized endpoint
                const response = await getModules();
                if (response.success) {
                    setModules(response.data || []);

                    const initialPermissions = {};

                    // 1. Parse existing permissions from AccessLevelJSON
                    let existingPermissions = {};
                    try {
                        if (employee.fieldData.AccessLevelJSON) {
                            existingPermissions = JSON.parse(employee.fieldData.AccessLevelJSON);
                        }
                    } catch (e) {
                        console.warn("Failed to parse AccessLevelJSON", e);
                    }

                    // 2. Map active modules using PrimaryKey as key
                    // FALLBACK: If PrimaryKey not found, try ModuleName (for legacy data)
                    (response.data || []).forEach(m => {
                        const moduleId = m.fieldData.PrimaryKey;
                        const moduleName = m.fieldData.ModuleName;

                        // Priority: 1. ID-based key, 2. Name-based key (legacy), 3. Default 'None'
                        initialPermissions[moduleId] = existingPermissions[moduleId] || existingPermissions[moduleName] || 'None';
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
    }, [employee]); // RE-RUN when employee switches

    const handlePermissionChange = (moduleId, level) => {
        setModulePermissions(prev => ({
            ...prev,
            [moduleId]: level
        }));
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async () => {
        // Validation check
        if (!formData.EmailAddress) {
            showStatus({ type: 'error', title: 'Missing Info', message: 'Email Address is required to identify the user.' });
            return;
        }

        const isSelfUpdate = isSelf;
        const emailChanged = formData.EmailAddress !== employee.fieldData.EmailAddress;

        if (isSelfUpdate && emailChanged) {
            const confirmed = window.confirm("You are updating your own email address. For security reasons, you will be logged out and asked to sign in again with your new credentials. Proceed?");
            if (!confirmed) return;
        }

        setSaving(true);
        try {
            // 1. If Email changed, update Firebase first
            if (emailChanged) {
                const firebaseUid = employee.fieldData.FireBaseUserID;
                if (!firebaseUid) throw new Error("Firebase User ID not found on record. Sync failed.");

                await updateUserCredentials(firebaseUid, { email: formData.EmailAddress });
                console.log("Firebase Email Synced successfully.");
            }

            // 2. Update FileMaker
            // SANITIZATION: Strip non-editable/system fields to prevent "noise" and API errors
            const {
                PrimaryKey,
                FireBaseUserID,
                EmployeeID,
                CreationTimestamp,
                ModificationTimestamp,
                CreatedBy,
                ModifiedBy,
                ...sanitizedData
            } = formData;

            const updateData = {
                ...sanitizedData,
                AccessLevelJSON: JSON.stringify(modulePermissions)
            };

            // Debug Logging: Clear, raw data for backend troubleshooting (as requested)
            console.group("🚀 BACKEND UPDATE REQUEST");
            console.log("Layout:", 'Employees');
            console.log("Record ID:", recordId);
            console.log("Raw Payload Object:", updateData); // Raw object for easy JSON copy/paste in console

            // Visual aid with line numbers
            const payloadString = JSON.stringify(updateData, null, 2);
            console.log("Formatted JSON Payload:");
            payloadString.split('\n').forEach((line, index) => {
                console.log(`${(index + 1).toString().padStart(3, ' ')} | ${line} `);
            });
            console.groupEnd();

            const result = await updateRecord('Employees', recordId, updateData);

            if (result.success) {
                // Construct the updated record for in-memory sync
                const updatedRecord = {
                    ...employee,
                    fieldData: {
                        ...employee.fieldData,
                        ...updateData,
                        AccessLevelJSON: JSON.stringify(modulePermissions) // Ensure it's the correct stringified version
                    }
                };

                if (isSelfUpdate && emailChanged) {
                    await logout(true, "Email updated successfully. Please sign in with your new email.");
                    return;
                }

                // Sync parent state in memory
                if (onUpdate) onUpdate(updatedRecord);

                setIsEditing(false);
                showStatus({
                    type: 'success',
                    title: 'Record Saved',
                    message: `Personnel record for ${formData.Name_First} has been updated successfully.`
                });
            }
        } catch (err) {
            console.error("Save failed", err);
            showStatus({
                type: 'error',
                title: 'Save Failed',
                message: err.error || err.message || "An unexpected error occurred while saving."
            });
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setFormData({ ...data });

        // Re-initialize permissions from original data with ID-mapping
        try {
            const initialPermissions = {};
            let existingPermissions = {};
            if (data.AccessLevelJSON) {
                existingPermissions = JSON.parse(data.AccessLevelJSON);
            }

            modules.forEach(m => {
                const moduleId = m.fieldData.PrimaryKey;
                const moduleName = m.fieldData.ModuleName;
                initialPermissions[moduleId] = existingPermissions[moduleId] || existingPermissions[moduleName] || 'None';
            });
            setModulePermissions(initialPermissions);
        } catch (e) {
            console.warn("Failed to reset module permissions on cancel", e);
        }

        setIsEditing(false);
    };

    const handleToggleStatus = async () => {
        const isCurrentlyActive = isActive;
        const newStatus = isCurrentlyActive ? "SUSPENDED" : "1";
        const confirmMessage = isCurrentlyActive
            ? `Are you sure you want to SUSPEND access for ${data.Name_First} ? They will be logged out immediately.`
            : `Activate access for ${data.Name_First} ? `;

        if (window.confirm(confirmMessage)) {
            try {
                if (isCurrentlyActive) {
                    await suspendUser(data.FireBaseUserID, recordId);
                } else {
                    await activateUser(data.FireBaseUserID, recordId);
                }

                // Update in memory
                const updatedRecord = {
                    ...employee,
                    fieldData: {
                        ...employee.fieldData,
                        Active: newStatus
                    }
                };
                if (onUpdate) onUpdate(updatedRecord);

                showStatus({
                    type: 'success',
                    title: 'Status Updated',
                    message: `${data.Name_First} 's account has been ${isCurrentlyActive ? 'suspended' : 'activated'} successfully.`
                });
            } catch (err) {
                console.error("Status toggle failed", err);
                showStatus({
                    type: 'error',
                    title: 'Update Failed',
                    message: "Failed to update user status. Please try again."
                });
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
        <div className="relative">
            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-white/40 backdrop-blur-[2px] rounded-[3rem] transition-all duration-300 min-h-[400px]">
                    <div className="flex flex-col items-center gap-4">
                        <div
                            className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-slate-800 animate-spin"
                            style={{ borderTopColor: primaryColor }}
                        ></div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 animate-pulse">Syncing Profile...</span>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto space-y-4 animate-slide-up pb-10">
                {/* Header / Action Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-2.5 px-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    {/* Left Side: Brief Identity */}
                    <div className="flex items-center">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-black text-slate-900 tracking-tighter leading-none flex items-center">
                                {data.Name_First} {data.Name_Last}
                            </h2>
                            <span className="text-slate-200 font-light select-none">|</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mt-0.5">{data.Role || 'Staff Member'}</span>
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
                            {/* Status Toggle (Suspend/Activate) - Only available for Admins, disabled for self */}
                            {canEdit && (
                                <Tooltip text={isSelf ? "You cannot suspend your own account." : (isActive ? "Disable user access immediately" : "Restore user access to the platform")}>
                                    <button
                                        onClick={handleToggleStatus}
                                        disabled={isSelf}
                                        className={`flex items-center justify-center px-5 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95 w-28 ${isSelf ? 'opacity-30 cursor-not-allowed' : ''} ${isActive ? btnStyles.suspend : btnStyles.activate}`}
                                    >
                                        {isActive ? 'Suspend' : 'Activate'}
                                    </button>
                                </Tooltip>
                            )}

                            {/* Edit Controls */}
                            <div className="flex gap-2">
                                {canEdit ? (
                                    !isEditing ? (
                                        <Tooltip text={isSelf ? "You cannot edit your own profile from here." : "Unlock record for editing"}>
                                            <button
                                                onClick={() => !isSelf && setIsEditing(true)}
                                                disabled={isSelf}
                                                className={`flex items-center justify-center px-5 py-2.5 rounded-xl border font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 w-28 ${isSelf ? 'opacity-30 cursor-not-allowed' : ''} ${btnStyles.edit}`}
                                            >
                                                Edit
                                            </button>
                                        </Tooltip>
                                    ) : (
                                        <>
                                            <Tooltip text="Commit all changes to the database">
                                                <button
                                                    onClick={handleSave}
                                                    disabled={saving}
                                                    className={`flex items-center justify-center px-5 py-2.5 rounded-xl border font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 w-28 ${btnStyles.save} ${saving ? 'opacity-50 cursor-wait' : ''}`}
                                                >
                                                    {saving ? 'Saving...' : 'Save'}
                                                </button>
                                            </Tooltip>
                                            <Tooltip text="Discard unsaved changes and return to read mode">
                                                <button
                                                    onClick={handleCancel}
                                                    disabled={saving}
                                                    className={`flex items-center justify-center px-5 py-2.5 rounded-xl border font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 w-28 ${btnStyles.cancel}`}
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
                    </div >
                </div >

                {/* Content Grid */}
                < div className="grid grid-cols-1 lg:grid-cols-3 gap-4" >
                    {/* Column 1: Identity */}
                    < div className="space-y-4" >
                        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden h-full">
                            <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <span className="w-1 h-3 rounded-full" style={{ backgroundColor: primaryColor }}></span>
                                Personal Identity
                            </p>

                            <div className="grid grid-cols-3 gap-6 mb-8 items-start">
                                <div className="col-span-2">
                                    <Tooltip text="Employee Profile Photo" fullWidth>
                                        <div className="w-full aspect-[4/3] rounded-[2.5rem] bg-slate-50 border-4 border-slate-50 overflow-hidden shadow-inner flex items-center justify-center cursor-help">
                                            {data.photo ? (
                                                <img
                                                    src={data.photo}
                                                    className="w-full h-full object-cover"
                                                    alt="Profile"
                                                />
                                            ) : (
                                                <span className="text-6xl font-black text-slate-200">
                                                    {(formData.NameInitials || `${formData.Name_First?.[0] || ''}${formData.Name_Last?.[0] || ''}`).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                    </Tooltip>
                                </div>

                                <div className="col-span-1 flex flex-col justify-start space-y-3">
                                    <div className="space-y-1">
                                        <div className="w-full h-12 lg:h-10 px-4 rounded-xl text-xs font-black bg-slate-50 border border-slate-50 transition-all flex items-center justify-between">
                                            {isEditing ? (
                                                <Tooltip text="Edit Employee Initials (max 3 chars)" fullWidth>
                                                    <input
                                                        type="text"
                                                        value={formData.NameInitials || ''}
                                                        onChange={(e) => handleInputChange('NameInitials', e.target.value.toUpperCase().slice(0, 3))}
                                                        placeholder="AS"
                                                        className="w-full bg-transparent outline-none placeholder-slate-300 focus:text-slate-800"
                                                        onFocus={(e) => (e.target.parentElement.parentElement.style.borderColor = primaryColor)}
                                                        onBlur={(e) => (e.target.parentElement.parentElement.style.borderColor = 'transparent')}
                                                    />
                                                </Tooltip>
                                            ) : (
                                                <span className={!formData.NameInitials ? 'text-slate-300' : 'text-slate-800 uppercase tracking-widest'}>
                                                    {formData.NameInitials || 'AS'}
                                                </span>
                                            )}
                                            <span className="material-icons-round text-lg opacity-0 select-none">expand_more</span>
                                        </div>
                                    </div>

                                    <CustomDropdown
                                        value={formData.Prefix}
                                        options={[
                                            { label: 'Mr', value: 'Mr' },
                                            { label: 'Ms', value: 'Ms' },
                                            { label: 'Mrs', value: 'Mrs' }
                                        ]}
                                        onChange={(val) => handleInputChange('Prefix', val)}
                                        placeholder="Prefix"
                                        tooltip="Select title / prefix"
                                        isEditing={isEditing}
                                        primaryColor={primaryColor}
                                    />

                                    <CustomDropdown
                                        value={formData.Sex}
                                        options={[
                                            { label: 'Male', value: 'Male' },
                                            { label: 'Female', value: 'Female' },
                                            { label: 'Other', value: 'Other' }
                                        ]}
                                        onChange={(val) => handleInputChange('Sex', val)}
                                        placeholder="Gender"
                                        tooltip="Select biological sex"
                                        isEditing={isEditing}
                                        primaryColor={primaryColor}
                                    />
                                </div>
                            </div>

                            <div className="space-y-5">
                                <DetailField label="First Name" field="Name_First" value={formData.Name_First} onChange={handleInputChange} isEditing={isEditing} primaryColor={primaryColor} placeholder="Legal First Name" tooltip="Employee's official first name" validationType="name" />
                                <DetailField label="Middle Name" field="Name_Middle" value={formData.Name_Middle} onChange={handleInputChange} isEditing={isEditing} primaryColor={primaryColor} placeholder="Optional" tooltip="Optional middle name or initial" validationType="name" />
                                <DetailField label="Surname" field="Name_Last" value={formData.Name_Last} onChange={handleInputChange} isEditing={isEditing} primaryColor={primaryColor} placeholder="Family Name" tooltip="Employee's family name / surname" validationType="name" />
                                <DetailField label="Communication Email" field="EmailAddress" value={formData.EmailAddress} onChange={handleInputChange} isEditing={isEditing} icon="alternate_email" primaryColor={primaryColor} placeholder="email@example.com" tooltip="Primary contact email for system notifications" validationType="email" />
                                <DetailField label="Contact Mobile" field="PhoneNumber" value={formData.PhoneNumber} onChange={handleInputChange} isEditing={isEditing} icon="phone" primaryColor={primaryColor} placeholder="+1 (000) 000-0000" tooltip="Direct mobile contact number" validationType="phone" />
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Access & Roles */}
                    <div className="space-y-4 flex flex-col h-full">
                        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden h-full flex flex-col">
                            <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <span className="w-1 h-3 rounded-full" style={{ backgroundColor: primaryColor }}></span>
                                System Access
                            </p>

                            <div className="space-y-6">
                                <div className="space-y-6">
                                    {isEditing && (
                                        <div className="pt-2">
                                            <button
                                                onClick={() => setShowPasswordModal(true)}
                                                className="w-full h-12 lg:h-10 flex items-center justify-center gap-2 px-6 rounded-xl border border-indigo-100 bg-indigo-50/30 text-indigo-600 font-[800] text-[10px] uppercase tracking-widest hover:bg-indigo-50 hover:border-indigo-200 transition-all active:scale-95 group"
                                            >
                                                <span className="material-icons-round text-lg group-hover:rotate-12 transition-transform">lock_reset</span>
                                                Update System Password
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-slate-50 space-y-4">
                                    <div className="flex items-center justify-between px-3">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{isEditing ? 'Security Clearance' : ''}</label>

                                    </div>

                                    {isEditing ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            {['Administrator', 'Manager', 'Sales', 'Staff Operations'].map((role) => (
                                                <Tooltip key={role} text={`Assign the '${role}' security permissions`} fullWidth>
                                                    <label className={`
                                                    flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all active:scale-[0.98] w-full
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
                                                        <span className={`material-icons-round text-[14px] ${formData.Role === role ? 'text-white' : 'text-slate-300'}`}>
                                                            {formData.Role === role ? 'check_circle' : 'radio_button_unchecked'}
                                                        </span>
                                                        <span className="text-[9px] font-black uppercase tracking-tight">{role}</span>
                                                    </label>
                                                </Tooltip>
                                            ))}
                                        </div>
                                    ) : (
                                        <Tooltip text={`The user is currently authorized as: ${data.Role || 'Staff Operations'}`} fullWidth>
                                            <div className="w-full flex items-center gap-4 bg-slate-50 p-5 rounded-3xl border border-slate-50 shadow-inner group cursor-help">
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
                                <div className="pt-6 border-t border-slate-50 space-y-4 flex-1 flex flex-col min-h-0">
                                    <div className="flex items-center justify-between px-3">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Module Access Levels</label>
                                    </div>
                                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                                        {loadingModules ? (
                                            <div className="flex flex-col items-center justify-center py-10 opacity-40">
                                                <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin mb-2"></div>
                                                <span className="text-[10px] font-black uppercase tracking-widest">Loading Modules...</span>
                                            </div>
                                        ) : modules.length > 0 ? (
                                            modules.map((m) => {
                                                const moduleName = m.fieldData.ModuleName;
                                                const moduleId = m.fieldData.PrimaryKey;
                                                const currentPermission = modulePermissions[moduleId] || 'None';

                                                return (
                                                    <div key={moduleId} className="bg-slate-50/50 rounded-2xl border border-slate-50 p-3 space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{moduleName}</span>
                                                        </div>

                                                        <div className="grid grid-cols-4 gap-1">
                                                            {['Read', 'Edit', 'Delete', 'None'].map((level) => (
                                                                <button
                                                                    key={level}
                                                                    disabled={!isEditing}
                                                                    onClick={() => handlePermissionChange(moduleId, level)}
                                                                    className={`
                                                                    py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all
                                                                    ${currentPermission === level
                                                                            ? 'bg-slate-900 text-white shadow-sm'
                                                                            : 'bg-white text-slate-400 border border-slate-50 hover:bg-slate-100'
                                                                        }
                                                                    ${!isEditing && 'cursor-default opacity-80'}
                                                                `}
                                                                >
                                                                    {level === 'Edit' ? 'Edit/Create' : level}
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
                    </div >
                </div >

                {/* Global Action Section */}
                < div className="flex justify-center pt-1 border-t border-slate-50" >
                    <Tooltip text="Access historical transaction and sales records for this member">
                        <button
                            onClick={() => alert('Sales activity view coming soon!')}
                            className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl border font-black text-[11px] uppercase tracking-[0.2em] shadow-sm transition-all active:scale-95 group ${btnStyles.sales}`}
                        >
                            <span className="material-icons-round text-xl group-hover:scale-110 transition-transform">receipt_long</span>
                            View Related Sales

                        </button>
                    </Tooltip>
                    {/* Password Modal */}
                    {showPasswordModal && (
                        <ChangePasswordModal
                            onClose={() => setShowPasswordModal(false)}
                            onSubmit={async (pw) => {
                                if (isSelf) {
                                    const confirmed = window.confirm("You are updating your own password. For security reasons, you will be logged out. Proceed?");
                                    if (!confirmed) return;
                                }

                                try {
                                    const firebaseUid = employee.fieldData.FireBaseUserID;
                                    await updateUserCredentials(firebaseUid, { password: pw });

                                    if (isSelf) {
                                        await logout(true, "Password updated successfully. Please sign in with your new password.");
                                    } else {
                                        showStatus({
                                            type: 'success',
                                            title: 'Password Updated',
                                            message: `System access password for ${data.Name_First} has been updated successfully.`
                                        });
                                        setShowPasswordModal(false);
                                    }
                                } catch (err) {
                                    showStatus({
                                        type: 'error',
                                        title: 'Update Failed',
                                        message: err.error || err.message || "Failed to update internal system password."
                                    });
                                }
                            }}
                            primaryColor={primaryColor}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

/* --- Internal Utilities --- */

const ChangePasswordModal = ({ onClose, onSubmit, primaryColor }) => {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const validate = () => {
        if (password.length < 8) return "Password must be at least 8 characters.";
        if (!/[A-Za-z]/.test(password)) return "Password must contain at least one letter.";
        if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
        if (password !== confirm) return "Passwords do not match.";
        return null;
    };

    const handleSubmit = async () => {
        const err = validate();
        if (err) {
            setError(err);
            return;
        }
        setLoading(true);
        setError('');
        try {
            await onSubmit(password);
        } catch (err) {
            setError(err.message || "Failed to update internal system password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-white overflow-hidden animate-slide-up">
                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-slate-900">Security Access</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Update System Password</p>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all">
                            <span className="material-icons-round text-xl">close</span>
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">New Password</label>
                            <div className="relative group">
                                <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-lg group-focus-within:text-slate-900 transition-colors">lock</span>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                    className="w-full h-12 pl-12 pr-12 rounded-2xl bg-slate-50 border border-slate-50 text-xs font-black placeholder-slate-300 outline-none focus:bg-white focus:border-slate-100 focus:shadow-sm transition-all"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                                >
                                    <span className="material-icons-round text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirm Identity</label>
                            <div className="relative group">
                                <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-lg group-focus-within:text-slate-900 transition-colors">verified_user</span>
                                <input
                                    type="password"
                                    value={confirm}
                                    onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                                    className="w-full h-12 pl-12 pr-4 rounded-2xl bg-slate-50 border border-slate-50 text-xs font-black placeholder-slate-300 outline-none focus:bg-white focus:border-slate-100 focus:shadow-sm transition-all"
                                    placeholder="Confirm new password"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-tight flex items-center gap-3 animate-shake">
                                <span className="material-icons-round text-base">warning</span>
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 mt-10">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 rounded-2xl border border-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 active:scale-[0.98] transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className={`flex-1 py-4 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-50 cursor-wait' : ''}`}
                            style={{ backgroundColor: primaryColor }}
                        >
                            {loading ? 'Processing...' : (
                                <>
                                    <span className="material-icons-round text-sm">save</span>
                                    Apply Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DetailField = ({ label, field, value, onChange, isEditing, icon, primaryColor, dark, placeholder, tooltip, validationType }) => {
    const validate = (val) => {
        if (!val) return true;
        if (validationType === 'name') return /^[a-zA-Z0-9 ]{1,50}$/.test(val);
        if (validationType === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        if (validationType === 'phone') return /^[\d\+\-\(\) ]{7,20}$/.test(val);
        return true;
    };

    const isValid = validate(value);

    return (
        <div className="space-y-1 group w-full">
            <label className={`text-[9px] font-black uppercase tracking-widest ml-3 transition-colors ${dark ? 'text-slate-500 group-focus-within:text-white' : 'text-slate-400 group-focus-within:text-slate-800'}`}>{label}</label>
            <Tooltip text={!isValid ? `Invalid ${label} format` : (isEditing ? `Click to edit ${label.toLowerCase()}` : (tooltip || `Value of ${label.toLowerCase()}`))} disabled={!isEditing && !tooltip && isValid} fullWidth>
                <div className="relative w-full">
                    <input
                        type="text"
                        value={value || ''}
                        onChange={(e) => onChange(field, e.target.value)}
                        disabled={!isEditing}
                        placeholder={placeholder || `Enter ${label}...`}
                        className={`
                            w-full h-12 lg:h-10 pl-4 pr-10 rounded-xl text-xs font-black transition-all focus:outline-none 
                            ${dark
                                ? 'bg-white/5 border border-white/5 text-white focus:bg-white/10 focus:border-white/20 placeholder-white/20'
                                : 'bg-slate-50 border border-slate-50 text-slate-900 focus:bg-white focus:shadow-md focus:border-slate-100 placeholder-slate-300'
                            }
                            ${!isEditing && 'cursor-help'}
                            ${!isValid && isEditing ? '!border-rose-300 !bg-rose-50/30' : ''}
                        `}
                        style={{
                            borderColor: isEditing && !dark && isValid ? 'transparent' : (!isValid && isEditing ? '#fda4af' : '')
                        }}
                        onFocus={(e) => isEditing && !dark && isValid && (e.target.style.borderColor = primaryColor)}
                        onBlur={(e) => !dark && isValid && (e.target.style.borderColor = 'transparent')}
                    />
                    {icon && (
                        <span className={`material-icons-round absolute right-3 top-1/2 -translate-y-1/2 text-base transition-colors ${dark ? 'text-white/20' : 'text-slate-300'} ${!isValid && isEditing ? 'text-rose-400' : ''}`} style={{ color: isEditing && !dark && isValid ? primaryColor : '' }}>{icon}</span>
                    )}
                    {!isValid && isEditing && (
                        <span className="material-icons-round absolute right-10 top-1/2 -translate-y-1/2 text-rose-400 text-sm animate-pulse">warning</span>
                    )}
                </div>
            </Tooltip>
        </div>
    );
};

export default EmployeeDetail;
