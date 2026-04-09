import React from 'react';
import Tooltip from '../common/Tooltip';

const AdminEmployees = ({
    employees,
    isLoading,
    handleEmployeeClick,
    primaryColor,
    onRefresh,
    pagination,
    filters
}) => {
    const { currentPage, pageSize, totalRecords, setCurrentPage, setPageSize } = pagination;
    const { searchQuery, setSearchQuery, roleFilter, setRoleFilter, sortBy, setSortBy } = filters;

    const totalPages = Math.ceil(totalRecords / pageSize);

    // Roles for filter (normally would come from database)
    const roles = ['Administrator', 'Manager', 'Sales', 'Developer', 'Support'];

    const renderSkeletons = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {[...Array(pageSize)].map((_, i) => (
                <div key={i} className="bg-white p-7 rounded-[2.5rem] border-2 border-slate-50 shadow-sm animate-pulse">
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-slate-100"></div>
                        <div className="flex-1 space-y-3">
                            <div className="h-6 w-3/4 bg-slate-100 rounded-lg"></div>
                            <div className="h-3 w-1/2 bg-slate-100 rounded-lg"></div>
                            <div className="pt-4 space-y-2">
                                <div className="h-3 w-full bg-slate-50 rounded-lg"></div>
                                <div className="h-3 w-2/3 bg-slate-50 rounded-lg"></div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Unified Control Bar */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                <div className="flex flex-col xl:flex-row items-center justify-between gap-6">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] whitespace-nowrap">Staff Directory Engine</p>

                        {/* Pagination Status & Controls in Header */}
                        <div className="flex items-center gap-4 bg-slate-50 px-5 py-2 rounded-2xl border border-slate-100">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                <span className="text-slate-900">{(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalRecords)}</span> of <span className="text-slate-900">{totalRecords}</span>
                            </div>
                            <div className="w-px h-4 bg-slate-200"></div>
                            <div className="flex items-center gap-1">
                                <Tooltip text="Previous Page">
                                    <button
                                        disabled={currentPage === 1 || isLoading}
                                        onClick={() => setCurrentPage(prev => prev - 1)}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-900 disabled:opacity-20 transition-all font-black"
                                    >
                                        <span className="material-icons-round text-lg">chevron_left</span>
                                    </button>
                                </Tooltip>
                                <Tooltip text="Next Page">
                                    <button
                                        disabled={currentPage === totalPages || isLoading}
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-900 disabled:opacity-20 transition-all font-black"
                                    >
                                        <span className="material-icons-round text-lg">chevron_right</span>
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <div className="bg-slate-50 px-4 py-2 rounded-full text-[10px] font-black text-slate-500 border border-slate-100 uppercase tracking-widest">
                            {totalRecords} Records Synchronized
                        </div>
                        <Tooltip text="Force Cloud Sync">
                            <button
                                onClick={onRefresh}
                                disabled={isLoading}
                                className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all active:scale-90 group relative"
                            >
                                <span className={`material-icons-round text-xl ${isLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`}>refresh</span>
                            </button>
                        </Tooltip>
                    </div>
                </div>

                {/* Filter Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-50">
                    {/* Search Input */}
                    <div className="relative group">
                        <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-lg group-focus-within:text-slate-900 transition-colors">search</span>
                        <input
                            type="text"
                            placeholder="Universal Search..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full bg-slate-50 border border-transparent py-4 pl-12 pr-4 rounded-2xl text-[13px] font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-slate-100 focus:shadow-xl transition-all"
                        />
                    </div>

                    {/* Role Filter */}
                    <div className="relative">
                        <select
                            value={roleFilter}
                            onChange={(e) => {
                                setRoleFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full bg-slate-50 border border-transparent py-4 px-6 rounded-2xl text-[13px] font-bold text-slate-900 appearance-none focus:outline-none focus:bg-white focus:border-slate-100 focus:shadow-xl transition-all"
                        >
                            <option value="">All Specializations</option>
                            {roles.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <span className="material-icons-round absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">filter_list</span>
                    </div>

                    {/* Sort Selector */}
                    <div className="relative">
                        <select
                            value={`${sortBy.field}-${sortBy.order}`}
                            onChange={(e) => {
                                const [field, order] = e.target.value.split('-');
                                setSortBy({ field, order });
                            }}
                            className="w-full bg-slate-50 border border-transparent py-4 px-6 rounded-2xl text-[13px] font-bold text-slate-900 appearance-none focus:outline-none focus:bg-white focus:border-slate-100 focus:shadow-xl transition-all"
                        >
                            <option value="Name_Last-ascend">Sort: Surname (A-Z)</option>
                            <option value="Name_Last-descend">Sort: Surname (Z-A)</option>
                            <option value="Role-ascend">Sort: Department</option>
                            <option value="CreationTimestamp-descend">Sort: Recently Enlisted</option>
                        </select>
                        <span className="material-icons-round absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">sort</span>
                    </div>

                    {/* Page Size Selector */}
                    <div className="relative">
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="w-full bg-slate-50 border border-transparent py-4 px-6 rounded-2xl text-[13px] font-bold text-slate-900 appearance-none focus:outline-none focus:bg-white focus:border-slate-100 focus:shadow-xl transition-all"
                        >
                            <option value="12">Display 12 Per Page</option>
                            <option value="24">Display 24 Per Page</option>
                            <option value="48">Display 48 Per Page</option>
                        </select>
                        <span className="material-icons-round absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">layers</span>
                    </div>
                </div>
            </div>

            {isLoading ? renderSkeletons() : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {employees.map(emp => (
                        <Tooltip key={emp.recordId} text={`View Profile: ${emp.fieldData.Name_First} ${emp.fieldData.Name_Last}`} className="w-full">
                            <button
                                onClick={() => handleEmployeeClick(emp)}
                                className="group bg-white p-7 rounded-[2.5rem] border-2 border-slate-50 shadow-sm hover:shadow-2xl hover:border-slate-200 transition-all duration-700 text-left relative overflow-hidden active:scale-[0.98] w-full"
                            >
                                <div className="flex items-center gap-6 relative z-10">
                                    <div className="relative">
                                        <div className="w-24 h-24 overflow-hidden shadow-xl border-4 border-white transition-all duration-700 group-hover:scale-105 rounded-full">
                                            <img
                                                src={emp.fieldData.photo || `https://ui-avatars.com/api/?name=${emp.fieldData.Name_First}+${emp.fieldData.Name_Last}&background=7393B3&color=fff&size=200`}
                                                alt={emp.fieldData.Name_First}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="absolute inset-[-6px] pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-700 -z-10 rounded-full"
                                            style={{
                                                backgroundColor: primaryColor,
                                                padding: '2px'
                                            }}>
                                            <div className="w-full h-full bg-white rounded-full"></div>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-xl font-black text-slate-900 tracking-tighter leading-none mb-1 group-hover:translate-x-1 transition-transform">{emp.fieldData.Name_First} {emp.fieldData.Name_Last}</h4>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{emp.fieldData.Role || 'Staff Operations'}</p>

                                        <div className="mt-4 flex flex-col gap-2">
                                            <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <span className="material-icons-round text-sm" style={{ color: primaryColor }}>alternate_email</span>
                                                <span className="text-[11px] font-bold text-slate-500 truncate">{emp.fieldData.EmailAddress}</span>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <span className="material-icons-round text-sm" style={{ color: primaryColor }}>call</span>
                                                <span className="text-[11px] font-bold text-slate-500">{emp.fieldData.PhoneNumber || 'System Verified'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity -translate-y-12 translate-x-12 rounded-full"
                                    style={{ backgroundColor: primaryColor }}></div>
                            </button>
                        </Tooltip>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminEmployees;
