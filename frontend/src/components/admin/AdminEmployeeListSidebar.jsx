import React, { useState, useMemo } from 'react';
import Tooltip from '../common/Tooltip';

const AdminEmployeeListSidebar = ({
    employees,
    selectedEmployee,
    onSelectEmployee,
    primaryColor
}) => {
    const [searchQuery, setSearchQuery] = useState('');

    // Filter employees locally for this sidebar
    const filteredEmployees = useMemo(() => {
        if (!searchQuery) return employees;
        const q = searchQuery.toLowerCase();
        return employees.filter(emp =>
            emp.fieldData.Name_First?.toLowerCase().includes(q) ||
            emp.fieldData.Name_Last?.toLowerCase().includes(q)
        );
    }, [employees, searchQuery]);

    return (
        <div className="w-full h-full flex flex-col bg-white border-r border-slate-100">
            {/* Sidebar Header / Search */}
            <div className="p-4 border-b border-slate-50 sticky top-0 bg-white z-10">
                <div className="relative group">
                    <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-lg group-focus-within:text-slate-900 transition-colors">search</span>
                    <input
                        type="text"
                        placeholder="Search List..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-transparent py-3 pl-10 pr-4 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-slate-100 focus:shadow-md transition-all placeholder:text-slate-400"
                    />
                </div>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                {filteredEmployees.map(emp => {
                    const isSelected = selectedEmployee?.recordId === emp.recordId;

                    return (
                        <Tooltip key={emp.recordId} text={`View ${emp.fieldData.Name_First}'s Profile`} position="right" className="w-full">
                            <button
                                onClick={() => onSelectEmployee(emp)}
                                className={`
                                    w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-300 group
                                    ${isSelected ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-600'}
                                `}
                            >
                                <div className={`
                                    w-10 h-10 rounded-full overflow-hidden border-2 flex-shrink-0 transition-transform duration-300
                                    ${isSelected ? 'border-white/20 scale-105' : 'border-slate-100 group-hover:scale-110'}
                                `}>
                                    <img
                                        src={emp.fieldData.photo || `https://ui-avatars.com/api/?name=${emp.fieldData.Name_First}+${emp.fieldData.Name_Last}&background=7393B3&color=fff&size=200`}
                                        alt={emp.fieldData.Name_First}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                <div className="overflow-hidden">
                                    <p className={`text-sm font-black truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                        {emp.fieldData.Name_First} {emp.fieldData.Name_Last}
                                    </p>
                                    <p className={`text-[9px] font-bold uppercase tracking-wider truncate ${isSelected ? 'text-white/50' : 'text-slate-400'}`}>
                                        {emp.fieldData.Role || 'Staff Operations'}
                                    </p>
                                </div>

                                {isSelected && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
                                )}
                            </button>
                        </Tooltip>
                    );
                })}

                {filteredEmployees.length === 0 && (
                    <div className="p-8 text-center opacity-40">
                        <span className="material-icons-round text-3xl mb-2 text-slate-300">search_off</span>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No matches found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminEmployeeListSidebar;
