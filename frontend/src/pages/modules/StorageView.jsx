import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getRecords, adjustInventory } from '../../api';
import Tooltip from '../../components/common/Tooltip';
import { useAuth } from '../../context/AuthContext';
import { useStatus } from '../../context/StatusContext';

const StorageView = () => {
    // Basic View States
    const [viewMode, setViewMode] = useState('lookup'); // 'lookup' | 'adjustment'
    const [activeTab, setActiveTab] = useState('products'); // 'products' | 'warehouses' (for adjustment mode)
    const [inventory, setInventory] = useState([]);
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const [prodSearch, setProdSearch] = useState('');
    const [whSearch, setWhSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);

    // Adjustment State
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null); // Full object now
    const [adjustmentType, setAdjustmentType] = useState('ADD');
    const [adjustmentQty, setAdjustmentQty] = useState('');
    const [adjustmentReason, setAdjustmentReason] = useState('');
    const [currentInventory, setCurrentInventory] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const { userData, currentUser } = useAuth();
    const { showStatus } = useStatus();

    // --- FETCHING LOGIC ---

    const fetchInventory = useCallback(async () => {
        setIsLoading(true);
        try {
            const options = {
                limit: pageSize,
                offset: (currentPage - 1) * pageSize,
                sort: [{ fieldName: 'ProductName', sortOrder: 'ascend' }],
                query: searchQuery.trim() ? [
                    { ProductName: `*${searchQuery.trim()}*` },
                    { WarehouseName: `*${searchQuery.trim()}*` },
                    { ProductID: `*${searchQuery.trim()}*` }
                ] : [{ PrimaryKey: '*' }]
            };

            const response = await getRecords('Inventory', options);
            if (response.success) {
                setInventory(response.data || []);
                if (response.pagination) {
                    setTotalRecords(response.pagination.totalFound || 0);
                }
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, pageSize, searchQuery]);

    const fetchAdjustmentProducts = useCallback(async () => {
        setIsLoading(true);
        try {
            const options = {
                limit: pageSize,
                offset: (currentPage - 1) * pageSize,
                sort: [{ fieldName: 'ShortDescription', sortOrder: 'ascend' }],
                query: prodSearch.trim() ? [
                    { ShortDescription: `*${prodSearch.trim()}*` },
                    { ProductID: `*${prodSearch.trim()}*` },
                    { CategoryName: `*${prodSearch.trim()}*` }
                ] : [{ PrimaryKey: '*' }]
            };

            const response = await getRecords('Products', options);
            if (response.success) {
                setProducts(response.data || []);
                if (response.pagination) {
                    setTotalRecords(response.pagination.totalFound || 0);
                }
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, pageSize, prodSearch]);

    const fetchWarehouses = useCallback(async () => {
        setIsLoading(true);
        try {
            const options = {
                layout: 'Warehouses',
                limit: 100,
                query: whSearch.trim() ? [
                    { WarehouseCode: `*${whSearch.trim()}*` },
                    { WarehouseName: `*${whSearch.trim()}*` },
                    { CenterID: `*${whSearch.trim()}*` }
                ] : [{ PrimaryKey: '*' }]
            };

            const response = await getRecords('Warehouses', options);
            if (response.success) {
                setWarehouses(response.data || []);
                setTotalRecords(response.data.length);
            }
        } catch (error) {
            console.error('Error fetching warehouses:', error);
        } finally {
            setIsLoading(false);
        }
    }, [whSearch]);

    const checkCurrentInventory = async (prodID, whID) => {
        if (!prodID || !whID) return;
        try {
            const response = await getRecords('Inventory', {
                query: [{ ProductID: prodID, WarehouseID: whID }]
            });
            if (response.success && response.data.length > 0) {
                setCurrentInventory(response.data[0]);
            } else {
                setCurrentInventory(null);
            }
        } catch (error) {
            console.error('Error checking inventory:', error);
        }
    };

    const fetchLogs = useCallback(async (productID, warehouseCode) => {
        setIsLoadingLogs(true);
        try {
            const response = await getRecords('InventoryLogs', {
                query: [{ ProductID: `==${productID}`, WarehouseCode: `==${warehouseCode}` }],
                sort: [{ fieldName: 'CreationTimestamp', sortOrder: 'descend' }],
                limit: 50
            });
            if (response.success) {
                setLogs(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching inventory logs:', error);
        } finally {
            setIsLoadingLogs(false);
        }
    }, []);

    // --- EFFECTS ---

    useEffect(() => {
        const timer = setTimeout(() => {
            if (viewMode === 'lookup') {
                fetchInventory();
            } else if (activeTab === 'products') {
                fetchAdjustmentProducts();
            } else {
                fetchWarehouses();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [viewMode, activeTab, fetchInventory, fetchAdjustmentProducts, fetchWarehouses]);

    useEffect(() => {
        if (viewMode === 'lookup' && selectedItem) {
            const whKey = selectedItem.fieldData.WarehouseID ?? selectedItem.fieldData.WarehouseCode;
            fetchLogs(selectedItem.fieldData.ProductID, whKey);
        } else {
            setLogs([]);
        }
    }, [selectedItem, fetchLogs, viewMode]);

    useEffect(() => {
        if (selectedProduct && selectedWarehouse) {
            checkCurrentInventory(selectedProduct.fieldData.ProductID, selectedWarehouse.fieldData.WarehouseCode);
        } else {
            setCurrentInventory(null);
        }
    }, [selectedProduct, selectedWarehouse]);

    
    // --- LOGIC ---

    const previousBalance = currentInventory ? Number(currentInventory.fieldData.QuantityOnHand) : 0;
    const qtyInput = Number(adjustmentQty) || 0;
    const newBalance = adjustmentType === 'ADD' ? previousBalance + qtyInput : previousBalance - qtyInput;

    const handleSaveAdjustment = async () => {
        setIsSaving(true);
        try {
            const warehouseId = selectedWarehouse.fieldData.WarehouseID ?? selectedWarehouse.fieldData.WarehouseCode;
            const payload = {
                ProductID: selectedProduct.fieldData.ProductID,
                WarehouseID: warehouseId,
                Qty: qtyInput,
                AdjustmentType: adjustmentType,
                Reason: adjustmentReason.trim()
            };

            // Debug: see exact outbound logical JSON (pre-scramble)
            console.groupCollapsed(
                '%c Storage manual adjustment — outbound JSON (Network body is scrambled as { payload })',
                'color:#4f46e5;font-weight:bold'
            );
            console.log('POST /inventory/adjust', JSON.stringify(payload, null, 2));
            console.groupEnd();

            await adjustInventory(payload);

            showStatus({
                type: 'success',
                title: 'Inventory updated',
                message: 'Inventory updated successfully.',
                duration: 2500
            });

            // Cleanup
            setShowConfirmModal(false);
            setAdjustmentQty('');
            setAdjustmentReason('');
            setSelectedProduct(null);
            setSelectedWarehouse(null);
            setViewMode('lookup');
            fetchInventory();

        } catch (error) {
            console.error('Save Adjustment Error:', error);
            showStatus({ type: 'error', title: 'Transaction Failed', message: error.error || error.message || 'Failed to process adjustment.' });
        } finally {
            setIsSaving(false);
        }
    };

    const confirmAdjustment = () => {
        if (!selectedProduct || !selectedWarehouse || !adjustmentQty || qtyInput <= 0 || !adjustmentReason.trim()) {
            showStatus({ type: 'error', title: 'Missing Information', message: 'All fields (Product, Warehouse, Quantity, Reason) are required.' });
            return;
        }
        if (adjustmentType === 'SUBTRACT' && newBalance < 0) {
            showStatus({ type: 'error', title: 'Insufficient Stock', message: 'This adjustment would result in a negative balance.' });
            return;
        }
        setShowConfirmModal(true);
    };

    const totalPages = Math.ceil(totalRecords / pageSize);

    // --- RENDER HELPERS ---

    const renderListItem = (item) => {
        const isSelected = viewMode === 'lookup'
            ? selectedItem?.recordId === item.recordId
            : activeTab === 'products'
                ? selectedProduct?.recordId === item.recordId
                : selectedWarehouse?.recordId === item.recordId;

        return (
            <div
                key={item.recordId}
                onClick={() => {
                    if (viewMode === 'lookup') setSelectedItem(item);
                    else if (activeTab === 'products') setSelectedProduct(item);
                    else setSelectedWarehouse(item);
                }}
                className={`p-3 rounded-2xl border-2 transition-all duration-300 cursor-pointer group mb-2 last:mb-0 relative overflow-hidden backdrop-blur-sm ${isSelected
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-600/20 translate-x-1'
                    : 'bg-white/40 border-slate-100 hover:border-indigo-100 hover:bg-white/90 text-slate-600'
                    }`}
            >
                {isSelected && (
                    <div className="absolute right-[-10px] top-[-10px] w-20 h-20 bg-white/10 rounded-full blur-2xl" />
                )}

                <div className="flex flex-col gap-1.5 relative z-10">
                    <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-black uppercase tracking-tight ${isSelected ? 'text-white' : 'text-slate-700'} flex items-center flex-wrap gap-x-1`}>
                            {viewMode === 'lookup' || activeTab === 'products' ? (
                                <>
                                    <span className={isSelected ? 'text-white' : 'text-indigo-600'}>{item.fieldData.ProductID || 'PROD-???'}</span>
                                    <span className={`mx-0.5 ${isSelected ? 'text-white/40' : 'text-slate-300'}`}>•</span>
                                    <span className="truncate max-w-[150px]">{item.fieldData.ProductName || item.fieldData.ShortDescription || 'N/A'}</span>
                                    {item.fieldData.CategoryName && (
                                        <>
                                            <span className={`mx-0.5 ${isSelected ? 'text-white/40' : 'text-slate-300'}`}>•</span>
                                            <span className={`${isSelected ? 'text-white/70' : 'text-indigo-500'} italic font-bold`}>{item.fieldData.CategoryName}</span>
                                        </>
                                    )}
                                </>
                            ) : (
                                <>
                                    <span className={isSelected ? 'text-white' : 'text-emerald-500'}>{item.fieldData.WarehouseID || item.fieldData.WarehouseCode || 'WH-???'}</span>
                                    <span className={`mx-0.5 ${isSelected ? 'text-white/40' : 'text-slate-300'}`}>•</span>
                                    <span className="truncate max-w-[150px]">{item.fieldData.WarehouseName || 'N/A'}</span>
                                    {item.fieldData.CenterID && (
                                        <>
                                            <span className={`mx-0.5 ${isSelected ? 'text-white/40' : 'text-slate-300'}`}>•</span>
                                            <span className={`${isSelected ? 'text-white/70' : 'text-emerald-500'} italic font-bold`}>{item.fieldData.CenterID}</span>
                                        </>
                                    )}
                                </>
                            )}
                        </span>
                        {viewMode === 'lookup' && (
                            <div className={`px-2 py-1 rounded-lg text-[10px] font-black ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-900 border border-slate-100'}`}>
                                {item.fieldData.QuantityOnHand} PCS
                            </div>
                        )}
                    </div>

                    {viewMode === 'lookup' && (
                        <div className="flex items-center gap-1.5 mt-1 opacity-70">
                            <span className="material-icons-round text-xs">location_on</span>
                            <span className={`text-[10px] font-bold uppercase tracking-widest truncate`}>
                                {item.fieldData.WarehouseName}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 md:p-8 space-y-8 animate-fade-in max-w-[1600px] mx-auto pb-24 text-slate-900 h-full flex flex-col bg-slate-50/20">
            {/* --- HEADER --- */}
            <div className="sticky top-0 z-40 bg-white/60 backdrop-blur-3xl rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.06)] border border-white/50 p-6 transition-all duration-500 hover:shadow-[0_40px_70px_-20px_rgba(0,0,0,0.08)]">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-8">
                        {viewMode === 'lookup' && (
                            <div className="relative group w-80">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span className="material-icons-round text-slate-300 group-focus-within:text-indigo-600 transition-colors text-xl">search</span>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search Inventory..."
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    className="w-full bg-slate-50/50 border border-slate-100/50 py-3 pl-12 pr-6 rounded-[1.25rem] text-[12px] font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-200 transition-all outline-none placeholder:text-slate-300"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                setViewMode(v => v === 'lookup' ? 'adjustment' : 'lookup');
                                setSearchQuery('');
                                setProdSearch('');
                                setWhSearch('');
                                setCurrentPage(1);
                                setSelectedItem(null);
                                setSelectedProduct(null);
                                setSelectedWarehouse(null);
                            }}
                            className={`h-10 px-6 rounded-[1rem] flex items-center gap-2 transition-all active:scale-95 shadow-md group relative overflow-hidden ${viewMode === 'adjustment'
                                ? 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/10'
                                }`}
                        >
                            <span className={`material-icons-round text-lg transition-transform duration-300 ${viewMode === 'adjustment' ? 'rotate-180' : 'group-hover:rotate-90'}`}>
                                {viewMode === 'adjustment' ? 'keyboard_backspace' : 'tune'}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[0.15em] pt-0.5 whitespace-nowrap">
                                {viewMode === 'adjustment' ? 'Cancel Entry' : 'Manual Adjustment'}
                            </span>
                        </button>

                        <div className="flex gap-2">
                            <Tooltip text="Refresh List">
                                <button
                                    onClick={() => viewMode === 'lookup' ? fetchInventory() : (activeTab === 'products' ? fetchAdjustmentProducts() : fetchWarehouses())}
                                    disabled={isLoading}
                                    className="w-10 h-10 rounded-[1rem] bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 shadow-sm transition-all active:scale-90"
                                >
                                    <span className={`material-icons-round text-xl ${isLoading ? 'animate-spin' : ''}`}>sync</span>
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
                {/* Left Pane: Selection Hub */}
                <div className="lg:w-2/5 flex flex-col min-h-0 bg-white/50 backdrop-blur-md rounded-[3rem] border border-white/50 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.03)] overflow-hidden">
                    {/* Adjustment Tabs */}
                    {viewMode === 'adjustment' && (
                        <div className="flex flex-col border-b border-slate-100">
                            <div className="p-4 bg-slate-50/50 flex gap-2">
                                <button
                                    onClick={() => { setActiveTab('products'); setCurrentPage(1); }}
                                    className={`flex-1 h-10 rounded-[0.75rem] flex items-center justify-center gap-2 transition-all ${activeTab === 'products' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white text-slate-500 hover:bg-slate-100'
                                        }`}
                                >
                                    <span className="material-icons-round text-lg">inventory_2</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Products</span>
                                </button>
                                <button
                                    onClick={() => { setActiveTab('warehouses'); setCurrentPage(1); }}
                                    className={`flex-1 h-10 rounded-[0.75rem] flex items-center justify-center gap-2 transition-all ${activeTab === 'warehouses' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white text-slate-505 hover:bg-slate-100'
                                        }`}
                                >
                                    <span className="material-icons-round text-lg">warehouse</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Warehouses</span>
                                </button>
                            </div>

                            {/* Tab Specific Search and Refresh */}
                            <div className="px-4 pb-4 flex gap-2 animate-in fade-in slide-in-from-top-1">
                                <div className="relative flex-1">
                                    <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                        <span className="material-icons-round text-slate-300 text-sm">search</span>
                                    </span>
                                    <input
                                        type="text"
                                        placeholder={`Search ${activeTab === 'products' ? 'Products' : 'Warehouses'}...`}
                                        value={activeTab === 'products' ? prodSearch : whSearch}
                                        onChange={(e) => {
                                            if (activeTab === 'products') setProdSearch(e.target.value);
                                            else setWhSearch(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full bg-white border border-slate-100 py-2 pl-9 pr-4 rounded-[0.75rem] text-[10px] font-bold text-slate-900 focus:border-indigo-200 outline-none transition-all placeholder:text-slate-300"
                                    />
                                </div>
                                <button
                                    onClick={() => activeTab === 'products' ? fetchAdjustmentProducts() : fetchWarehouses()}
                                    disabled={isLoading}
                                    className="w-9 h-9 rounded-[0.75rem] bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all shrink-0 shadow-sm"
                                >
                                    <span className={`material-icons-round text-base ${isLoading ? 'animate-spin' : ''}`}>sync</span>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-6 bg-indigo-500 rounded-full" />
                            <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">
                                {viewMode === 'lookup' ? 'Inventory Levels' : (activeTab === 'products' ? 'Select Product' : 'Select Warehouse')}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                disabled={currentPage === 1 || isLoading}
                                onClick={() => setCurrentPage(prev => prev - 1)}
                                className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:bg-white border border-slate-100/50 transition-all disabled:opacity-20"
                            >
                                <span className="material-icons-round text-lg">west</span>
                            </button>
                            <span className="text-[10px] font-black text-slate-900 tabular-nums">{currentPage} <span className="text-slate-300 mx-1">/</span> {totalPages || 1}</span>
                            <button
                                disabled={currentPage >= totalPages || isLoading || totalRecords === 0}
                                onClick={() => setCurrentPage(prev => prev + 1)}
                                className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:bg-white border border-slate-100/50 transition-all disabled:opacity-20"
                            >
                                <span className="material-icons-round text-lg">east</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
                        {isLoading ? (
                            <div className="space-y-4">
                                {Array(6).fill(0).map((_, i) => (
                                    <div key={i} className="h-20 bg-slate-100/50 rounded-[2rem] animate-pulse" />
                                ))}
                            </div>
                        ) : (viewMode === 'lookup' ? inventory : (activeTab === 'products' ? products : warehouses)).length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center py-20 animate-fade-in">
                                <div className="w-24 h-24 rounded-[3rem] bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center mb-6">
                                    <span className="material-icons-round text-slate-200 text-5xl">manage_search</span>
                                </div>
                                <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">No entries found</h3>
                                <p className="text-[10px] font-bold text-slate-200 mt-2">Refine your search parameters</p>
                            </div>
                        ) : (
                            (viewMode === 'lookup' ? inventory : (activeTab === 'products' ? products : warehouses)).map(renderListItem)
                        )}
                    </div>
                </div>

                {/* Right Pane: Intel/Form Pane */}
                <div className="lg:w-3/5 flex flex-col min-h-0 bg-white/80 backdrop-blur-md rounded-[3rem] border border-white/50 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] overflow-hidden relative">
                    {viewMode === 'lookup' ? (
                        selectedItem ? (
                            <div className="flex flex-col h-full animate-fade-in">
                                <div className="p-8 border-b border-slate-50 bg-slate-50/10 backdrop-blur-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 rounded-[2rem] bg-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-600/30">
                                                <span className="material-icons-round text-3xl">insights</span>
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-black tracking-tighter text-slate-800">{selectedItem.fieldData.ProductName || selectedItem.fieldData.ShortDescription}</h2>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedItem.fieldData.ProductID}</span>
                                                    <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{selectedItem.fieldData.WarehouseName}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Available On Hand</p>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-4xl font-black text-indigo-600 tabular-nums">{selectedItem.fieldData.QuantityOnHand}</span>
                                                <span className="text-[10px] font-black text-slate-300 uppercase">units</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                                    <div className="flex items-center gap-4 mb-8">
                                        <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.25em]">Transaction History</span>
                                        <div className="flex-1 h-px bg-slate-100" />
                                    </div>

                                    {isLoadingLogs ? (
                                        <div className="space-y-6">
                                            {Array(5).fill(0).map((_, i) => (
                                                <div key={i} className="h-28 bg-slate-100/50 rounded-[2rem] animate-pulse" />
                                            ))}
                                        </div>
                                    ) : logs.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center py-20">
                                            <div className="w-20 h-20 rounded-[2.5rem] bg-slate-50 flex items-center justify-center text-slate-200 mb-6 border border-slate-100">
                                                <span className="material-icons-round text-4xl">upcoming</span>
                                            </div>
                                            <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em] text-center">No logs recorded</h3>
                                            <p className="text-[10px] font-bold text-slate-200 mt-2 text-center max-w-[200px]">Stock levels have remained constant since creation.</p>
                                        </div>
                                    ) : (
                                        <div className="relative pl-12 space-y-8">
                                            <div className="absolute left-6 top-1 bottom-1 w-px bg-slate-100 border-l border-dashed border-slate-200" />
                                            {logs.map((log) => (
                                                <div key={log.recordId} className="relative group transition-all duration-300 hover:-translate-y-1">
                                                    {/* Timeline Point */}
                                                    <div className={`absolute left-[-24px] top-6 w-12 h-12 rounded-[1.5rem] flex items-center justify-center shadow-xl z-10 transition-transform group-hover:scale-110 ${log.fieldData.Quantity > 0 ? 'bg-emerald-500 text-white shadow-emerald-500/20' :
                                                        log.fieldData.Quantity < 0 ? 'bg-rose-500 text-white shadow-rose-500/20' :
                                                            'bg-slate-900 text-white shadow-slate-900/20'
                                                        }`}>
                                                        <span className="material-icons-round text-xl">
                                                            {log.fieldData.Quantity > 0 ? 'south_east' :
                                                                log.fieldData.Quantity < 0 ? 'north_west' :
                                                                    'sync'}
                                                        </span>
                                                    </div>

                                                    <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.03)] group-hover:shadow-2xl group-hover:shadow-indigo-500/5 transition-all">
                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                                            <div>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-[12px] font-black text-slate-800 uppercase tracking-tight">{log.fieldData.AdjustmentType}</span>
                                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase ${log.fieldData.Quantity > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                                                        }`}>
                                                                        {log.fieldData.Quantity > 0 ? '+' : ''}{log.fieldData.Quantity} Units
                                                                    </span>
                                                                </div>
                                                                <p className="text-[10px] font-bold text-slate-300 mt-1 uppercase tracking-widest">{log.fieldData.CreationTimestamp}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-[8px] font-black text-slate-300 uppercase mb-1">Impact</p>
                                                                <p className="text-base font-black text-indigo-600 tabular-nums">
                                                                    {log.fieldData.PreviousBalance} <span className="material-icons-round text-slate-300 text-xs mx-1">east</span> {log.fieldData.NewBalance}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 pt-5 border-t border-slate-50">
                                                            <div>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><span className="material-icons-round text-[14px]">confirmation_number</span> Reason</p>
                                                                <p className="text-[11px] font-bold text-slate-700 leading-tight italic">{log.fieldData.ReferenceType || 'Manual entry'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><span className="material-icons-round text-[14px]">person</span> Operator</p>
                                                                <p className="text-[11px] font-bold text-slate-700 truncate">{log.fieldData.PerformedByUser}</p>
                                                            </div>
                                                            <div className="hidden lg:block">
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><span className="material-icons-round text-[14px]">label</span> Category</p>
                                                                <p className="text-[11px] font-bold text-slate-700">{log.fieldData.AdjustmentType?.split(' ')[1] || 'Internal'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-20 text-center">
                                <div className="w-40 h-40 relative flex items-center justify-center mb-10">
                                    <div className="absolute inset-0 bg-indigo-500/5 rounded-full animate-ping duration-[3000ms]" />
                                    <div className="w-32 h-32 rounded-[4rem] bg-indigo-50 border-4 border-white flex items-center justify-center shadow-xl">
                                        <span className="material-icons-round text-indigo-300 text-6xl">inventory</span>
                                    </div>
                                </div>
                                <h3 className="text-lg font-black text-slate-800 tracking-tighter uppercase mb-4">Awaiting Selection</h3>
                                <p className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.4em] leading-loose max-w-[320px]">
                                    Pick an inventory node from the hub to explore detailed logistics metrics and historical flows.
                                </p>
                            </div>
                        )
                    ) : (
                        /* --- ADJUSTMENT FORM --- */
                        <div className="flex flex-col h-full bg-slate-50/20 backdrop-blur-3xl animate-fade-in animate-slide-up">
                            <div className="px-8 pt-4 pb-4 border-b border-slate-100 bg-white flex items-start sm:items-center justify-between gap-4 rounded-t-[2.75rem]">
                                <div className="flex items-start gap-3 min-w-0 pr-2">
                                    
                                    <div className="min-w-0 pt-0.5">
                                        <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase leading-tight">
                                            Smart Adjust
                                        </h3>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={confirmAdjustment}
                                        disabled={!adjustmentQty || !adjustmentReason.trim()}
                                        className={`px-6 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-[0.15em] transition-all shadow-lg ${!adjustmentQty || !adjustmentReason.trim()
                                                ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none border border-slate-200'
                                                : 'bg-indigo-600 text-white hover:bg-slate-900 shadow-indigo-600/20 active:scale-95 border border-indigo-500 ring-4 ring-indigo-500/10'
                                            }`}
                                    >
                                        Commit Calibration
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                                {!selectedProduct || !selectedWarehouse ? (
                                    <div className="grid grid-cols-2 gap-6 h-full">
                                        <div className={`rounded-3xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center transition-all duration-500 scale-95 opacity-50 ${selectedProduct ? 'bg-indigo-50 border-indigo-200 opacity-100 scale-100' : 'bg-slate-50 border-slate-200'}`}>
                                            <span className={`material-icons-round text-3xl mb-3 ${selectedProduct ? 'text-indigo-400' : 'text-slate-200'}`}>
                                                {selectedProduct ? 'check_circle' : 'inventory_2'}
                                            </span>
                                            <h4 className="text-[9px] font-black uppercase tracking-widest">{selectedProduct ? 'Product Selected' : 'Select Product'}</h4>
                                        </div>
                                        <div className={`rounded-3xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center transition-all duration-500 scale-95 opacity-50 ${selectedWarehouse ? 'bg-emerald-50 border-emerald-200 opacity-100 scale-100' : 'bg-slate-50 border-slate-200'}`}>
                                            <span className={`material-icons-round text-3xl mb-3 ${selectedWarehouse ? 'text-emerald-400' : 'text-slate-200'}`}>
                                                {selectedWarehouse ? 'check_circle' : 'warehouse'}
                                            </span>
                                            <h4 className="text-[9px] font-black uppercase tracking-widest">{selectedWarehouse ? 'Warehouse Selected' : 'Select Warehouse'}</h4>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col h-full animate-fade-in relative z-10 px-1 pt-1 pb-1">
                                        <div className="space-y-4 shrink-0">
                                            {/* Section: Selected Nodes */}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-1 pl-1">
                                                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Selected Nodes</h4>
                                                </div>
                                                <div className="flex gap-6">
                                                    {/* Product Info Card */}
                                                    <div className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-6 relative overflow-hidden group hover:border-indigo-200 transition-all shadow-sm hover:shadow-xl hover:shadow-indigo-500/5">
                                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
                                                        <div className="w-16 h-16 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-110 transition-transform">
                                                            <span className="material-icons-round text-3xl">inventory_2</span>
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Selected Asset</span>
                                                            <p className="text-[13px] font-black text-slate-900 truncate tracking-tight">{selectedProduct.fieldData.ShortDescription}</p>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{selectedProduct.fieldData.ProductID}</p>
                                                        </div>
                                                    </div>

                                                    {/* Warehouse Info Card */}
                                                    <div className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-6 relative overflow-hidden group hover:border-emerald-200 transition-all shadow-sm hover:shadow-xl hover:shadow-emerald-500/5">
                                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                                                        <div className="w-16 h-16 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-110 transition-transform">
                                                            <span className="material-icons-round text-3xl">warehouse</span>
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Storage Node</span>
                                                            <p className="text-[13px] font-black text-slate-900 truncate tracking-tight">{selectedWarehouse.fieldData.CenterID}</p>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{selectedWarehouse.fieldData.WarehouseCode}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Adjustment Parameters */}
                                            <div className="space-y-3 pt-2">
                                                <div className="flex items-center gap-2 mb-1 pl-1">
                                                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Adjustment Parameters</h4>
                                                </div>
                                                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-2xl shadow-slate-200/50 relative overflow-hidden space-y-4">
                                                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                                                    
                                                    {/* Line 1: Flow Type & Quantity */}
                                                    <div className="flex items-end gap-6 relative z-10">
                                                        <div className="w-64 space-y-3">
                                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Flow Type</label>
                                                            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 h-10">
                                                                <button 
                                                                    onClick={() => setAdjustmentType('ADD')}
                                                                    className={`flex-1 flex items-center justify-center gap-3 rounded-lg transition-all ${adjustmentType === 'ADD' ? 'bg-white text-emerald-600 shadow-md border border-slate-100 ring-4 ring-emerald-500/5' : 'text-slate-400 hover:text-slate-600'}`}
                                                                >
                                                                    <span className="material-icons-round text-xl">add_circle</span>
                                                                    <span className="text-[11px] font-black uppercase tracking-widest">Inflow</span>
                                                                </button>
                                                                <button 
                                                                    onClick={() => setAdjustmentType('SUBTRACT')}
                                                                    className={`flex-1 flex items-center justify-center gap-3 rounded-lg transition-all ${adjustmentType === 'SUBTRACT' ? 'bg-white text-rose-600 shadow-md border border-slate-100 ring-4 ring-rose-500/5' : 'text-slate-400 hover:text-slate-600'}`}
                                                                >
                                                                    <span className="material-icons-round text-xl">remove_circle</span>
                                                                    <span className="text-[11px] font-black uppercase tracking-widest">Outflow</span>
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="w-40 space-y-3">
                                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Quantity</label>
                                                            <input
                                                                type="text"
                                                                placeholder="0"
                                                                value={adjustmentQty}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                                                    setAdjustmentQty(val);
                                                                }}
                                                                className="w-full h-10 bg-slate-50 border border-slate-200 px-6 rounded-xl text-[13px] font-black text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 shadow-sm focus:shadow-indigo-500/10"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Line 2: Reason */}
                                                    <div className="space-y-3 relative z-10 pt-2 border-t border-slate-50">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Adjustment Reason <span className="text-rose-500">*</span></label>
                                                        <input
                                                            type="text"
                                                            placeholder="Provide a detailed reason for this inventory adjustment..."
                                                            value={adjustmentReason}
                                                            onChange={(e) => setAdjustmentReason(e.target.value)}
                                                            className="w-full h-10 bg-slate-50 border border-slate-200 px-6 rounded-xl text-[13px] font-bold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 shadow-sm focus:shadow-indigo-500/10"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Dynamic Spacer to anchor summary to bottom */}
                                        <div className="flex-1 min-h-[1rem]" />

                                        {/* Spacious Summary Block - Elevated White Design */}
                                        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-2xl shadow-slate-200/60 relative overflow-hidden group shrink-0">
                                            <div className="flex flex-col gap-4 relative z-10">
                                                {/* Line 1: Balance Comparison */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-6">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Current Balance</span>
                                                            <p className="text-2xl font-black text-slate-800 tabular-nums">
                                                                {previousBalance} <span className="text-xs text-slate-300 ml-1 uppercase">PCS</span>
                                                            </p>
                                                        </div>
                                                        
                                                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner">
                                                            <span className="material-icons-round text-slate-300">east</span>
                                                        </div>
    
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2">Projected Shift</span>
                                                            <p className={`text-2xl font-black tabular-nums transition-colors ${newBalance < 0 ? 'text-rose-500' : 'text-indigo-600'}`}>
                                                                {newBalance} <span className="text-xs opacity-40 ml-1 uppercase">PCS</span>
                                                            </p>
                                                        </div>
                                                    </div>
    
                                                    <div className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 backdrop-blur-sm">
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1">{userData?.Role || 'Authorized Operator'}</span>
                                                            <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">{userData ? `${userData.Name_First} ${userData.Name_Last}` : 'System'}</span>
                                                        </div>
                                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-200/60 shrink-0">
                                                            <span className="material-icons-round text-lg">verified_user</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* --- LOCAL CONFIRMATION MODAL --- */}
                            {showConfirmModal && (
                                <div className="absolute inset-0 z-[100] flex items-center justify-center p-8 active:scale-100 transition-all">
                                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-fade-in" onClick={() => setShowConfirmModal(false)} />
                                    <div className="bg-white rounded-[3.5rem] w-full max-w-lg overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] animate-popup relative z-10 border border-white">
                                        <div className="p-10 space-y-8">
                                            <div className="flex items-center gap-6">
                                                <div className="w-20 h-20 rounded-[2.5rem] bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-lg">
                                                    <span className="material-icons-round text-3xl">priority_high</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-tight">Verification<br />Required</h3>
                                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">Validate stock calibration sequence</p>
                                                </div>
                                            </div>

                                            <div className="bg-slate-50 rounded-[2.5rem] p-8 space-y-6">
                                                <div className="grid grid-cols-2 gap-8">
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Movement</p>
                                                        <p className={`text-sm font-black uppercase ${adjustmentType === 'ADD' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                            {adjustmentType === 'ADD' ? 'Increase (+)' : 'Decrease (-)'}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Magnitude</p>
                                                        <p className="text-lg font-black text-slate-900 tabular-nums">{adjustmentQty} units</p>
                                                    </div>
                                                </div>

                                                <div className="pt-6 border-t border-slate-200">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Reference Reason</p>
                                                    <p className="text-sm font-bold text-slate-700 italic leading-snug">"{adjustmentReason}"</p>
                                                </div>

                                                <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Balance</p>
                                                        <p className="text-2xl font-black text-indigo-600 tabular-nums">{newBalance}</p>
                                                    </div>
                                                    <div className="w-12 h-12 rounded-[1.25rem] bg-indigo-100/50 flex items-center justify-center">
                                                        <span className="material-icons-round text-indigo-600">calculate</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-4">
                                                <button
                                                    disabled={isSaving}
                                                    onClick={() => setShowConfirmModal(false)}
                                                    className="flex-1 h-16 rounded-[1.75rem] border border-slate-200 text-slate-400 text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                                                >
                                                    Revise
                                                </button>
                                                <button
                                                    disabled={isSaving}
                                                    onClick={handleSaveAdjustment}
                                                    className="flex-[1.5] h-16 rounded-[1.75rem] bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/30 hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95"
                                                >
                                                    {isSaving ? (
                                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                    ) : (
                                                        <>
                                                            <span className="material-icons-round text-lg">check_circle</span>
                                                            <span>Confirm Commit</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
                .animate-popup { animation: popup 0.4s cubic-bezier(0.165, 0.84, 0.44, 1) forwards; }
                .animate-slide-up { animation: slideUp 0.8s cubic-bezier(0.165, 0.84, 0.44, 1) forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes popup { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
        </div>
    );
};

export default StorageView;
