import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getRecords } from '../../api';
import Tooltip from '../../components/common/Tooltip';

const PartnersView = () => {
    const [partners, setPartners] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [sortBy, setSortBy] = useState({ field: 'Name', order: 'ascend' });
    const [selectedPartners, setSelectedPartners] = useState([]);

    const fetchPartners = useCallback(async () => {
        setIsLoading(true);
        try {
            const options = {
                limit: pageSize,
                offset: (currentPage - 1) * pageSize,
                sort: [{ fieldName: sortBy.field, sortOrder: sortBy.order }]
            };

            // Base query building
            let queryArray = [];
            
            if (searchQuery) {
                const searchFields = ['Name', 'PartnerID', 'EmailAddress', 'PhoneNumber', 'LegalForm'];
                queryArray = searchFields.map(field => {
                    const q = { [field]: `*${searchQuery}*` };
                    if (statusFilter === 'Active') q.Active = '1';
                    // Note: Inactive is handled by omit request below
                    if (roleFilter) q.PartnerRole = roleFilter === 'Customer' ? '1' : '2';
                    return q;
                });
            } else {
                const baseQuery = { PrimaryKey: '*' };
                if (statusFilter === 'Active') baseQuery.Active = '1';
                if (roleFilter) baseQuery.PartnerRole = roleFilter === 'Customer' ? '1' : '2';
                queryArray.push(baseQuery);
            }

            // If Inactive is selected, append an omit request for Active="1"
            if (statusFilter === 'Inactive') {
                queryArray.push({ Active: '1', omit: 'true' });
            }

            options.query = queryArray;

            const response = await getRecords('BusinessPartners', options);
            if (response.success) {
                setPartners(response.data);
                if (response.pagination) {
                    setTotalRecords(response.pagination.totalFound || 0);
                }
            }
        } catch (error) {
            console.error('Error fetching partners:', error);
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, pageSize, searchQuery, statusFilter, roleFilter, sortBy]);

    useEffect(() => {
        fetchPartners();
    }, [fetchPartners]);

    const handleSort = (field) => {
        setSortBy(prev => ({
            field,
            order: prev.field === field && prev.order === 'ascend' ? 'descend' : 'ascend'
        }));
        setCurrentPage(1);
    };

    const toggleSelectAll = () => {
        if (selectedPartners.length === partners.length) {
            setSelectedPartners([]);
        } else {
            setSelectedPartners(partners.map(p => p.recordId));
        }
    };

    const toggleSelect = (id) => {
        setSelectedPartners(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const getInitials = (name) => {
        return name ? name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??';
    };

    const totalPages = Math.ceil(totalRecords / pageSize);

    return (
        <div className="space-y-6 animate-fade-in pb-20 max-w-[1600px] mx-auto p-4 md:p-8 text-slate-900">
            {/* Data list starts below global header */}

            {/* Unified Control Bar (Filters, Actions & Pagination in one elevated box) */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.12)] space-y-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Left: Pagination Summary */}
                    <div className="flex items-center gap-6">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:block pl-4">
                            SHOWING
                        </span>
                        
                        <div className="flex items-center bg-slate-50/50 rounded-full border border-slate-100/50 px-6 py-2 shadow-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-900 tracking-widest">
                                    {partners.length === 0 ? '0' : `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalRecords)}`}
                                </span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mx-1">of</span>
                                <span className="text-[10px] font-black text-slate-900 tracking-widest">{totalRecords}</span>
                            </div>
                            
                            <div className="h-4 w-[1px] bg-slate-200/60 mx-5" />
                            
                            <div className="flex items-center gap-1">
                                <button
                                    disabled={currentPage === 1 || isLoading}
                                    onClick={() => setCurrentPage(prev => prev - 1)}
                                    className="w-8 h-8 rounded-full hover:bg-white flex items-center justify-center text-slate-300 hover:text-teal-600 disabled:opacity-20 transition-all active:scale-90"
                                >
                                    <span className="material-icons-round text-xl">chevron_left</span>
                                </button>
                                <button
                                    disabled={currentPage >= totalPages || isLoading || totalRecords === 0}
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                    className="w-8 h-8 rounded-full hover:bg-white flex items-center justify-center text-slate-300 hover:text-teal-600 disabled:opacity-20 transition-all active:scale-90"
                                >
                                    <span className="material-icons-round text-xl">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Middle/Right: Primary Actions consolidated here */}
                    <div className="flex items-center gap-3 ml-auto">
                        <Tooltip text="Refresh Data">
                            <button 
                                onClick={fetchPartners} 
                                disabled={isLoading} 
                                className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-teal-600 hover:bg-white hover:border-teal-100 transition-all active:scale-95 shadow-sm"
                            >
                                <span className={`material-icons-round text-xl ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
                            </button>
                        </Tooltip>
                        
                        <button className="h-10 px-6 rounded-full bg-teal-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-teal-600/20 hover:bg-teal-700 transition-all active:scale-95 flex items-center gap-2">
                            <span className="material-icons-round text-lg">person_add_alt</span>
                            New Partner
                        </button>
                        
                        <div className="h-11 px-4 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/30 flex items-center gap-2 ml-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {totalRecords || partners.length} Records
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3">
                    <div className="relative flex-1 group w-full">
                        <span className="material-icons-round absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-600 transition-colors">search</span>
                        <input
                            type="text"
                            placeholder="Search by name, ID, email, phone or legal form..." 
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full bg-slate-50/50 border border-slate-100 py-4 pl-14 pr-6 rounded-[1.5rem] text-[13px] font-bold text-slate-900 focus:ring-4 focus:ring-teal-500/5 focus:bg-white focus:border-teal-200 transition-all outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative group flex-1 md:flex-none">
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="h-[52px] pl-6 pr-12 rounded-[1.5rem] bg-slate-50/50 border border-slate-100 text-slate-600 font-bold text-[11px] uppercase tracking-wider hover:bg-white hover:border-teal-100 transition-all outline-none appearance-none cursor-pointer w-full"
                            >
                                <option value="">Any Status</option>
                                <option value="Active">Active Only</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                            <span className="material-icons-round absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">expand_more</span>
                        </div>

                        <div className="relative group flex-1 md:flex-none">
                            <select
                                value={roleFilter}
                                onChange={(e) => {
                                    setRoleFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="h-[52px] pl-6 pr-12 rounded-[1.5rem] bg-slate-50/50 border border-slate-100 text-slate-600 font-bold text-[11px] uppercase tracking-wider hover:bg-white hover:border-teal-100 transition-all outline-none appearance-none cursor-pointer w-full min-w-[140px]"
                            >
                                <option value="">Any Role</option>
                                <option value="Customer">Customer</option>
                                <option value="Supplier">Supplier/Vendor</option>
                            </select>
                            <span className="material-icons-round absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">groups</span>
                        </div>

                        <button 
                            onClick={() => {
                                setSortBy(prev => ({ ...prev, order: prev.order === 'ascend' ? 'descend' : 'ascend' }));
                            }}
                            className="h-[52px] w-[52px] rounded-[1.5rem] bg-slate-50/50 border border-slate-100 text-slate-300 hover:text-teal-600 hover:bg-white hover:border-teal-100 transition-all flex items-center justify-center shrink-0"
                        >
                            <span className="material-icons-round">sort</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/30 font-[1000]">
                                <th className="py-5 px-10 w-12">
                                    <div
                                        onClick={toggleSelectAll}
                                        className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${partners.length > 0 && selectedPartners.length === partners.length ? 'bg-teal-600 border-teal-600' : 'border-slate-200 hover:border-teal-400'}`}
                                    >
                                        {partners.length > 0 && selectedPartners.length === partners.length && <span className="material-icons-round text-white text-xs">done</span>}
                                    </div>
                                </th>
                                <th 
                                    className="py-5 px-4 text-[10px] font-[1000] text-teal-600 uppercase tracking-[0.2em] cursor-pointer hover:text-teal-800 transition-colors"
                                    onClick={() => handleSort('Name')}
                                >
                                    <div className="flex items-center gap-2">
                                        Entity Name
                                        {sortBy.field === 'Name' && (
                                            <span className="material-icons-round text-xs">{sortBy.order === 'ascend' ? 'expand_less' : 'expand_more'}</span>
                                        )}
                                    </div>
                                </th>
                                <th 
                                    className="py-5 px-4 text-[10px] font-[1000] text-teal-600 uppercase tracking-[0.2em] cursor-pointer hover:text-teal-800 transition-colors"
                                    onClick={() => handleSort('Active')}
                                >
                                    <div className="flex items-center gap-2 justify-center">
                                        Status
                                        {sortBy.field === 'Active' && (
                                            <span className="material-icons-round text-xs">{sortBy.order === 'ascend' ? 'expand_less' : 'expand_more'}</span>
                                        )}
                                    </div>
                                </th>
                                <th className="py-5 px-4 text-[10px] font-[1000] text-teal-600 uppercase tracking-[0.2em] w-[25%] min-w-[220px]">Contact Email</th>
                                <th className="py-5 px-4 text-[10px] font-[1000] text-teal-600 uppercase tracking-[0.2em]">Phone Number</th>
                                <th className="py-5 px-4 text-[10px] font-[1000] text-teal-600 uppercase tracking-[0.2em] text-center">Role</th>
                                <th className="py-5 px-10 text-[10px] font-[1000] text-teal-600 uppercase tracking-[0.2em] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-[13px] font-bold text-slate-700">
                            {isLoading ? (
                                Array(pageSize).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-4 px-10"><div className="w-5 h-5 bg-slate-100 rounded-lg"></div></td>
                                        <td className="py-4 px-4">
                                            <div className="space-y-2">
                                                <div className="w-32 h-4 bg-slate-100 rounded"></div>
                                                <div className="w-20 h-2 bg-slate-50 rounded"></div>
                                            </div>
                                        </td>
                                        <td colSpan={5} className="py-4 px-4"></td>
                                    </tr>
                                ))
                            ) : partners.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-32 text-center">
                                        <div className="flex flex-col items-center gap-6 text-slate-200">
                                            <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center">
                                                <span className="material-icons-round text-6xl">cloud_off</span>
                                            </div>
                                            <p className="font-black uppercase tracking-[0.2em] text-[11px] text-slate-400">Zero matches discovered in ecosystem</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                partners.map((p) => (
                                    <tr
                                        key={p.recordId}
                                        className={`group hover:bg-teal-50/20 transition-all cursor-pointer ${selectedPartners.includes(p.recordId) ? 'bg-teal-50/40' : ''}`}
                                    >
                                        <td className="py-3 px-10">
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleSelect(p.recordId);
                                                }}
                                                className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${selectedPartners.includes(p.recordId) ? 'bg-teal-600 border-teal-600' : 'border-slate-200 group-hover:border-teal-400'}`}
                                            >
                                                {selectedPartners.includes(p.recordId) && <span className="material-icons-round text-white text-xs">done</span>}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div>
                                                <p className="font-[1000] text-[13px] text-slate-900 tracking-tight leading-none mb-1 group-hover:text-teal-700 transition-colors uppercase">{p.fieldData.Name}</p>
                                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{p.fieldData.LegalForm || 'Business Entity'}</p>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${String(p.fieldData.Active) === "1" ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                                                <div className={`w-1 h-1 rounded-full ${String(p.fieldData.Active) === "1" ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                                {String(p.fieldData.Active) === "1" ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2 text-slate-500 group-hover:text-slate-900 transition-colors">
                                                <span className="material-icons-round text-base opacity-40">alternate_email</span>
                                                <span className="text-[11px] tabular-nums whitespace-nowrap">{p.fieldData.EmailAddress || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-600 transition-colors">
                                                <span className="material-icons-round text-base opacity-40">call</span>
                                                <span className="text-[11px] tabular-nums">{p.fieldData.PhoneNumber || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex flex-wrap gap-2 justify-center">
                                                <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-teal-50/50 text-teal-600 border border-teal-100/30 group-hover:bg-teal-500 group-hover:text-white transition-all">
                                                    {String(p.fieldData.PartnerRole) === "1" ? 'Customer' : String(p.fieldData.PartnerRole) === "2" ? 'Supplier/Vendor' : (p.fieldData.PartnerRole || 'Partner')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-10 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Tooltip text="Edit Details">
                                                    <button className="w-8 h-8 rounded-lg bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 hover:text-teal-600 hover:border-teal-200 transition-all hover:shadow-lg active:scale-90">
                                                        <span className="material-icons-round text-lg">edit</span>
                                                    </button>
                                                </Tooltip>
                                                <button className="w-8 h-8 rounded-lg bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all hover:shadow-lg active:scale-90">
                                                    <span className="material-icons-round text-lg">more_vert</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PartnersView;
