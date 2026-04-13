import React, { useState, useMemo } from 'react';
import Tooltip from './common/Tooltip';

const roleLabel = (role) => {
    if (String(role) === '1') return 'Customer';
    if (String(role) === '2') return 'Supplier / Vendor';
    return 'Partner';
};

const PartnerListSidebar = ({ partners, selectedPartner, onSelectPartner, primaryColor = '#0d9488' }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return partners;
        const q = searchQuery.toLowerCase();
        return partners.filter(
            (p) =>
                p.fieldData.Name?.toLowerCase().includes(q) ||
                String(p.fieldData.PartnerID ?? '').includes(q) ||
                p.fieldData.EmailAddress?.toLowerCase().includes(q)
        );
    }, [partners, searchQuery]);

    return (
        <div className="w-full h-full min-h-0 flex flex-col bg-white border-r border-slate-100">
            <div className="p-4 pt-5 pb-5 border-b border-slate-50 shrink-0 bg-white z-10">
                <div className="relative group">
                    <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-lg group-focus-within:text-slate-900 transition-colors">
                        search
                    </span>
                    <input
                        type="text"
                        placeholder="Search List..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-transparent py-3 pl-10 pr-4 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-slate-100 focus:shadow-md transition-all placeholder:text-slate-400"
                    />
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-2 pt-3 pb-5 space-y-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                {filtered.map((p) => {
                    const isSelected = selectedPartner?.recordId === p.recordId;
                    const name = p.fieldData.Name || 'Partner';
                    const initials = name
                        .split(' ')
                        .filter(Boolean)
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase();

                    return (
                        <Tooltip key={p.recordId} text={`View ${name}`} position="right" className="w-full">
                            <button
                                type="button"
                                onClick={() => onSelectPartner(p)}
                                className={`
                                    w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-300 group
                                    ${isSelected ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-600'}
                                `}
                            >
                                <div
                                    className={`
                                    w-10 h-10 rounded-full overflow-hidden border-2 flex-shrink-0 flex items-center justify-center text-[11px] font-black transition-transform duration-300
                                    ${isSelected ? 'border-white/20 scale-105 bg-white/10' : 'border-slate-100 bg-slate-100 text-slate-500 group-hover:scale-110'}
                                `}
                                    style={
                                        !isSelected
                                            ? { color: primaryColor, backgroundColor: `${primaryColor}14` }
                                            : undefined
                                    }
                                >
                                    {initials}
                                </div>

                                <div className="overflow-hidden min-w-0">
                                    <p className={`text-sm font-black truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                        {name}
                                    </p>
                                    <p
                                        className={`text-[9px] font-bold uppercase tracking-wider truncate ${isSelected ? 'text-white/50' : 'text-slate-400'}`}
                                    >
                                        {roleLabel(p.fieldData.PartnerRole)}
                                    </p>
                                </div>

                                {isSelected && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] shrink-0" />
                                )}
                            </button>
                        </Tooltip>
                    );
                })}

                {filtered.length === 0 && (
                    <div className="p-8 text-center opacity-40">
                        <span className="material-icons-round text-3xl mb-2 text-slate-300">search_off</span>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No matches found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PartnerListSidebar;
