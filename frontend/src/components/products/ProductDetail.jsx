import React, { useState, useEffect } from 'react';
import Tooltip from '../common/Tooltip';
import { updateRecord } from '../../api';
import { useStatus } from '../../context/StatusContext';

const CustomDropdown = ({ value, label, options, onChange, placeholder, tooltip, isEditing, primaryColor, isLoadingOptions = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isUpward, setIsUpward] = useState(false);
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

    // Reset search term when opening/closing and detect space
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
        } else if (dropdownRef.current) {
            const rect = dropdownRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            // If less than 280px below, open upward
            setIsUpward(spaceBelow < 280);
        }
    }, [isOpen]);

    const selectedOption = options.find(opt => opt.value === value) || options.find(opt => opt.label === value);

    const filteredOptions = options.filter(opt => 
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opt.value && String(opt.value).toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const displayValue = isLoadingOptions ? 'Loading...' : (selectedOption ? selectedOption.label : (value || placeholder));
    const isPlaceholder = !value && !selectedOption;

    const content = (
        <>
            <span className={`uppercase tracking-widest w-[calc(100%-20px)] truncate ${isPlaceholder || isLoadingOptions ? 'text-slate-400' : 'text-slate-900'}`}>
                {displayValue}
            </span>
            <span
                className={`material-icons-round text-sm transition-all duration-300 ${isOpen ? 'rotate-180' : ''} ${!isEditing ? 'opacity-0' : 'text-slate-300'}`}
                style={{ color: (isOpen && isEditing) ? primaryColor : '' }}
            >
                expand_more
            </span>
        </>
    );

    return (
        <div className="flex flex-col gap-1.5 w-full">
            {(label || placeholder) && (
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">
                    {label || placeholder}
                </label>
            )}
            <div className="relative w-full" ref={dropdownRef}>
                {isEditing ? (
                    <>
                        <Tooltip text={tooltip || `Select ${placeholder}`} fullWidth>
                            <div
                                onClick={() => !isLoadingOptions && setIsOpen(!isOpen)}
                                className={`w-full h-11 px-4 rounded-xl text-[10px] font-black transition-all flex items-center justify-between bg-slate-50 border border-slate-200 hover:bg-white hover:border-slate-300 shadow-sm group relative ${isLoadingOptions ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}
                                style={{
                                    borderColor: isOpen ? primaryColor : '',
                                    backgroundColor: isOpen ? '#fff' : ''
                                }}
                            >
                                {content}
                            </div>
                        </Tooltip>
                        
                        {isOpen && (!isLoadingOptions) && (
                            <div className={`
                                absolute z-[100] w-full bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200
                                ${isUpward 
                                    ? 'bottom-full mb-2 origin-bottom slide-in-from-bottom-2' 
                                    : 'top-full mt-2 origin-top slide-in-from-top-2'}
                            `}>
                                {/* Search input inside dropdown */}
                                <div className="p-2 border-b border-slate-50">
                                    <div className="relative flex items-center">
                                        <span className="material-icons-round absolute left-3 text-slate-300 text-sm">search</span>
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search..."
                                            className="w-full bg-slate-50 border-none rounded-lg py-2 pl-9 pr-3 text-[10px] font-bold text-slate-900 focus:ring-0 outline-none placeholder-slate-300 uppercase tracking-widest"
                                            autoFocus
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </div>

                                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                    {filteredOptions.length === 0 ? (
                                        <div className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            No options found
                                        </div>
                                    ) : (
                                        filteredOptions.map((opt) => (
                                            <div
                                                key={opt.value}
                                                onClick={() => {
                                                    onChange(opt.value, opt);
                                                    setIsOpen(false);
                                                }}
                                                className={`
                                                    px-4 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors
                                                    ${value === opt.value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}
                                                `}
                                            >
                                                {opt.label}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <Tooltip text={tooltip || `View ${placeholder}`} fullWidth>
                        <div className="w-full h-11 px-4 rounded-xl text-[10px] font-black transition-all flex items-center justify-between bg-white border border-slate-100 cursor-help relative shadow-sm">
                            {content}
                        </div>
                    </Tooltip>
                )}
            </div>
        </div>
    );
};

const DetailField = ({ label, field, value, onChange, isEditing, primaryColor, placeholder, tooltip, type = "text" }) => {
    return (
        <div className="flex flex-col gap-1.5 w-full">
            {(label || placeholder) && (
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">
                    {label || placeholder}
                </label>
            )}
            <Tooltip text={tooltip || placeholder} fullWidth>
                <div 
                    className={`w-full relative ${type === 'textarea' ? 'min-h-[80px] py-3' : 'h-11'} px-4 rounded-xl text-[10px] font-black transition-all flex items-center justify-between border shadow-sm ${isEditing ? 'bg-slate-50 cursor-text border-slate-200 hover:bg-white hover:border-slate-300' : 'bg-white cursor-help border-slate-100'}`}
                >
                    <div className="flex flex-col justify-center h-full w-full">
                        {isEditing ? (
                            type === 'textarea' ? (
                                <textarea
                                    value={value || ''}
                                    onChange={(e) => onChange(field, e.target.value)}
                                    placeholder={placeholder}
                                    className="w-full bg-transparent outline-none placeholder-slate-300 text-slate-800 resize-none custom-scrollbar uppercase tracking-widest leading-snug"
                                    rows="3"
                                    onFocus={(e) => {
                                        e.target.parentElement.parentElement.style.borderColor = primaryColor;
                                        e.target.parentElement.parentElement.style.backgroundColor = '#fff';
                                    }}
                                    onBlur={(e) => {
                                        e.target.parentElement.parentElement.style.borderColor = '';
                                        e.target.parentElement.parentElement.style.backgroundColor = '';
                                    }}
                                />
                            ) : (
                                <input
                                    type={type}
                                    value={value || ''}
                                    onChange={(e) => onChange(field, e.target.value)}
                                    placeholder={placeholder}
                                    className="w-full bg-transparent outline-none placeholder-slate-300 text-slate-800 uppercase tracking-widest"
                                    onFocus={(e) => {
                                        e.target.parentElement.parentElement.style.borderColor = primaryColor;
                                        e.target.parentElement.parentElement.style.backgroundColor = '#fff';
                                    }}
                                    onBlur={(e) => {
                                        e.target.parentElement.parentElement.style.borderColor = '';
                                        e.target.parentElement.parentElement.style.backgroundColor = '';
                                    }}
                                />
                            )
                        ) : (
                            <span className={`w-full truncate uppercase tracking-widest ${!value ? 'text-slate-300' : 'text-slate-800'} ${type === 'textarea' ? 'whitespace-pre-wrap leading-relaxed' : 'leading-snug'}`}>
                                {value || placeholder || '—'}
                            </span>
                        )}
                    </div>
                </div>
            </Tooltip>
        </div>
    );
};

const ProductDetail = ({
    product,
    isEditing,
    setIsEditing,
    primaryColor,
    canEdit,
    onUpdate,
    isLoading
}) => {
    const { showStatus } = useStatus();
    const data = product.fieldData;
    const recordId = product.recordId;

    const [formData, setFormData] = useState({ ...data });
    const [saving, setSaving] = useState(false);
    
    // Dynamic Dropdown states
    const [supplierOptions, setSupplierOptions] = useState([]);
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [isLoadingOptions, setIsLoadingOptions] = useState(false);

    useEffect(() => {
        setFormData({ ...product.fieldData });
    }, [product]);

    // Fetch dynamic options (Suppliers and Categories)
    useEffect(() => {
        const fetchOptions = async () => {
            if (!isEditing) return; // Only fetch if editing
            
            setIsLoadingOptions(true);
            try {
                const { getRecords } = await import('../../api');
                
                // Helper for exhaustive fetching
                const fetchAllRecords = async (layout, query) => {
                    let allData = [];
                    let offset = 0;
                    const limit = 100;
                    let hasMore = true;
                    
                    while (hasMore) {
                        const res = await getRecords(layout, { query, limit, offset });
                        if (res.success && res.data) {
                            allData = [...allData, ...res.data];
                            const pagination = res.pagination || {};
                            if (allData.length >= (pagination.totalFound || 0)) {
                                hasMore = false;
                            } else {
                                offset += limit;
                            }
                        } else {
                            hasMore = false;
                        }
                    }
                    return allData;
                };

                // Fetch Suppliers (PartnerRole === '1', Active === '1')
                const supplierRecords = await fetchAllRecords('BusinessPartners', [{ PartnerRole: "==1", Active: "==1" }]);
                const sortedSuppliers = supplierRecords
                    .map(record => ({
                        label: record.fieldData.Name || record.fieldData.EntityName,
                        value: record.fieldData.Name || record.fieldData.EntityName,
                        id: record.fieldData.PartnerID
                    }))
                    .sort((a, b) => a.label.localeCompare(b.label));
                setSupplierOptions(sortedSuppliers);
                
                // Fetch Categories (Active === '1')
                const categoryRecords = await fetchAllRecords('ProductCategories', [{ Active: "==1" }]);
                const sortedCategories = categoryRecords
                    .map(record => ({
                        label: record.fieldData.ShortDescription || record.fieldData.CategoryName,
                        value: record.fieldData.ShortDescription || record.fieldData.CategoryName,
                        id: record.fieldData.ProductCategoryID
                    }))
                    .sort((a, b) => a.label.localeCompare(b.label));
                setCategoryOptions(sortedCategories);

            } catch (error) {
                console.error("Error fetching dynamic dropdown options:", error);
            } finally {
                setIsLoadingOptions(false);
            }
        };

        fetchOptions();
    }, [isEditing]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async () => {
        if (!formData.ProductID) {
            showStatus({ type: 'error', title: 'Missing Info', message: 'Product ID is required.' });
            return;
        }

        setSaving(true);
        try {
            const {
                PrimaryKey,
                CreationTimestamp,
                ModificationTimestamp,
                CreatedBy,
                ModifiedBy,
                ...sanitizedData
            } = formData;

            const updateData = { ...sanitizedData };

            const result = await updateRecord('Products', recordId, updateData);

            if (result.success) {
                const updatedRecord = {
                    ...product,
                    fieldData: {
                        ...product.fieldData,
                        ...updateData
                    }
                };

                if (onUpdate) onUpdate(updatedRecord);

                setIsEditing(false);
                showStatus({
                    type: 'success',
                    title: 'Product Saved',
                    message: `Product ${formData.ProductID} has been updated successfully.`
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
        setIsEditing(false);
    };

    const btnStyles = {
        edit: "bg-violet-50 border-violet-100 text-violet-600 hover:bg-violet-600 hover:text-white",
        save: "bg-emerald-50 border-emerald-500/20 text-emerald-600 hover:bg-emerald-600 hover:text-white",
        cancel: "bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white",
        locked: "bg-slate-50 border-slate-100 text-slate-400 opacity-60 cursor-not-allowed"
    };

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto space-y-4 animate-pulse pb-10">
                <div className="h-16 bg-white rounded-[2rem] border border-slate-100 shadow-sm px-6 flex items-center justify-between">
                    <div className="h-4 w-48 bg-slate-100 rounded"></div>
                    <div className="h-8 w-64 bg-slate-50 rounded-xl"></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
                        <div className="space-y-3 pt-6">
                            <div className="h-4 w-full bg-slate-50 rounded"></div>
                            <div className="h-4 w-2/3 bg-slate-50 rounded"></div>
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
                        <div className="h-4 w-1/2 bg-slate-100 rounded mb-8"></div>
                        <div className="space-y-4 pt-4">
                            <div className="h-12 bg-slate-50 rounded-xl"></div>
                            <div className="h-12 bg-slate-50 rounded-xl"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Optional dropdowns (if using defaults alongside dynamic ones)
    // Product Type user requested to be a free-form text field instead of a dropdown.
    // So we don't need productTypeOptions.
    
    // We already fetch category and supplier options dynamically and store in state variables.
    // So we don't need hardcoded categoryOptions and supplierOptions.

    return (
        <div className="relative">
            <div className="max-w-7xl mx-auto space-y-4 animate-slide-up pb-10">
                {/* Header / Action Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-2.5 px-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-black text-slate-900 tracking-tighter leading-none flex items-center">
                                {data.ProductID}
                            </h2>
                            <span className="text-slate-200 font-light select-none">|</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mt-0.5">{data.ShortDescription || 'Unknown Product'}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <div className="flex items-center gap-2">
                            {canEdit ? (
                                !isEditing ? (
                                    <Tooltip text="Unlock record for editing">
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className={`flex items-center justify-center px-5 py-2.5 rounded-xl border font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 w-28 ${btnStyles.edit}`}
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
                                <Tooltip text="Administrative privileges required to modify this record.">
                                    <div className={`flex items-center gap-3 px-5 py-2.5 rounded-xl border ${btnStyles.locked}`}>
                                        <span className="material-icons-round text-sm">lock</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Locked</span>
                                    </div>
                                </Tooltip>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Left Column: Descriptive Data */}
                    <div className="space-y-4 flex flex-col h-full">
                        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative h-full flex flex-col">
                            <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <span className="w-1 h-3 rounded-full" style={{ backgroundColor: primaryColor }}></span>
                                Core Details
                            </p>

                            <div className="space-y-4 flex-1">
                                <DetailField label="Product ID" field="ProductID" value={formData.ProductID} onChange={handleInputChange} isEditing={false} primaryColor={primaryColor} placeholder="P-0001" tooltip="Identifier" />
                                <DetailField label="Short Name" field="ShortDescription" value={formData.ShortDescription} onChange={handleInputChange} isEditing={isEditing} primaryColor={primaryColor} placeholder="Product Name" tooltip="Product short name" />
                                <DetailField label="Description" field="LongDescription" value={formData.LongDescription} onChange={handleInputChange} isEditing={isEditing} primaryColor={primaryColor} placeholder="Detailed product description..." tooltip="Full description" type="textarea" />
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <DetailField label="Product Type" field="ProductType" value={formData.ProductType} onChange={handleInputChange} isEditing={isEditing} primaryColor={primaryColor} placeholder="Enter Type" tooltip="Free-form product type" />

                                    <CustomDropdown
                                        label="Category Name"
                                        value={formData.CategoryName}
                                        options={categoryOptions}
                                        onChange={(val, opt) => {
                                            handleInputChange('CategoryName', val);
                                            if (opt && opt.id) handleInputChange('ProductCategoryID', opt.id);
                                        }}
                                        placeholder="Select Category"
                                        tooltip="Select product category"
                                        isEditing={isEditing}
                                        primaryColor={primaryColor}
                                        isLoadingOptions={isLoadingOptions}
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <CustomDropdown
                                        label="Supplier Name"
                                        value={formData.SupplierName}
                                        options={supplierOptions}
                                        onChange={(val, opt) => {
                                            handleInputChange('SupplierName', val);
                                            if (opt && opt.id) handleInputChange('PartnerID', opt.id);
                                        }}
                                        placeholder="Select Supplier"
                                        tooltip="Select primary supplier"
                                        isEditing={isEditing}
                                        primaryColor={primaryColor}
                                        isLoadingOptions={isLoadingOptions}
                                    />

                                    <CustomDropdown
                                        label="Language"
                                        value={formData.Language}
                                        options={[{ label: 'EN', value: 'EN' }, { label: 'FR', value: 'FR' }]}
                                        onChange={(val) => handleInputChange('Language', val)}
                                        placeholder="Language"
                                        isEditing={isEditing}
                                        primaryColor={primaryColor}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Other Data & System Records */}
                    <div className="space-y-4 flex flex-col h-full">
                        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative h-full flex flex-col">
                            <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <span className="w-1 h-3 rounded-full" style={{ backgroundColor: primaryColor }}></span>
                                Specifications & Tracking
                            </p>

                            <div className="space-y-4 flex-1">
                                <div className="grid grid-cols-2 gap-4">
                                    <DetailField label="Selling Price" field="SellingPrice" value={formData.SellingPrice} onChange={handleInputChange} isEditing={isEditing} primaryColor={primaryColor} placeholder="0.00" tooltip="Retail price" type="number" />
                                    <CustomDropdown
                                        label="Currency"
                                        value={formData.Currency}
                                        options={[{ label: 'USD', value: 'USD' }, { label: 'EUR', value: 'EUR' }]}
                                        onChange={(val) => handleInputChange('Currency', val)}
                                        placeholder="Currency"
                                        isEditing={isEditing}
                                        primaryColor={primaryColor}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <DetailField label="Weight Measure" field="WeightUnit" value={formData.WeightUnit} onChange={handleInputChange} isEditing={isEditing} primaryColor={primaryColor} placeholder="0.0" tooltip="Weight value" type="number" />
                                    <CustomDropdown
                                        label="Weight Unit"
                                        value={formData.WeightMeasure}
                                        options={[{ label: 'KG', value: 'KG' }, { label: 'LBS', value: 'LBS' }]}
                                        onChange={(val) => handleInputChange('WeightMeasure', val)}
                                        placeholder="Weight Unit"
                                        isEditing={isEditing}
                                        primaryColor={primaryColor}
                                    />
                                </div>
                                
                                <div className="pt-4 mt-6 border-t border-slate-50 space-y-4">
                                    <Tooltip text={`Created on ${data.CreationTimestamp} by ${data.CreatedBy}`} fullWidth>
                                        <div className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center justify-between cursor-help group">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-left">Created</span>
                                                <span className="text-[10px] font-bold text-slate-800 mt-1">{data.CreationTimestamp}</span>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">By</span>
                                                <span className="text-[10px] font-bold text-slate-600 mt-1 truncate max-w-[100px]">{data.CreatedBy || 'System'}</span>
                                            </div>
                                        </div>
                                    </Tooltip>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center pt-1 border-t border-slate-50"></div>
            </div>
        </div>
    );
};

export default ProductDetail;
