import React from 'react';

const AdminEmployees = ({
    employees,
    loading,
    searchQuery,
    setSearchQuery,
    selectedRoleFilter,
    setSelectedRoleFilter,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    currentPage,
    setCurrentPage,
    totalPages,
    totalRecords,
    handleRefresh,
    handleEmployeeClick,
    primaryColor
}) => {
    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto pb-24">
            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm sticky top-0 z-30">
                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                    <div className="relative group min-w-[300px]">
                        <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors">search</span>
                        <input
                            type="text"
                            placeholder="Search by name, email..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full bg-slate-50 border-2 border-transparent py-3.5 pl-12 pr-6 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-slate-100 transition-all placeholder:text-slate-400"
                        />
                    </div>

                    <select
                        value={selectedRoleFilter}
                        onChange={(e) => { setSelectedRoleFilter(e.target.value); setCurrentPage(1); }}
                        className="bg-slate-50 border-2 border-transparent py-3.5 px-6 rounded-2xl text-[10px] font-black uppercase tracking-wider text-slate-700 focus:outline-none focus:bg-white focus:border-slate-100 transition-all cursor-pointer"
                    >
                        <option value="All Roles">All Roles</option>
                        <option value="Administrator">Administrator</option>
                        <option value="Standard">Standard</option>
                        <option value="Restricted">Restricted</option>
                    </select>

                    <button
                        onClick={handleRefresh}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border-2 border-slate-50 text-slate-400 hover:text-slate-900 hover:border-slate-200 transition-all duration-300"
                    >
                        <span className={`material-icons-round ${loading ? 'animate-spin' : ''}`}>refresh</span>
                    </button>
                </div>

                <div className="flex items-center gap-4 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
                    <div className="flex items-center bg-slate-50 rounded-2xl p-1 gap-1">
                        <PaginationButton icon="chevron_left" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} />
                        <span className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Page {currentPage} of {totalPages}</span>
                        <PaginationButton icon="chevron_right" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} />
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {employees.map(emp => (
                    <button
                        key={emp.recordId}
                        onClick={() => handleEmployeeClick(emp)}
                        className="group bg-white p-7 rounded-[2.5rem] border-2 border-slate-50 shadow-sm hover:shadow-2xl hover:border-slate-200 transition-all duration-700 text-left relative overflow-hidden active:scale-[0.98] w-full"
                    >
                        <div className="flex items-start gap-6 relative z-10">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-[1.5rem] overflow-hidden border-2 border-slate-50 group-hover:border-slate-200 group-hover:scale-105 transition-all duration-700 shadow-xl group-hover:rotate-3">
                                    <img
                                        src={emp.fieldData.photo || `https://ui-avatars.com/api/?name=${emp.fieldData.Name_First}+${emp.fieldData.Name_Last}&background=7393B3&color=fff&size=200`}
                                        alt={emp.fieldData.Name_First}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className={`absolute -bottom-1 -right-1 w-6 h-6 border-4 border-white rounded-full ${emp.fieldData.Status === 'Active' ? 'bg-emerald-400' : 'bg-rose-400'} shadow-lg`}></div>
                            </div>

                            <div className="flex-1 space-y-1">
                                <h3 className="text-xl font-black text-slate-900 group-hover:translate-x-1 transition-transform duration-700">{emp.fieldData.Name_First} {emp.fieldData.Name_Last}</h3>
                                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 transition-colors duration-700 group-hover:text-slate-600">{emp.fieldData.Role || 'Staff Operations'}</p>
                                <div className="flex items-center gap-2 pt-3">
                                    <span className="material-icons-round text-slate-300 text-sm">alternate_email</span>
                                    <span className="text-[11px] font-bold text-slate-500 truncate max-w-[150px]">{emp.fieldData.Email || 'No Email'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Status Tags */}
                        <div className="mt-8 flex flex-wrap gap-2 relative z-10">
                            <RecordTag label={emp.fieldData.ID_Employee || 'No ID'} icon="badge" />
                            <RecordTag label={emp.fieldData.Main_Center || 'HQ'} icon="location_on" />
                        </div>

                        {/* Hover Overlay */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-[5rem] -mr-16 -mt-16 group-hover:mr-0 group-hover:mt-0 opacity-0 group-hover:opacity-100 transition-all duration-700 flex items-center justify-center pointer-events-none">
                            <span className="material-icons-round text-slate-900 translate-x-4 -translate-y-4">open_in_new</span>
                        </div>
                    </button>
                ))}
            </div>

            {/* Empty State */}
            {employees.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-40 animate-in fade-in zoom-in duration-700">
                    <div className="w-32 h-32 bg-slate-50 rounded-[3rem] flex items-center justify-center mb-8 border-2 border-slate-100">
                        <span className="material-icons-round text-5xl text-slate-200">person_off</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">No Staff Members Found</h3>
                    <p className="text-sm font-bold text-slate-400">Try adjusting your filters or search keywords</p>
                </div>
            )}
        </div>
    );
};

const PaginationButton = ({ icon, disabled, onClick }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${disabled ? 'opacity-20 cursor-not-allowed' : 'hover:bg-white hover:shadow-md text-slate-900'}`}
    >
        <span className="material-icons-round text-lg">{icon}</span>
    </button>
);

const RecordTag = ({ label, icon }) => (
    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100 group-hover:bg-white group-hover:border-slate-200 transition-all duration-700">
        <span className="material-icons-round text-[14px] text-slate-300 group-hover:text-slate-900 transition-colors duration-700">{icon}</span>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900 transition-colors duration-700">{label}</span>
    </div>
);

export default AdminEmployees;
