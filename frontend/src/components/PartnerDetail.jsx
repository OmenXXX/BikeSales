import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Tooltip from './common/Tooltip';
import DetailField from './common/DetailField';
import { createRecord, findAddressByAddressId, normalizeAddressIdForFind, updateRecord } from '../api';
import { useStatus } from '../context/StatusContext';

const emptyAddressFields = () => ({
    Street: '',
    Building: '',
    CITY: '',
    PostalCode: '',
    Country: '',
    Region: '',
    AddressType: '',
    Validity_StartDate: '',
    Validity_EndDate: '',
    Latitude: '',
    Longitude: '',
});

/** FileMaker AddressType: 1 = Corporate/Office, 2 = Consumer/Residential */
const canonicalAddressType = (raw) => {
    if (raw === '' || raw == null) return '';
    if (raw === 1 || raw === '1') return '1';
    if (raw === 2 || raw === '2') return '2';
    const s = String(raw).trim();
    if (s === '1') return '1';
    if (s === '2') return '2';
    return '';
};

const addressTypeLabel = (raw) => {
    const v = canonicalAddressType(raw);
    if (v === '1') return 'Corporate / Office';
    if (v === '2') return 'Consumer / Residential';
    return '—';
};

const PartnerDetail = ({ partner, onBack, onSaved, primaryColor = '#0d9488', splitView = false }) => {
    const { showStatus, showWarningDialog } = useStatus();
    const data = partner.fieldData;
    const recordId = partner.recordId;
    const isActive = String(data.Active) === '1' || data.Active === 1;

    const [formData, setFormData] = useState({ ...data });
    const [addressRecord, setAddressRecord] = useState(null);
    const [addressForm, setAddressForm] = useState(emptyAddressFields());
    const [loadingAddress, setLoadingAddress] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [orphanAddressAcknowledged, setOrphanAddressAcknowledged] = useState(false);
    const [addressFetchDone, setAddressFetchDone] = useState(false);

    const hasPartnerAddressId = useMemo(
        () => normalizeAddressIdForFind(partner.fieldData.AddressID) != null,
        [partner.fieldData.AddressID]
    );

    const isOrphanAddressLink =
        hasPartnerAddressId && addressFetchDone && !loadingAddress && !addressRecord;

    const addressFieldsEnabled = isEditing && (!!addressRecord || orphanAddressAcknowledged);

    useEffect(() => {
        setFormData({ ...partner.fieldData });
    }, [partner]);

    useEffect(() => {
        setIsEditing(false);
        setOrphanAddressAcknowledged(false);
        setAddressFetchDone(false);
    }, [partner.recordId]);

    const loadAddress = useCallback(async () => {
        const rawAid = partner.fieldData.AddressID;
        if (rawAid === '' || rawAid == null) {
            setAddressRecord(null);
            setAddressForm(emptyAddressFields());
            setAddressFetchDone(true);
            return;
        }
        setAddressFetchDone(false);
        setLoadingAddress(true);
        try {
            // Separate _find on Addresses layout using AddressID from BusinessPartners
            const res = await findAddressByAddressId(rawAid);
            const row = res.success ? res.data?.[0] : null;
            if (row) {
                setAddressRecord(row);
                setAddressForm({
                    ...emptyAddressFields(),
                    ...row.fieldData,
                    AddressType: canonicalAddressType(row.fieldData?.AddressType),
                });
            } else {
                setAddressRecord(null);
                setAddressForm(emptyAddressFields());
            }
        } catch (e) {
            console.error('PartnerDetail address load', e);
            setAddressRecord(null);
            setAddressForm(emptyAddressFields());
        } finally {
            setLoadingAddress(false);
            setAddressFetchDone(true);
        }
    }, [partner]);

    useEffect(() => {
        loadAddress();
    }, [loadAddress]);

    const handlePartnerChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleAddressChange = (field, value) => {
        setAddressForm((prev) => ({ ...prev, [field]: value }));
    };

    const buildAddressPayload = useCallback(() => {
        const t = canonicalAddressType(addressForm.AddressType);
        return {
            Street: addressForm.Street,
            Building: addressForm.Building,
            CITY: addressForm.CITY,
            PostalCode: addressForm.PostalCode,
            Country: addressForm.Country,
            Region: addressForm.Region,
            AddressType: t || addressForm.AddressType,
            Validity_StartDate: addressForm.Validity_StartDate,
            Validity_EndDate: addressForm.Validity_EndDate,
            Latitude: addressForm.Latitude,
            Longitude: addressForm.Longitude,
        };
    }, [addressForm]);

    const beginEdit = useCallback(async () => {
        if (isOrphanAddressLink) {
            const proceed = await showWarningDialog({
                title: 'Address record missing',
                message:
                    'This business partner has an Address ID, but no matching row was found in the Address table. Proceed to edit and save (a new address record will be created with this ID), or Abort to stay in view mode.',
                proceedLabel: 'Proceed',
                abortLabel: 'Abort',
            });
            if (!proceed) return;
            setOrphanAddressAcknowledged(true);
        }
        setIsEditing(true);
    }, [isOrphanAddressLink, showWarningDialog]);

    const handleSave = async () => {
        if (!formData.EmailAddress?.trim()) {
            showStatus({ type: 'error', title: 'Missing email', message: 'Email address is required.' });
            return;
        }
        setSaving(true);
        try {
            await updateRecord('BusinessPartners', recordId, {
                Name: formData.Name,
                LegalForm: formData.LegalForm,
                EmailAddress: formData.EmailAddress,
                PhoneNumber: formData.PhoneNumber,
                FaxNumber: formData.FaxNumber,
                WebAddress: formData.WebAddress,
                PartnerRole: formData.PartnerRole,
                Currency: formData.Currency,
                Active: formData.Active === 1 || formData.Active === '1' ? 1 : 0,
            });

            const addrPayload = buildAddressPayload();
            const normalizedAid = normalizeAddressIdForFind(partner.fieldData.AddressID);

            if (addressRecord?.recordId) {
                await updateRecord('Addresses', addressRecord.recordId, addrPayload);
            } else if (normalizedAid && addressFieldsEnabled) {
                const created = await createRecord('Addresses', {
                    AddressID: normalizedAid,
                    ...addrPayload,
                });
                const newRid = created.data?.recordId;
                if (newRid) {
                    setAddressRecord({
                        recordId: newRid,
                        fieldData: { AddressID: normalizedAid, ...addrPayload },
                    });
                }
                setOrphanAddressAcknowledged(false);
            }

            showStatus({ type: 'success', title: 'Saved', message: 'Business partner updated.' });
            setIsEditing(false);
            onSaved?.();
        } catch (err) {
            console.error(err);
            showStatus({
                type: 'error',
                title: 'Save failed',
                message: err.error || err.message || 'Could not save changes.',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setFormData({ ...partner.fieldData });
        if (addressRecord) {
            setAddressForm({
                ...emptyAddressFields(),
                ...addressRecord.fieldData,
                AddressType: canonicalAddressType(addressRecord.fieldData?.AddressType),
            });
        } else {
            setAddressForm(emptyAddressFields());
        }
        setOrphanAddressAcknowledged(false);
        setIsEditing(false);
    };

    const roleLabel =
        String(formData.PartnerRole) === '1'
            ? 'Customer'
            : String(formData.PartnerRole) === '2'
              ? 'Supplier / Vendor'
              : 'Partner';

    const btnStyles = {
        edit: 'bg-teal-50 border-teal-100 text-teal-700 hover:bg-teal-600 hover:text-white',
        save: 'bg-emerald-50 border-emerald-500/20 text-emerald-600 hover:bg-emerald-600 hover:text-white',
        cancel: 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white',
    };

    return (
        <div
            className={`relative animate-fade-in w-full ${splitView ? 'pb-6 px-4 md:px-6' : 'pb-16 max-w-7xl mx-auto px-4 md:px-8'}`}
        >
            <div className={`space-y-4 pb-6 ${splitView ? '' : 'max-w-7xl mx-auto'}`}>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-2.5 px-6 rounded-[2rem] border border-slate-100 shadow-sm mt-5 mb-5">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Tooltip text="Back to list">
                            <button
                                type="button"
                                onClick={onBack}
                                className="w-9 h-9 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-500 hover:text-teal-600 hover:border-teal-100 transition-all shrink-0"
                            >
                                <span className="material-icons-round text-xl">arrow_back</span>
                            </button>
                        </Tooltip>
                        <div className="flex items-center gap-3 min-w-0">
                            <h2 className="text-lg font-black text-slate-900 tracking-tighter leading-none truncate">
                                {formData.Name || 'Partner'}
                            </h2>
                            <span className="text-slate-200 font-light select-none shrink-0">|</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mt-0.5 shrink-0">
                                {roleLabel}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-6">
                        <Tooltip text={isActive ? 'Partner is active' : 'Partner is inactive'}>
                            <div className="flex items-center gap-3 pr-4 border-r border-slate-100 h-10 cursor-help">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                    <span
                                        className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}
                                    >
                                        {isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                        </Tooltip>

                        <div className="flex items-center gap-2">
                            {!isEditing ? (
                                <Tooltip text="Edit partner record">
                                    <button
                                        type="button"
                                        onClick={() => void beginEdit()}
                                        className={`flex items-center justify-center px-5 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95 w-28 ${btnStyles.edit}`}
                                    >
                                        Edit
                                    </button>
                                </Tooltip>
                            ) : (
                                <>
                                    <Tooltip text="Save changes">
                                        <button
                                            type="button"
                                            onClick={() => void handleSave()}
                                            disabled={saving}
                                            className={`flex items-center justify-center px-5 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95 w-28 ${btnStyles.save} ${saving ? 'opacity-50 cursor-wait' : ''}`}
                                        >
                                            {saving ? 'Saving…' : 'Save'}
                                        </button>
                                    </Tooltip>
                                    <Tooltip text="Discard changes">
                                        <button
                                            type="button"
                                            onClick={handleCancel}
                                            disabled={saving}
                                            className={`flex items-center justify-center px-5 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95 w-28 ${btnStyles.cancel}`}
                                        >
                                            Cancel
                                        </button>
                                    </Tooltip>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Column 1 — Personal identity */}
                    <div className="space-y-4">
                        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden h-full">
                            <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
                                <span className="w-1 h-3 rounded-full bg-teal-500" />
                                Personal identity
                            </p>

                            {/* <div className="space-y-1 mb-5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    Partner ID
                                </label>
                                <div className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-50 text-xs font-black text-slate-700">
                                    {formData.PartnerID ?? '—'}
                                </div>
                            </div> */}

                            <div className="space-y-4">
                                <DetailField
                                    label="Entity name"
                                    field="Name"
                                    value={formData.Name}
                                    onChange={handlePartnerChange}
                                    isEditing={isEditing}
                                    primaryColor={primaryColor}
                                    placeholder="Company name"
                                    tooltip="Legal entity / trade name"
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <DetailField
                                        label="Legal form"
                                        field="LegalForm"
                                        value={formData.LegalForm}
                                        onChange={handlePartnerChange}
                                        isEditing={isEditing}
                                        primaryColor={primaryColor}
                                        placeholder="Inc., LLC…"
                                    />
                                    <div className="space-y-1 min-w-0">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">
                                            Role
                                        </label>
                                        <Tooltip text="Customer or supplier / vendor" fullWidth>
                                            <select
                                                value={
                                                    formData.PartnerRole === '' || formData.PartnerRole == null
                                                        ? ''
                                                        : String(formData.PartnerRole)
                                                }
                                                onChange={(e) => handlePartnerChange('PartnerRole', e.target.value)}
                                                disabled={!isEditing}
                                                className={`
                                                    w-full h-12 lg:h-10 pl-4 pr-10 rounded-xl text-xs font-black transition-all focus:outline-none appearance-none
                                                    bg-slate-50 border border-slate-50 text-slate-900 min-w-0
                                                    ${!isEditing ? 'cursor-help opacity-90' : 'focus:bg-white focus:shadow-md'}
                                                `}
                                                style={{ borderColor: isEditing ? undefined : 'transparent' }}
                                            >
                                                <option value="" disabled>
                                                    Select role…
                                                </option>
                                                <option value="1">Customer</option>
                                                <option value="2">Supplier / Vendor</option>
                                            </select>
                                        </Tooltip>
                                    </div>
                                </div>
                                <DetailField
                                    label="Communication email"
                                    field="EmailAddress"
                                    value={formData.EmailAddress}
                                    onChange={handlePartnerChange}
                                    isEditing={isEditing}
                                    icon="alternate_email"
                                    primaryColor={primaryColor}
                                    placeholder="email@example.com"
                                    validationType="email"
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <DetailField
                                        label="Phone number"
                                        field="PhoneNumber"
                                        value={formData.PhoneNumber}
                                        onChange={handlePartnerChange}
                                        isEditing={isEditing}
                                        icon="phone"
                                        primaryColor={primaryColor}
                                        validationType="phone"
                                    />
                                    <DetailField
                                        label="Fax number"
                                        field="FaxNumber"
                                        value={formData.FaxNumber}
                                        onChange={handlePartnerChange}
                                        isEditing={isEditing}
                                        primaryColor={primaryColor}
                                        validationType="phone"
                                    />
                                </div>
                                <DetailField
                                    label="Website"
                                    field="WebAddress"
                                    value={formData.WebAddress}
                                    onChange={handlePartnerChange}
                                    isEditing={isEditing}
                                    icon="language"
                                    primaryColor={primaryColor}
                                    placeholder="https://…"
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                                    <DetailField
                                        label="Currency"
                                        field="Currency"
                                        value={formData.Currency}
                                        onChange={handlePartnerChange}
                                        isEditing={isEditing}
                                        primaryColor={primaryColor}
                                        placeholder="USD"
                                    />
                                    <div className="space-y-1 w-full min-w-0">
                                        <label className="text-[9px] font-black uppercase tracking-widest ml-3 text-transparent select-none pointer-events-none">
                                            —
                                        </label>
                                        <div className="flex h-12 lg:h-10 items-center gap-2 justify-end w-full">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                                                Active
                                            </span>
                                            <button
                                                type="button"
                                                disabled={!isEditing}
                                                onClick={() =>
                                                    handlePartnerChange(
                                                        'Active',
                                                        formData.Active === 1 || formData.Active === '1' ? 0 : 1
                                                    )
                                                }
                                                className={`w-10 h-5 rounded-full relative shrink-0 transition-colors ${formData.Active === 1 || formData.Active === '1' ? 'bg-emerald-500' : 'bg-slate-300'} ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                                            >
                                                <span
                                                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${formData.Active === 1 || formData.Active === '1' ? 'translate-x-5' : 'translate-x-0'}`}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Column 2 — Address (separate fields) */}
                    <div className="space-y-4 flex flex-col h-full">
                        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden h-full flex flex-col">
                            <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
                                <span className="w-1 h-3 rounded-full bg-teal-500" />
                                Address
                            </p>
                            {loadingAddress ? (
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                                    Loading…
                                </p>
                            ) : addressRecord ? (
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                                    Address ID : {addressRecord.fieldData?.AddressID ?? '—'}
                                </p>
                            ) : null}

                            <div className="space-y-5 flex-1">
                                <DetailField
                                    label="Building"
                                    field="Building"
                                    value={addressForm.Building}
                                    onChange={handleAddressChange}
                                    isEditing={addressFieldsEnabled}
                                    primaryColor={primaryColor}
                                />
                                <DetailField
                                    label="Street"
                                    field="Street"
                                    value={addressForm.Street}
                                    onChange={handleAddressChange}
                                    isEditing={addressFieldsEnabled}
                                    primaryColor={primaryColor}
                                />
                                <DetailField
                                    label="City"
                                    field="CITY"
                                    value={addressForm.CITY}
                                    onChange={handleAddressChange}
                                    isEditing={addressFieldsEnabled}
                                    primaryColor={primaryColor}
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <DetailField
                                        label="Postal code"
                                        field="PostalCode"
                                        value={addressForm.PostalCode}
                                        onChange={handleAddressChange}
                                        isEditing={addressFieldsEnabled}
                                        primaryColor={primaryColor}
                                    />
                                    <DetailField
                                        label="Country"
                                        field="Country"
                                        value={addressForm.Country}
                                        onChange={handleAddressChange}
                                        isEditing={addressFieldsEnabled}
                                        primaryColor={primaryColor}
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <DetailField
                                        label="Region"
                                        field="Region"
                                        value={addressForm.Region}
                                        onChange={handleAddressChange}
                                        isEditing={addressFieldsEnabled}
                                        primaryColor={primaryColor}
                                    />
                                    <div className="space-y-1 min-w-0">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">
                                            Address type
                                        </label>
                                        {addressFieldsEnabled ? (
                                            <Tooltip text="1 = Corporate / Office, 2 = Consumer / Residential" fullWidth>
                                                <select
                                                    value={canonicalAddressType(addressForm.AddressType)}
                                                    onChange={(e) =>
                                                        handleAddressChange('AddressType', e.target.value)
                                                    }
                                                    className="w-full h-12 lg:h-10 pl-4 pr-10 rounded-xl text-xs font-black transition-all focus:outline-none appearance-none bg-slate-50 border border-slate-50 text-slate-900 min-w-0 focus:bg-white focus:shadow-md"
                                                >
                                                    <option value="">Select type…</option>
                                                    <option value="1">Corporate / Office</option>
                                                    <option value="2">Consumer / Residential</option>
                                                </select>
                                            </Tooltip>
                                        ) : (
                                            <Tooltip text="Address category from database" fullWidth>
                                                <div className="w-full h-12 lg:h-10 px-4 rounded-xl text-xs font-black flex items-center bg-slate-50 border border-slate-50 text-slate-900 cursor-help opacity-90">
                                                    {addressTypeLabel(addressForm.AddressType)}
                                                </div>
                                            </Tooltip>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <DetailField
                                        label="Validity start"
                                        field="Validity_StartDate"
                                        value={addressForm.Validity_StartDate}
                                        onChange={handleAddressChange}
                                        isEditing={addressFieldsEnabled}
                                        primaryColor={primaryColor}
                                        validationType="date"
                                    />
                                    <DetailField
                                        label="Validity end"
                                        field="Validity_EndDate"
                                        value={addressForm.Validity_EndDate}
                                        onChange={handleAddressChange}
                                        isEditing={addressFieldsEnabled}
                                        primaryColor={primaryColor}
                                        validationType="date"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <DetailField
                                        label="Latitude"
                                        field="Latitude"
                                        value={addressForm.Latitude}
                                        onChange={handleAddressChange}
                                        isEditing={addressFieldsEnabled}
                                        primaryColor={primaryColor}
                                    />
                                    <DetailField
                                        label="Longitude"
                                        field="Longitude"
                                        value={addressForm.Longitude}
                                        onChange={handleAddressChange}
                                        isEditing={addressFieldsEnabled}
                                        primaryColor={primaryColor}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Column 3 — reserved */}
                    <div className="space-y-4">
                        <div className="bg-white p-6 rounded-[2.5rem] border border-dashed border-slate-200 shadow-sm min-h-[280px] flex flex-col items-center justify-center text-center">
                            <span className="material-icons-round text-4xl text-slate-200 mb-3">inventory_2</span>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                Reserved
                            </p>
                            <p className="text-xs font-bold text-slate-400 mt-2 max-w-[200px]">
                                Additional partner tools will appear here.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PartnerDetail;
