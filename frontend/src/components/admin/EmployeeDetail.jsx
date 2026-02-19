import React from 'react';
import Tooltip from '../common/Tooltip';
import { suspendUser, activateUser } from '../../api';

const EmployeeDetail = ({
    employee,
    isEditing,
    setIsEditing,
    primaryColor,
    carbonFiberStyle,
    canEdit
}) => {
    const data = employee.fieldData;

    return (
        <div className="max-w-7xl mx-auto space-y-4 animate-slide-up pb-10">
            {/* Header / Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-[1.2rem] overflow-hidden shadow-lg border-2 border-slate-50 relative group">
                        <img
                            src={data.photo || `https://ui-avatars.com/api/?name=${data.Name_First}+${data.Name_Last}&background=7393B3&color=fff&size=200`}
                            alt={data.Name_First}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{data.Name_First} {data.Name_Last}</h2>
                            {data.z_active_state === 'ACTIVE' && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[9px] font-black text-slate-500 tracking-widest uppercase">ID: {data.EmployeeID}</div>
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{data.Role || 'Staff Member'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                    {/* Status Toggle (Suspend/Activate) */}
                    {canEdit && (
                        <button
                            onClick={async () => {
                                const isSuspended = data.z_active_state === 'SUSPENDED';
                                try {
                                    if (isSuspended) {
                                        await activateUser(data.FireBaseUserID, employee.recordId);
                                    } else {
                                        if (window.confirm(`Are you sure you want to suspend access for ${data.Name_First}? They will be logged out immediately.`)) {
                                            await suspendUser(data.FireBaseUserID, employee.recordId);
                                        }
                                    }
                                    window.location.reload();
                                } catch (e) {
                                    console.error("Status Toggle Failed", e);
                                    alert("Failed to update status");
                                }
                            }}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all
                                ${data.z_active_state === 'ACTIVE'
                                    ? 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white hover:shadow-[0_0_15px_rgba(225,29,72,0.3)]'
                                    : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                }`}
                        >
                            <span className="material-icons-round text-base">{data.z_active_state === 'ACTIVE' ? 'person_off' : 'person_add'}</span>
                            {data.z_active_state === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}
                        </button>
                    )}

                    <div className="w-px h-8 bg-slate-100 hidden sm:block mx-1"></div>

                    {/* Edit Controls */}
                    <div className="flex gap-2">
                        {canEdit ? (
                            !isEditing ? (
                                <Tooltip text="Modify Employee Record">
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1a1d21] text-white font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all active:scale-95 group"
                                    >
                                        <span className="material-icons-round text-base group-hover:rotate-12 transition-transform" style={{ color: primaryColor }}>edit</span>
                                        Edit
                                    </button>
                                </Tooltip>
                            ) : (
                                <>
                                    <Tooltip text="Save All Changes">
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="px-5 py-2.5 rounded-xl bg-[#1a1d21] text-white font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all"
                                            style={{ border: `1px solid ${primaryColor}` }}
                                        >
                                            Save
                                        </button>
                                    </Tooltip>
                                    <Tooltip text="Discard Changes">
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="px-5 py-2.5 rounded-xl bg-white text-slate-500 border border-slate-200 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </Tooltip>
                                </>
                            )
                        ) : (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 opacity-60 select-none cursor-not-allowed">
                                <span className="material-icons-round text-slate-400 text-sm">lock</span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Locked</span>
                            </div>
                        )}
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

                        <div className="flex items-start gap-5 mb-8">
                            <div className="w-20 h-20 rounded-[1.5rem] bg-slate-50 border-4 border-slate-50 overflow-hidden shadow-inner flex-shrink-0">
                                <img
                                    src={data.photo || `https://ui-avatars.com/api/?name=${data.Name_First}+${data.Name_Last}&background=7393B3&color=fff&size=200`}
                                    className="w-full h-full object-cover"
                                    alt="Profile"
                                />
                            </div>
                            <div className="space-y-1 py-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-3xl font-black text-slate-900 tracking-tighter">
                                        {data.NameInitials || `${data.Name_First?.[0] || ''}${data.Name_Last?.[0] || ''}`.toUpperCase().trim() || '??'}
                                    </span>
                                    {data.Sex && (
                                        <span className="px-2 py-1 rounded bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">{data.Sex}</span>
                                    )}
                                </div>
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Initials / Gender</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <DetailField label="First Name" value={data.Name_First} isEditing={isEditing} primaryColor={primaryColor} placeholder="Legal First Name" />
                                <DetailField label="Middle Name" value={data.Name_Middle} isEditing={isEditing} primaryColor={primaryColor} placeholder="Optional" />
                            </div>
                            <DetailField label="Surname" value={data.Name_Last} isEditing={isEditing} primaryColor={primaryColor} placeholder="Family Name" />
                            <DetailField label="Communication Email" value={data.EmailAddress} isEditing={isEditing} icon="alternate_email" primaryColor={primaryColor} placeholder="email@example.com" />
                            <DetailField label="Contact Mobile" value={data.PhoneNumber} isEditing={isEditing} icon="phone" primaryColor={primaryColor} placeholder="+1 (000) 000-0000" />
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
                                <DetailField label="Network Login" value={data.LoginName} isEditing={isEditing} primaryColor={primaryColor} placeholder="e.g. j.doe01" />
                                <div className="grid grid-cols-2 gap-3">
                                    <DetailField label="Reference ID" value={data.AddressID} isEditing={isEditing} primaryColor={primaryColor} placeholder="UID-000" />
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Security Level</label>
                                        <div className={`px-4 py-3 rounded-2xl border ${data.z_active_state === 'ACTIVE' ? 'bg-emerald-50 border-emerald-100 text-emerald-600 font-bold' : 'bg-rose-50 border-rose-100 text-rose-600 font-bold'} text-xs text-center uppercase tracking-wider`}>
                                            {data.z_active_state === 'ACTIVE' ? 'Authorized' : 'Suspended'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-50 space-y-4">
                                <div className="flex items-center justify-between px-3">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Administrative Role</label>
                                    {!isEditing && <span className="material-symbols-rounded text-slate-300 text-sm">verified_user</span>}
                                </div>
                                
                                {isEditing ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Administrator', 'Manager', 'Sales', 'Developer', 'Staff Operations'].map((role) => (
                                            <label key={role} className={`
                                                flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.98]
                                                ${data.Role === role 
                                                    ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                                                    : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-white hover:border-slate-200'}
                                            `}>
                                                <input
                                                    type="radio"
                                                    name="role"
                                                    className="hidden"
                                                    defaultChecked={data.Role === role}
                                                />
                                                <span className={`material-icons-round text-sm ${data.Role === role ? 'text-white' : 'text-slate-300'}`}>
                                                    {data.Role === role ? 'check_circle' : 'radio_button_unchecked'}
                                                </span>
                                                <span className="text-[10px] font-black uppercase tracking-tight">{role}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-3xl border border-slate-50 shadow-inner group">
                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-slate-400 group-hover:text-slate-900 transition-colors">
                                            <span className="material-icons-round">security</span>
                                        </div>
                                        <div>
                                            <span className="text-sm font-black text-slate-900 block">{data.Role || 'Staff Operations'}</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Assigned Permissions</span>
                                        </div>
                                    </div>
                                )}
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
                            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                                <span className={`w-1.5 h-1.5 rounded-full ${data.Validity_EndDate > '20260101' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></span>
                                <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">
                                    {data.Validity_EndDate > '20260101' ? 'Valid' : 'Expired'}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-slate-50/50 rounded-[2rem] p-6 border border-slate-50 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Commencement</p>
                                        <p className="text-sm font-black text-slate-900 mt-1">{data.Validity_StartDate || '---'}</p>
                                    </div>
                                    <span className="material-icons-round text-slate-200">event_available</span>
                                </div>
                                <div className="w-full h-px bg-slate-100"></div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Expiry / Renewal</p>
                                        <p className="text-sm font-black text-slate-900 mt-1">{data.Validity_EndDate || '---'}</p>
                                    </div>
                                    <span className="material-icons-round text-slate-200">event_busy</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-50">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3 mb-3 block">Digital Footprint</label>
                                <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                                        <span className="material-icons-round">fingerprint</span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-900">{data.CreationTimestamp}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Enrolled by {data.CreatedBy || 'Admin System'}</p>
                                    </div>
                                </div>

                                {data.ModificationTimestamp && (
                                    <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-transparent hover:border-slate-100 transition-colors">
                                        <span className="material-icons-round text-xs text-slate-300">history_edu</span>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                            Last Synchronized: {data.ModificationTimestamp} (Agent: {data.ModifiedBy})
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* --- Internal Utilities --- */

const DetailField = ({ label, value, isEditing, icon, primaryColor, dark, placeholder }) => (
    <div className="space-y-1 group">
        <label className={`text-[9px] font-black uppercase tracking-widest ml-3 transition-colors ${dark ? 'text-slate-500 group-focus-within:text-white' : 'text-slate-400 group-focus-within:text-slate-800'}`}>{label}</label>
        <div className="relative">
            <input
                type="text"
                defaultValue={value}
                disabled={!isEditing}
                placeholder={placeholder || `Enter ${label}...`}
                className={`
                    w-full py-3 pl-4 pr-10 rounded-xl text-xs font-black transition-all focus:outline-none disabled:opacity-60
                    ${dark
                        ? 'bg-white/5 border border-white/5 text-white focus:bg-white/10 focus:border-white/20 placeholder-white/20'
                        : 'bg-slate-50 border border-slate-50 text-slate-800 focus:bg-white focus:shadow-md focus:border-slate-100 placeholder-slate-300'
                    }
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
    </div>
);

export default EmployeeDetail;
