import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getRecords } from '../../api';
import Tooltip from '../../components/common/Tooltip';
import ProductDetail from '../../components/products/ProductDetail';
import { useAuth } from '../../context/AuthContext';

// Helper for currency formatting
const formatCurrency = (amount, currency = 'USD') => {
    if (amount === undefined || amount === null || amount === '') return '';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    }).format(amount);
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

const ProductView = () => {
    // State management
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        categories: []
    });
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [sortBy, setSortBy] = useState({ field: 'ProductID', order: 'ascend' });
    const [selectedProducts, setSelectedProducts] = useState([]);

    const [viewMode, setViewMode] = useState('list');
    const [activeProduct, setActiveProduct] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    
    const { userData } = useAuth();
    const canEdit = userData?.Role === 'Administrator' || userData?.Role === 'Manager';

    // Fetch products
    const fetchProducts = useCallback(async () => {
        setIsLoading(true);
        try {
            const options = {
                limit: pageSize,
                offset: (currentPage - 1) * pageSize,
                sort: [{ fieldName: sortBy.field, sortOrder: sortBy.order }]
            };

            // Combinatorial query generation for AND/OR behavior
            let queryArray = [];

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

                addFieldFilter('CategoryName', filters.categories);

                if (results.length === 1 && Object.keys(results[0]).length === 0) {
                    results = [{ PrimaryKey: '*' }];
                }

                return results;
            };

            const baseQueries = generateBaseQueries();

            if (searchQuery.trim()) {
                const searchFields = ['ProductID', 'ShortDescription'];
                baseQueries.forEach(baseQ => {
                    searchFields.forEach(field => {
                        queryArray.push({
                            ...baseQ,
                            [field]: `*${searchQuery.trim()}*`
                        });
                    });
                });
            } else {
                queryArray = baseQueries;
            }

            options.query = queryArray;

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
    }, [currentPage, pageSize, searchQuery, filters, sortBy]);

    // Fetch active categories for filter
    const fetchCategories = useCallback(async () => {
        try {
            let allFetchedCategories = [];
            let offset = 0;
            let hasMore = true;

            while (hasMore) {
                const response = await getRecords('ProductCategories', {
                    query: [{ Active: "==1" }],
                    limit: 100,
                    offset: offset
                });

                if (response.success && response.data) {
                    const batch = response.data.map(cat => ({
                        label: cat.fieldData.ShortDescription || cat.fieldData.CategoryName,
                        value: cat.fieldData.ShortDescription || cat.fieldData.CategoryName
                    }));
                    allFetchedCategories = [...allFetchedCategories, ...batch];

                    if (response.pagination && response.pagination.totalFound > allFetchedCategories.length) {
                        offset += 100;
                    } else {
                        hasMore = false;
                    }
                } else {
                    hasMore = false;
                }
            }
            
            // Remove duplicates if any and sort alphabetically
            const uniqueCategories = Array.from(new Set(allFetchedCategories.map(c => c.value)))
                .map(val => allFetchedCategories.find(c => c.value === val))
                .sort((a, b) => a.label.localeCompare(b.label));
            
            setCategoryOptions(uniqueCategories);
            return uniqueCategories;
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
    }, []);

    const handleRefresh = async () => {
        setIsLoading(true);
        await fetchCategories();
        await fetchProducts();
    };

    useEffect(() => {
        const init = async () => {
            await fetchCategories();
            // The first fetchProducts will be triggered by the second useEffect due to dependency change or just manual call
            // But we have the debounce effect below. Let's just make sure categories are there.
        };
        init();
    }, [fetchCategories]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProducts();
        }, 300); // Debounce search
        return () => clearTimeout(timer);
    }, [fetchProducts]);

    // Handlers
    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
    };

    const handleSort = (field) => {
        setSortBy(prev => ({
            field,
            order: prev.field === field && prev.order === 'ascend' ? 'descend' : 'ascend'
        }));
        setCurrentPage(1);
    };

    const toggleSelectAll = () => {
        if (selectedProducts.length === products.length && products.length > 0) {
            setSelectedProducts([]);
        } else {
            setSelectedProducts(products.map(p => p.recordId));
        }
    };

    const toggleSelect = (id) => {
        setSelectedProducts(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
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


    const totalPages = Math.ceil(totalRecords / pageSize);

    if (viewMode === 'detail' && activeProduct) {
        return (
            <div className="p-6 md:p-8 space-y-8 animate-fade-in max-w-[1600px] mx-auto pb-20">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => { setViewMode('list'); setActiveProduct(null); setIsEditing(false); }}
                        className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors rounded-xl hover:bg-slate-50"
                    >
                        <span className="material-icons-round text-sm">arrow_back</span>
                        Back to Products
                    </button>
                </div>
                <ProductDetail
                    product={activeProduct}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                    primaryColor="#8b5cf6"
                    canEdit={canEdit}
                    onUpdate={(updatedProd) => {
                        setActiveProduct(updatedProd);
                        setProducts(prev => prev.map(p => p.recordId === updatedProd.recordId ? updatedProd : p));
                    }}
                    isLoading={false}
                />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 space-y-8 animate-fade-in max-w-[1600px] mx-auto pb-20 text-slate-900">
            {/* Header Control Bar */}
            <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] border border-slate-100/50">
                <div className="p-8 space-y-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        {/* Left: Summary and Pagination Controls */}
                        <div className="flex items-center gap-6">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:block pl-4">
                                SHOWING
                            </span>

                            <div className="flex items-center bg-slate-50/50 rounded-full border border-slate-100/50 px-6 py-2 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-900 tracking-widest">
                                        {products.length === 0 ? '0' : `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalRecords)}`}
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

                        {/* Right: Actions */}
                        <div className="flex items-center gap-3">
                            <Tooltip text="Refresh Data">
                                <button
                                    onClick={handleRefresh}
                                    disabled={isLoading}
                                    className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white hover:border-indigo-100 transition-all active:scale-95 shadow-sm"
                                >
                                    <span className={`material-icons-round text-xl ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
                                </button>
                            </Tooltip>

                            <button className="h-10 px-6 rounded-full bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2">
                                <span className="material-icons-round text-lg">add_circle</span>
                                New Product
                            </button>

                            <div className="h-11 px-4 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/30 flex items-center gap-2 ml-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    {totalRecords} Products
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Search and Filters */}
                    <div className="flex flex-col md:flex-row items-center gap-3">
                        <div className="relative flex-1 group w-full">
                            <span className="material-icons-round absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors">search</span>
                            <input
                                type="text"
                                placeholder="Search by Product ID or Name..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                                className="w-full bg-slate-50/50 border border-slate-100 py-4 pl-14 pr-6 rounded-[1.5rem] text-[13px] font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-200 transition-all outline-none"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            <MultiSelectDropdown
                                label="Category"
                                icon="category"
                                options={categoryOptions}
                                selectedValues={filters.categories}
                                onToggle={(val) => toggleFilter('categories', val)}
                            />
                            <Tooltip text={`Sort by ${sortBy.field === 'ProductID' ? 'Product ID' : sortBy.field} (${sortBy.order === 'ascend' ? 'Asc' : 'Desc'})`}>
                                <button
                                    onClick={() => {
                                        setSortBy(prev => ({ ...prev, order: prev.order === 'ascend' ? 'descend' : 'ascend' }));
                                    }}
                                    className="h-[52px] w-[52px] rounded-[1.5rem] bg-slate-50/50 border border-slate-100 text-slate-300 hover:text-indigo-600 hover:bg-white hover:border-indigo-100 transition-all flex items-center justify-center shrink-0 shadow-sm"
                                >
                                    <span className="material-icons-round">sort</span>
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Table Container */}
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/30">
                                <th className="py-6 px-10 w-12">
                                    <div
                                        onClick={toggleSelectAll}
                                        className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${products.length > 0 && selectedProducts.length === products.length ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200 hover:border-indigo-400'}`}
                                    >
                                        {products.length > 0 && selectedProducts.length === products.length && <span className="material-icons-round text-white text-xs">done</span>}
                                    </div>
                                </th>
                                <th
                                    className="py-6 px-4 text-[10px] font-[1000] text-indigo-600 uppercase tracking-[0.2em] cursor-pointer hover:text-indigo-800 transition-colors"
                                    onClick={() => handleSort('ProductID')}
                                >
                                    <div className="flex items-center gap-2">
                                        Product ID
                                        {sortBy.field === 'ProductID' && (
                                            <span className="material-icons-round text-xs">{sortBy.order === 'ascend' ? 'expand_less' : 'expand_more'}</span>
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors"
                                    onClick={() => handleSort('ShortDescription')}
                                >
                                    <div className="flex items-center gap-2">
                                        Name
                                        {sortBy.field === 'ShortDescription' && (
                                            <span className="material-icons-round text-xs">{sortBy.order === 'ascend' ? 'expand_less' : 'expand_more'}</span>
                                        )}
                                    </div>
                                </th>
                                <th className="py-6 px-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Category
                                </th>
                                <th className="py-6 px-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Supplier
                                </th>
                                <th className="py-6 px-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Type
                                </th>
                                <th className="py-6 px-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Weight
                                </th>
                                <th
                                    className="py-6 px-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer group/h"
                                    onClick={() => handleSort('SellingPrice')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        <span className={`material-icons-round text-sm transition-opacity ${sortBy.field === 'SellingPrice' ? 'opacity-100 text-indigo-500' : 'opacity-0 group-hover/h:opacity-100'}`}>
                                            {sortBy.order === 'ascend' ? 'north' : 'south'}
                                        </span>
                                        <span>Price</span>
                                    </div>
                                </th>
                                <th className="py-6 px-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-[13px] font-bold text-slate-700">
                            {isLoading ? (
                                Array(pageSize).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-5 px-10"><div className="w-5 h-5 bg-slate-100 rounded-lg"></div></td>
                                        <td className="py-5 px-4"><div className="w-24 h-4 bg-slate-100 rounded"></div></td>
                                        <td className="py-5 px-4"><div className="w-48 h-4 bg-slate-100 rounded"></div></td>
                                        <td className="py-5 px-4 text-center"><div className="w-20 h-6 bg-slate-100 rounded-full mx-auto"></div></td>
                                        <td className="py-5 px-4 text-center"><div className="w-20 h-6 bg-slate-100 rounded-full mx-auto"></div></td>
                                        <td className="py-5 px-4 text-center"><div className="w-16 h-4 bg-slate-100 rounded mx-auto"></div></td>
                                        <td className="py-5 px-4 text-right"><div className="w-24 h-4 bg-slate-100 rounded ml-auto"></div></td>
                                        <td className="py-5 px-4 text-center"></td>
                                    </tr>
                                ))
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-32 text-center">
                                        <div className="flex flex-col items-center gap-6 text-slate-200">
                                            <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center">
                                                <span className="material-icons-round text-6xl">inventory_2</span>
                                            </div>
                                            <p className="font-black uppercase tracking-[0.2em] text-[11px] text-slate-400">No products found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                products.map((product) => {
                                    const fields = product.fieldData;
                                    const isSelected = selectedProducts.includes(product.recordId);

                                    return (
                                        <tr
                                            key={product.recordId}
                                            className={`group hover:bg-indigo-50/20 transition-all cursor-pointer ${isSelected ? 'bg-indigo-50/40' : ''}`}
                                            onClick={() => toggleSelect(product.recordId)}
                                        >
                                            <td className="py-3 px-10">
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleSelect(product.recordId);
                                                    }}
                                                    className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200 group-hover:border-indigo-400'}`}
                                                >
                                                    {isSelected && <span className="material-icons-round text-white text-xs">done</span>}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 font-black text-[13px] text-slate-900 tabular-nums uppercase group-hover:text-indigo-700 transition-colors">
                                                {fields.ProductID || '—'}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 group-hover:text-indigo-700 transition-colors">
                                                        {fields.ShortDescription || '—'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                    {fields.CategoryName || 'Misc'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">
                                                    {fields.SupplierName || '—'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="px-4 py-1.5 bg-slate-50 text-slate-500 border border-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                    {fields.ProductType || '—'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center text-[13px] text-slate-500 font-bold uppercase tracking-tight">
                                                {fields.WeightUnit ? `${fields.WeightUnit} ${fields.WeightMeasure || 'KG'}` : '—'}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <span className="text-[15px] font-[1000] text-slate-900 tracking-tighter tabular-nums">
                                                    {formatCurrency(fields.SellingPrice, fields.Currency)}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Tooltip text="View Details">
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveProduct(product);
                                                                setViewMode('detail');
                                                            }}
                                                            className="w-8 h-8 rounded-lg bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all hover:shadow-lg active:scale-90"
                                                        >
                                                            <span className="material-icons-round text-lg">visibility</span>
                                                        </button>
                                                    </Tooltip>
                                                    <button className="w-8 h-8 rounded-lg bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all hover:shadow-lg active:scale-90">
                                                        <span className="material-icons-round text-lg">more_vert</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProductView;
