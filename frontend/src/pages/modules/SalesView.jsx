import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getRecords } from '../../api';
import Tooltip from '../../components/common/Tooltip';

const STATUS_MAP = {
    'C': 'Completed',
    'I': 'In Process',
    'X': 'Cancelled'
};

const getStatusLabel = (code) => {
    if (!code) return '';
    return STATUS_MAP[code] || (code === 'New' ? 'New' : code);
};

const MultiSelectDropdown = ({ label, options, selectedValues, onToggle, icon }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all text-[11px] font-black uppercase tracking-widest ${selectedValues.length > 0
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm'
                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                    }`}
            >
                <span className="material-icons-round text-lg">{icon}</span>
                <span>{label}</span>
                {selectedValues.length > 0 && (
                    <span className="bg-indigo-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px]">
                        {selectedValues.length}
                    </span>
                )}
                <span className={`material-icons-round text-lg transition-transform ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute top-full right-0 md:left-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] z-[70] py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        {options.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => onToggle(opt.value)}
                                className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-50 transition-colors"
                            >
                                <span className={`text-[11px] font-bold ${selectedValues.includes(opt.value) ? 'text-indigo-600' : 'text-slate-600'}`}>
                                    {opt.label}
                                </span>
                                {selectedValues.includes(opt.value) && (
                                    <span className="material-icons-round text-indigo-600 text-sm">done</span>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const SalesView = () => {
    const [sales, setSales] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        lifecycle: [],
        billing: [],
        delivery: []
    });
    const [sortBy, setSortBy] = useState({ field: 'SalesOrderID', order: 'descend' });
    const [selectedSales, setSelectedSales] = useState([]);

    const fetchSales = useCallback(async () => {
        setIsLoading(true);
        try {
            const options = {
                limit: pageSize,
                offset: (currentPage - 1) * pageSize,
                sort: [{ fieldName: sortBy.field, sortOrder: sortBy.order }]
            };

            // Base query building
            let queryArray = [];

            // Generate combinatorial queries for multi-select AND/OR behavior
            // Since we want records that match ANY of selected values in a field, 
            // but must match across fields, we need to generate multiple query objects.
            const generateBaseQueries = () => {
                let results = [{}];

                const addFieldFilter = (fieldName, values) => {
                    if (values.length === 0) return;
                    const newResults = [];
                    results.forEach(res => {
                        values.forEach(val => {
                            newResults.push({ ...res, [fieldName]: val });
                        });
                    });
                    results = newResults;
                };

                addFieldFilter('LifeCycleStatus', filters.lifecycle);
                addFieldFilter('BillingStatus', filters.billing);
                addFieldFilter('DeliveryStatus', filters.delivery);

                // If no filters, start with a broad match
                if (results.length === 1 && Object.keys(results[0]).length === 0) {
                    results = [{ PrimaryKey: '*' }];
                }

                return results;
            };

            const baseQueries = generateBaseQueries();

            if (searchQuery) {
                // For each base query (status combo), we add search criteria for OR fields
                const searchFields = ['SalesOrderID', 'PartnerName', 'PartnerID'];
                baseQueries.forEach(baseQ => {
                    searchFields.forEach(field => {
                        queryArray.push({
                            ...baseQ,
                            [field]: `*${searchQuery}*`
                        });
                    });
                });
            } else {
                queryArray = baseQueries;
            }

            options.query = queryArray;

            const response = await getRecords('SalesOrders', options);
            if (response.success) {
                setSales(response.data);
                if (response.pagination) {
                    setTotalRecords(response.pagination.totalFound || 0);
                }
            }
        } catch (error) {
            console.error('Error fetching sales:', error);
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, pageSize, searchQuery, filters, sortBy]);

    useEffect(() => {
        fetchSales();
    }, [fetchSales]);

    const handleSort = (field) => {
        setSortBy(prev => ({
            field,
            order: prev.field === field && prev.order === 'ascend' ? 'descend' : 'ascend'
        }));
        setCurrentPage(1);
    };

    const toggleSelectAll = () => {
        if (selectedSales.length === sales.length) {
            setSelectedSales([]);
        } else {
            setSelectedSales(sales.map(s => s.recordId));
        }
    };

    const toggleSelect = (id) => {
        setSelectedSales(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const formatCurrency = (amount) => {
        if (amount === undefined || amount === null || amount === '') return '';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return { date: '', time: '' };
        try {
            const date = new Date(timestamp);
            return {
                date: date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                }),
                time: date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                })
            };
        } catch (e) {
            return { date: timestamp, time: '' };
        }
    };

    const toggleFilter = (type, value) => {
        setFilters(prev => ({
            ...prev,
            [type]: prev[type].includes(value)
                ? prev[type].filter(v => v !== value)
                : [...prev[type], value]
        }));
        setCurrentPage(1);
    };

    const statusOptions = [
        { label: 'Completed', value: 'C' },
        { label: 'In Process', value: 'I' },
        { label: 'Cancelled', value: 'X' }
    ];

    const totalPages = Math.ceil(totalRecords / pageSize);

    return (
        <div className="space-y-6 animate-fade-in pb-20 max-w-[1600px] mx-auto p-4 md:p-8 text-slate-900">
            {/* Module Dashboard Header */}

            <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] border border-slate-100/50">
                <div className="p-8 space-y-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        {/* Left: Pagination Summary */}
                        <div className="flex items-center gap-6">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:block pl-4">
                                SHOWING
                            </span>

                            <div className="flex items-center bg-slate-50/50 rounded-full border border-slate-100/50 px-6 py-2 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-900 tracking-widest">
                                        {sales.length === 0 ? '0' : `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalRecords)}`}
                                    </span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mx-1">of</span>
                                    <span className="text-[10px] font-black text-slate-900 tracking-widest">{totalRecords}</span>
                                </div>

                                <div className="h-4 w-[1px] bg-slate-200/60 mx-5" />

                                <div className="flex items-center gap-1">
                                    <button
                                        disabled={currentPage === 1 || isLoading}
                                        onClick={() => setCurrentPage(prev => prev - 1)}
                                        className="w-8 h-8 rounded-full hover:bg-white flex items-center justify-center text-slate-300 hover:text-indigo-600 disabled:opacity-20 transition-all active:scale-90"
                                    >
                                        <span className="material-icons-round text-xl">chevron_left</span>
                                    </button>
                                    <button
                                        disabled={currentPage >= totalPages || isLoading || totalRecords === 0}
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                        className="w-8 h-8 rounded-full hover:bg-white flex items-center justify-center text-slate-300 hover:text-indigo-600 disabled:opacity-20 transition-all active:scale-90"
                                    >
                                        <span className="material-icons-round text-xl">chevron_right</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right: Primary Actions */}
                        <div className="flex items-center gap-3 ml-auto">
                            <Tooltip text="Refresh Data">
                                <button
                                    onClick={fetchSales}
                                    disabled={isLoading}
                                    className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white hover:border-indigo-100 transition-all active:scale-95 shadow-sm"
                                >
                                    <span className={`material-icons-round text-xl ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
                                </button>
                            </Tooltip>

                            <button className="h-10 px-6 rounded-full bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2">
                                <span className="material-icons-round text-lg">add_shopping_cart</span>
                                New Sale
                            </button>

                            <div className="h-11 px-4 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/30 flex items-center gap-2 ml-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    {totalRecords || sales.length} Orders
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-3">
                        <div className="relative flex-1 group w-full">
                            <span className="material-icons-round absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors">search</span>
                            <input
                                type="text"
                                placeholder="Search by Order ID, Partner Name, or ID..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full bg-slate-50/50 border border-slate-100 py-4 pl-14 pr-6 rounded-[1.5rem] text-[13px] font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-200 transition-all outline-none"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto pb-2 md:pb-0">
                            <MultiSelectDropdown
                                label="Lifecycle"
                                icon="sync"
                                options={statusOptions}
                                selectedValues={filters.lifecycle}
                                onToggle={(val) => toggleFilter('lifecycle', val)}
                            />
                            <MultiSelectDropdown
                                label="Billing"
                                icon="receipt_long"
                                options={statusOptions}
                                selectedValues={filters.billing}
                                onToggle={(val) => toggleFilter('billing', val)}
                            />
                            <MultiSelectDropdown
                                label="Delivery"
                                icon="local_shipping"
                                options={statusOptions}
                                selectedValues={filters.delivery}
                                onToggle={(val) => toggleFilter('delivery', val)}
                            />
                            <Tooltip text={`Sort by ${sortBy.field === 'SalesOrderID' ? 'Order ID' : sortBy.field} (${sortBy.order === 'ascend' ? 'Ascending' : 'Descending'})`}>
                                <button
                                    onClick={() => {
                                        setSortBy(prev => ({ ...prev, order: prev.order === 'ascend' ? 'descend' : 'ascend' }));
                                    }}
                                    className="h-[52px] w-[52px] rounded-[1.5rem] bg-slate-50/50 border border-slate-100 text-slate-300 hover:text-indigo-600 hover:bg-white hover:border-indigo-100 transition-all flex items-center justify-center shrink-0"
                                >
                                    <span className="material-icons-round">sort</span>
                                </button>
                            </Tooltip>
                        </div>
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
                                        className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${sales.length > 0 && selectedSales.length === sales.length ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200 hover:border-indigo-400'}`}
                                    >
                                        {sales.length > 0 && selectedSales.length === sales.length && <span className="material-icons-round text-white text-xs">done</span>}
                                    </div>
                                </th>
                                <th
                                    className="py-5 px-4 text-[10px] font-[1000] text-indigo-600 uppercase tracking-[0.2em] cursor-pointer hover:text-indigo-800 transition-colors"
                                    onClick={() => handleSort('SalesOrderID')}
                                >
                                    <div className="flex items-center gap-2">
                                        Order ID
                                        {sortBy.field === 'SalesOrderID' && (
                                            <span className="material-icons-round text-xs">{sortBy.order === 'ascend' ? 'expand_less' : 'expand_more'}</span>
                                        )}
                                    </div>
                                </th>
                                <th className="py-5 px-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Partner
                                </th>
                                <th className="py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer group/h" onClick={() => handleSort('LifeCycleStatus')}>
                                    <div className="flex items-center justify-center">
                                        <div className="w-4"></div> {/* Balance spacer */}
                                        <span className="flex-1 text-center">Lifecycle</span>
                                        <div className="w-4 flex justify-center">
                                            <span className={`material-icons-round text-sm transition-opacity ${sortBy.field === 'LifeCycleStatus' ? 'opacity-100 text-indigo-500' : 'opacity-0 group-hover/h:opacity-100'}`}>
                                                {sortBy.order === 'ascend' ? 'north' : 'south'}
                                            </span>
                                        </div>
                                    </div>
                                </th>
                                <th className="py-5 px-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Billing
                                </th>
                                <th className="py-5 px-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Delivery
                                </th>
                                <th className="py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer group/h" onClick={() => handleSort('CreationTimestamp')}>
                                    <div className="flex items-center justify-center">
                                        <div className="w-4"></div> {/* Balance spacer */}
                                        <span className="flex-1 text-center">Date</span>
                                        <div className="w-4 flex justify-center">
                                            <span className={`material-icons-round text-sm transition-opacity ${sortBy.field === 'CreationTimestamp' ? 'opacity-100 text-indigo-500' : 'opacity-0 group-hover/h:opacity-100'}`}>
                                                {sortBy.order === 'ascend' ? 'north' : 'south'}
                                            </span>
                                        </div>
                                    </div>
                                </th>
                                <th className="py-5 px-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer group/h" onClick={() => handleSort('GrossAmount')}>
                                    <div className="flex items-center justify-end gap-1">
                                        <span className={`material-icons-round text-sm transition-opacity ${sortBy.field === 'GrossAmount' ? 'opacity-100 text-indigo-500' : 'opacity-0 group-hover/h:opacity-100'}`}>
                                            {sortBy.order === 'ascend' ? 'north' : 'south'}
                                        </span>
                                        <span>Amount</span>
                                    </div>
                                </th>
                                <th className="py-5 px-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-[13px] font-bold text-slate-700">
                            {isLoading ? (
                                Array(pageSize).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-4 px-10"><div className="w-5 h-5 bg-slate-100 rounded-lg"></div></td>
                                        <td className="py-4 px-4"><div className="w-24 h-4 bg-slate-100 rounded"></div></td>
                                        <td className="py-4 px-4"><div className="w-32 h-4 bg-slate-100 rounded"></div></td>
                                        <td className="py-4 px-4 text-center"><div className="w-16 h-6 bg-slate-100 rounded-full mx-auto"></div></td>
                                        <td className="py-4 px-4 text-center"><div className="w-16 h-6 bg-slate-100 rounded-full mx-auto"></div></td>
                                        <td className="py-4 px-4 text-center"><div className="w-16 h-6 bg-slate-100 rounded-full mx-auto"></div></td>
                                        <td className="py-4 px-4 text-center"><div className="w-24 h-4 bg-slate-100 rounded mx-auto"></div></td>
                                        <td className="py-4 px-4 text-right"><div className="w-20 h-4 bg-slate-100 rounded ml-auto"></div></td>
                                        <td className="py-4 px-10 text-right"></td>
                                    </tr>
                                ))
                            ) : sales.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-32 text-center">
                                        <div className="flex flex-col items-center gap-6 text-slate-200">
                                            <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center">
                                                <span className="material-icons-round text-6xl">shopping_bag</span>
                                            </div>
                                            <p className="font-black uppercase tracking-[0.2em] text-[11px] text-slate-400">No sales orders found in this period</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                sales.map((s) => (
                                    <tr
                                        key={s.recordId}
                                        className={`group hover:bg-indigo-50/20 transition-all cursor-pointer ${selectedSales.includes(s.recordId) ? 'bg-indigo-50/40' : ''}`}
                                    >
                                        <td className="py-3 px-10">
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleSelect(s.recordId);
                                                }}
                                                className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${selectedSales.includes(s.recordId) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200 group-hover:border-indigo-400'}`}
                                            >
                                                {selectedSales.includes(s.recordId) && <span className="material-icons-round text-white text-xs">done</span>}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <p className="font-[1000] text-[13px] text-slate-900 tracking-tight tabular-nums uppercase group-hover:text-indigo-700 transition-colors">
                                                {s.fieldData.SalesOrderID}
                                            </p>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex flex-col">
                                                <Tooltip text={`Partner ID: ${s.fieldData.PartnerID || 'N/A'}`}>
                                                    <span className="text-[13px] font-[1000] text-slate-900 group-hover:text-indigo-700 transition-colors cursor-help">
                                                        {s.fieldData.PartnerName || ''}
                                                    </span>
                                                </Tooltip>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {(() => {
                                                const label = getStatusLabel(s.fieldData.LifeCycleStatus);
                                                return (
                                                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${label === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' :
                                                        label === 'In Process' ? 'bg-amber-50 text-amber-600 border border-amber-100/50' :
                                                            label === 'Cancelled' ? 'bg-rose-50 text-rose-600 border border-rose-100/50' :
                                                                'bg-indigo-50 text-indigo-600 border border-indigo-100/50'
                                                        }`}>
                                                        <div className={`w-1 h-1 rounded-full ${label === 'Completed' ? 'bg-emerald-500' :
                                                            label === 'In Process' ? 'bg-amber-500 animate-pulse' :
                                                                label === 'Cancelled' ? 'bg-rose-500' :
                                                                    'bg-indigo-500'
                                                            }`}></div>
                                                        {label}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {(() => {
                                                const label = getStatusLabel(s.fieldData.BillingStatus);
                                                return (
                                                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${label === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' :
                                                        label === 'In Process' ? 'bg-amber-50 text-amber-600 border border-amber-100/50' :
                                                            label === 'Cancelled' ? 'bg-rose-50 text-rose-600 border border-rose-100/50' :
                                                                'bg-slate-50 text-slate-400 border border-slate-100'
                                                        }`}>
                                                        {label}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {(() => {
                                                const label = getStatusLabel(s.fieldData.DeliveryStatus);
                                                return (
                                                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${label === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' :
                                                        label === 'In Process' ? 'bg-amber-50 text-amber-600 border border-amber-100/50' :
                                                            label === 'Cancelled' ? 'bg-rose-50 text-rose-600 border border-rose-100/50' :
                                                                'bg-slate-50 text-slate-400 border border-slate-100'
                                                        }`}>
                                                        {label}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {(() => {
                                                const { date, time } = formatDate(s.fieldData.CreationTimestamp);
                                                return (
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">
                                                            {date}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                            {time}
                                                        </span>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <span className="text-[13px] font-[1000] text-slate-900 tabular-nums">
                                                {formatCurrency(s.fieldData.GrossAmount)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Tooltip text="View Details">
                                                    <button className="w-8 h-8 rounded-lg bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all hover:shadow-lg active:scale-90">
                                                        <span className="material-icons-round text-lg">visibility</span>
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

export default SalesView;
