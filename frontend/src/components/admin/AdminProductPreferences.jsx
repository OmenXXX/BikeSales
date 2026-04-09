import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getRecords, createRecord, updateRecord, deleteRecord } from '../../api';
import { useStatus } from '../../context/StatusContext';

const AdminProductPreferences = () => {
    const { showStatus, showConfirm } = useStatus();
    const primaryColor = '#7c94b1'; // Professional bluish slate

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('categories');
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
    const [isSaving, setIsSaving] = useState(false);
    
    // Search and Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('Active'); // Default to Active

    const [newData, setNewData] = useState({
        ProductCategoryID: '',
        ShortDescription: '',
        Active: true
    });
    
    const [editData, setEditData] = useState({
        ProductCategoryID: '',
        ShortDescription: '',
        Active: true,
        recordId: null
    });

    const tabs = [
        { id: 'categories', label: 'Product Categories', icon: 'settings_suggest' },
        { id: 'types', label: 'Product Types', icon: 'inventory_2', disabled: true },
        { id: 'attributes', label: 'Attributes', icon: 'settings_input_component', disabled: true }
    ];

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getRecords('ProductCategories', { 
                query: [{ PrimaryKey: '*' }] 
            });
            if (response && response.data) {
                setCategories(response.data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            showStatus({ message: 'Failed to load categories', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [showStatus]);

    const filteredCategories = useMemo(() => {
        let filtered = [...categories];

        // Status Filter
        if (statusFilter !== 'All') {
            const targetStatus = statusFilter === 'Active';
            filtered = filtered.filter(cat => {
                // Handle FileMaker '1'/'0' string or boolean
                const isActive = String(cat.fieldData.Active) === '1' || cat.fieldData.Active === true || cat.fieldData.Active === 1;
                return targetStatus === isActive;
            });
        }

        // Search Query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(cat => {
                const idMatch = cat.fieldData.ProductCategoryID?.toLowerCase().includes(query);
                const descMatch = cat.fieldData.ShortDescription?.toLowerCase().includes(query);
                return idMatch || descMatch;
            });
        }

        return filtered;
    }, [categories, searchQuery, statusFilter]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleEdit = (cat) => {
        setEditData({
            ProductCategoryID: cat.fieldData.ProductCategoryID,
            ShortDescription: cat.fieldData.ShortDescription,
            Active: cat.fieldData.Active,
            recordId: cat.recordId
        });
        setModalMode('edit');
        setShowModal(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Option 2: mapping 1 to Active and "" (empty) to inactive
            const activeValue = editData.Active === true || String(editData.Active) === '1' ? 1 : "";

            // ProductCategoryID is editable, but DIFFERENT from the internal record ID (the true Primary Key).
            // We use the recordId for the update and include the editable ProductCategoryID in the payload.
            const response = await updateRecord('ProductCategories', editData.recordId, {
                ProductCategoryID: editData.ProductCategoryID,
                ShortDescription: editData.ShortDescription,
                Active: activeValue
            });
            
            if (response) {
                setShowModal(false);
                showStatus({ message: 'Category updated successfully', type: 'success' });
                fetchCategories();
            }
        } catch (error) {
            const errorMessage = error?.error || 'Failed to update category';
            showStatus({ 
                title: 'Update Error',
                message: errorMessage, 
                type: 'error' 
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (recordId) => {
        const confirmed = await showConfirm({
            title: 'Delete Category',
            message: 'Are you sure you want to delete this category? This action cannot be undone.'
        });
        if (!confirmed) return;
        
        try {
            await deleteRecord('ProductCategories', recordId);
            showStatus({ message: 'The product category has been successfully deleted.', type: 'success' });
            fetchCategories();
        } catch {
            showStatus({ message: 'Failed to delete category.', type: 'error' });
        }
    };

    const handleCreate = async () => {
        if (!newData.ProductCategoryID || !newData.ShortDescription) {
            showStatus({ message: 'Please fill in all required fields', type: 'warning' });
            return;
        }

        setIsSaving(true);
        try {
            // Option 2: mapping 1 to Active and "" (empty) to inactive
            const activeValue = newData.Active === true || String(newData.Active) === '1' ? 1 : "";

            const response = await createRecord('ProductCategories', {
                ProductCategoryID: newData.ProductCategoryID,
                ShortDescription: newData.ShortDescription,
                Active: activeValue
            });

            if (response) {
                setShowModal(false);
                showStatus({ message: 'Category created successfully', type: 'success' });
                setNewData({ ProductCategoryID: '', ShortDescription: '', Active: true });
                fetchCategories();
            }
        } catch (error) {
            const errorMessage = error?.error || 'Failed to create category';
            showStatus({ 
                title: 'Creation Error',
                message: errorMessage, 
                type: 'error' 
            });
        } finally {
            setIsSaving(false);
        }
    };

    const renderSkeletons = () => {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {[...Array(12)].map((_, i) => (
                    <div 
                        key={i}
                        className="bg-white rounded-2xl border border-slate-50 py-3.5 px-5 shadow-sm min-h-[64px] flex flex-col justify-center gap-2"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full skeleton"></div>
                            <div className="h-3 w-12 rounded skeleton"></div>
                        </div>
                        <div className="h-2 w-20 rounded skeleton opacity-50"></div>
                    </div>
                ))}
            </div>
        );
    };

    const renderCategoryGrid = () => {
        if (filteredCategories.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                    <span className="material-icons-round text-4xl mb-2 text-slate-300 animate-pulse">search_off</span>
                    <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mt-2">No categories found matching your criteria</p>
                    <button 
                        onClick={() => { setSearchQuery(''); setStatusFilter('All'); }}
                        className="mt-4 text-[10px] font-black text-slate-900 border-b border-slate-900 hover:opacity-60 transition-all uppercase tracking-widest"
                    >
                        Reset Filters
                    </button>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {filteredCategories.map((cat) => (
                    <div 
                        key={cat.recordId}
                        className="group bg-white rounded-2xl border border-slate-100 py-3.5 px-5 shadow-sm hover:shadow-lg hover:border-slate-200 transition-all duration-300 relative flex flex-col justify-center min-h-[64px]"
                    >
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between h-5">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${String(cat.fieldData?.Active) === '1' || cat.fieldData?.Active === true ? 'bg-emerald-500' : 'bg-slate-300 shadow-inner'}`}></div>
                                    <span className="text-[12px] font-black tracking-tight text-slate-900 leading-none">{cat.fieldData?.ProductCategoryID}</span>
                                </div>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleEdit(cat); }}
                                        className="w-7 h-7 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-all flex items-center justify-center"
                                        title="Edit"
                                    >
                                        <span className="material-icons-round text-[16px]">edit</span>
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(cat.recordId); }}
                                        className="w-7 h-7 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center"
                                        title="Delete"
                                    >
                                        <span className="material-icons-round text-[16px]">delete</span>
                                    </button>
                                </div>
                            </div>
                            
                            <p className="text-[10px] font-bold text-slate-400 truncate pr-6 leading-none">
                                {cat.fieldData?.ShortDescription || 'No description'}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="p-0 space-y-0 animate-fade-in bg-white h-full flex flex-col overflow-hidden">
            {/* Header with Tabs */}
            <div className="pt-10 bg-slate-50/30">
                <div className="flex flex-col gap-0 relative">
                    {/* Folder-Style Tab Bar */}
                    <div className="border-b border-slate-200">
                        <div className="px-6 md:px-10">
                            <div className="flex items-end gap-1">
                                <div className="flex items-end flex-grow">
                                    {tabs.map(tab => {
                                        const isActive = activeTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                disabled={tab.disabled}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`
                                                    flex items-center gap-2 px-6 py-2.5 rounded-t-2xl text-[10px] font-black uppercase tracking-widest transition-all relative top-[1px]
                                                    ${isActive 
                                                        ? 'bg-white text-slate-900 border-x border-t border-slate-200 border-b-white z-10 font-black' 
                                                        : 'text-slate-400 hover:text-slate-600 bg-slate-50/50 border-transparent disabled:opacity-30'
                                                    }
                                                `}
                                            >
                                                <span className={`material-icons-round text-base ${isActive ? 'text-slate-900' : 'text-slate-300'}`}>
                                                    {tab.icon}
                                                </span>
                                                {tab.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Consolidated Controls Row */}
                    <div className="px-6 md:px-10">
                        <div className="py-3 bg-white border-b border-slate-100 flex items-center gap-4">
                            <div className="flex-1 max-w-sm relative">
                                <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-base">search</span>
                                <input 
                                    type="text"
                                    placeholder="Search preferences..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-medium text-slate-900 focus:ring-0 focus:border-slate-300"
                                />
                            </div>

                            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                                {['All', 'Active', 'Inactive'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setStatusFilter(status)}
                                        className={`px-4 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                            status === statusFilter ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>

                            <div className="ml-auto flex items-center gap-2">
                                <button 
                                    onClick={fetchCategories}
                                    disabled={loading}
                                    className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-white hover:border-slate-200 border border-slate-100 transition-all flex items-center justify-center shadow-sm"
                                    title="Refresh List"
                                >
                                    <span className={`material-icons-round text-lg ${loading ? 'animate-spin' : ''}`}>refresh</span>
                                </button>

                                <button 
                                    onClick={() => { setModalMode('add'); setShowModal(true); }}
                                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-1.5 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-sm"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <span className="material-icons-round text-sm">add</span>
                                    New Category
                                </button>

                                <div className="flex items-center gap-1 border-l border-slate-200 pl-4">
                                    <button className="w-7 h-7 rounded-lg bg-slate-50 text-slate-400 hover:text-slate-900 transition-all flex items-center justify-center">
                                        <span className="material-icons-round text-sm">chevron_left</span>
                                    </button>
                                    <span className="text-[10px] font-black text-slate-900 w-8 text-center">1 / 1</span>
                                    <button className="w-7 h-7 rounded-lg bg-slate-50 text-slate-400 hover:text-slate-900 transition-all flex items-center justify-center">
                                        <span className="material-icons-round text-sm">chevron_right</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 pb-32 custom-scrollbar">
                {loading ? (
                    <div className="animate-fade-in">
                        {renderSkeletons()}
                    </div>
                ) : (
                    <div className="animate-fade-in-up">
                        {activeTab === 'categories' && renderCategoryGrid()}
                    </div>
                )}
            </div>

            {/* Modal Overlay */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                    <div 
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setShowModal(false)}
                    ></div>
                    <div className="relative bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="px-8 pt-8 pb-4">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                    {modalMode === 'add' ? 'New Category' : 'Edit Category'}
                                </h3>
                                <button 
                                    onClick={() => setShowModal(false)}
                                    className="w-8 h-8 rounded-full hover:bg-slate-50 text-slate-300 hover:text-slate-900 transition-all flex items-center justify-center"
                                >
                                    <span className="material-icons-round text-lg">close</span>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category ID</label>
                                    <input 
                                        type="text"
                                        placeholder="EX: RO, BX..."
                                        value={modalMode === 'add' ? newData.ProductCategoryID : editData.ProductCategoryID}
                                        onChange={(e) => {
                                            const val = e.target.value.toUpperCase();
                                            modalMode === 'add' 
                                                ? setNewData({...newData, ProductCategoryID: val})
                                                : setEditData({...editData, ProductCategoryID: val});
                                        }}
                                        className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-slate-200 outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                                    <input 
                                        type="text"
                                        placeholder="Enter description..."
                                        value={modalMode === 'add' ? newData.ShortDescription : editData.ShortDescription}
                                        onChange={(e) => {
                                            modalMode === 'add'
                                                ? setNewData({...newData, ShortDescription: e.target.value})
                                                : setEditData({...editData, ShortDescription: e.target.value});
                                        }}
                                        className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-slate-200 outline-none transition-all"
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-900 tracking-tight">Active Status</span>
                                        <span className="text-[9px] font-medium text-slate-400">Toggle category visibility</span>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            modalMode === 'add'
                                                ? setNewData({...newData, Active: !newData.Active})
                                                : setEditData({...editData, Active: !editData.Active});
                                        }}
                                        className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${
                                            (modalMode === 'add' ? newData.Active : editData.Active) ? 'bg-emerald-500' : 'bg-slate-200'
                                        }`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 transform ${(modalMode === 'add' ? newData.Active : editData.Active) ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex gap-3">
                            <button 
                                onClick={() => setShowModal(false)}
                                className="flex-1 py-3 bg-white text-slate-400 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:text-slate-900 transition-all border border-slate-100"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={modalMode === 'add' ? handleCreate : handleSave}
                                disabled={isSaving}
                                className="flex-[2] py-3 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-slate-200 hover:translate-y-[-1px] transition-all disabled:opacity-50"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {isSaving ? 'Saving...' : (modalMode === 'add' ? 'Provision Category' : 'Update Category')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminProductPreferences;
