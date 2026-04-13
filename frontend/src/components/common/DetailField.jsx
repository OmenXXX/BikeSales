import React from 'react';
import Tooltip from './Tooltip';

/**
 * FileMaker dates often arrive as MM/DD/YYYY or MM-DD-YYYY (US order).
 * Also supports YYYYMMDD and YYYY-MM-DD. HTML date input uses YYYY-MM-DD.
 * Values written back to FileMaker use MM/DD/YYYY.
 */
function parseFmDateParts(v) {
    if (v == null || v === '') return null;
    const s = String(v).trim();
    if (!s) return null;

    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) {
        const y = m[1];
        const mo = m[2].padStart(2, '0');
        const d = m[3].padStart(2, '0');
        const dt = new Date(`${y}-${mo}-${d}T12:00:00`);
        if (Number.isNaN(dt.getTime())) return null;
        return { y, m: mo, d };
    }

    m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (m) {
        const mo = m[1].padStart(2, '0');
        const d = m[2].padStart(2, '0');
        const y = m[3];
        const dt = new Date(`${y}-${mo}-${d}T12:00:00`);
        if (Number.isNaN(dt.getTime())) return null;
        return { y, m: mo, d };
    }

    const digits = s.replace(/\D/g, '');
    if (digits.length === 8 && /^\d{8}$/.test(digits)) {
        const y = digits.slice(0, 4);
        const mo = digits.slice(4, 6);
        const d = digits.slice(6, 8);
        const dt = new Date(`${y}-${mo}-${d}T12:00:00`);
        if (Number.isNaN(dt.getTime())) return null;
        return { y, m: mo, d };
    }

    return null;
}

/** Any supported FileMaker / legacy form → YYYY-MM-DD for `<input type="date">` */
export function fmStorageToInputDate(v) {
    const p = parseFmDateParts(v);
    if (!p) return '';
    return `${p.y}-${p.m}-${p.d}`;
}

/** YYYY-MM-DD from date picker → MM/DD/YYYY for FileMaker */
export function inputDateToFmStorage(html) {
    if (!html || !String(html).trim()) return '';
    const p = parseFmDateParts(html);
    if (!p) return '';
    return `${p.m}/${p.d}/${p.y}`;
}

/** Normalized MM/DD/YYYY for read-only display */
export function fmStorageToDisplay(v) {
    const p = parseFmDateParts(v);
    if (!p) return '';
    return `${p.m}/${p.d}/${p.y}`;
}

const DetailField = ({
    label,
    field,
    value,
    onChange,
    isEditing,
    icon,
    primaryColor,
    dark,
    placeholder,
    tooltip,
    validationType,
}) => {
    const validate = (val) => {
        if (!val) return true;
        if (validationType === 'name') return /^[a-zA-Z0-9 ]{1,50}$/.test(val);
        if (validationType === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        if (validationType === 'phone') return /^[\d\+\-\(\) ]{7,20}$/.test(val);
        if (validationType === 'url') return /^https?:\/\/.+/i.test(val) || /^www\./i.test(val);
        if (validationType === 'date') {
            if (!val) return true;
            return fmStorageToInputDate(val) !== '';
        }
        return true;
    };

    const isValid = validate(value);

    const inputClass = `
        w-full h-12 lg:h-10 pl-4 pr-10 rounded-xl text-xs font-black transition-all focus:outline-none 
        ${dark
            ? 'bg-white/5 border border-white/5 text-white focus:bg-white/10 focus:border-white/20 placeholder-white/20'
            : 'bg-slate-50 border border-slate-50 text-slate-900 focus:bg-white focus:shadow-md focus:border-slate-100 placeholder-slate-300'
        }
        ${!isEditing && 'cursor-help'}
        ${!isValid && isEditing ? '!border-rose-300 !bg-rose-50/30' : ''}
        ${validationType === 'date' && isEditing ? '[color-scheme:light]' : ''}
    `;

    const dateIcon = 'calendar_today';
    const showIcon =
        validationType === 'date' && isEditing ? icon || null : icon || (validationType === 'date' ? dateIcon : null);

    return (
        <div className="space-y-1 group w-full">
            <label
                className={`text-[9px] font-black uppercase tracking-widest ml-3 transition-colors ${dark ? 'text-slate-500 group-focus-within:text-white' : 'text-slate-400 group-focus-within:text-slate-800'}`}
            >
                {label}
            </label>
            <Tooltip
                text={
                    !isValid
                        ? `Invalid ${label} format`
                        : isEditing
                          ? validationType === 'date'
                              ? `Pick a date — saved as MM/DD/YYYY for FileMaker`
                              : `Click to edit ${label.toLowerCase()}`
                          : tooltip || `Value of ${label.toLowerCase()}`
                }
                fullWidth
            >
                <div className="relative w-full">
                    {validationType === 'date' ? (
                        isEditing ? (
                            <input
                                type="date"
                                value={fmStorageToInputDate(value)}
                                onChange={(e) => onChange(field, inputDateToFmStorage(e.target.value))}
                                className={inputClass}
                                style={{
                                    borderColor:
                                        isEditing && !dark && isValid ? 'transparent' : !isValid && isEditing ? '#fda4af' : '',
                                }}
                                onFocus={(e) => isEditing && !dark && isValid && (e.target.style.borderColor = primaryColor)}
                                onBlur={(e) => !dark && isValid && (e.target.style.borderColor = 'transparent')}
                            />
                        ) : (
                            <input
                                type="text"
                                value={fmStorageToDisplay(value)}
                                disabled
                                readOnly
                                placeholder={placeholder || `—`}
                                className={inputClass}
                            />
                        )
                    ) : (
                        <input
                            type="text"
                            value={value || ''}
                            onChange={(e) => onChange(field, e.target.value)}
                            disabled={!isEditing}
                            placeholder={placeholder || `Enter ${label}...`}
                            className={inputClass}
                            style={{
                                borderColor:
                                    isEditing && !dark && isValid ? 'transparent' : !isValid && isEditing ? '#fda4af' : '',
                            }}
                            onFocus={(e) => isEditing && !dark && isValid && (e.target.style.borderColor = primaryColor)}
                            onBlur={(e) => !dark && isValid && (e.target.style.borderColor = 'transparent')}
                        />
                    )}
                    {showIcon && (
                        <span
                            className={`material-icons-round absolute right-3 top-1/2 -translate-y-1/2 text-base transition-colors pointer-events-none ${dark ? 'text-white/20' : 'text-slate-300'} ${!isValid && isEditing ? 'text-rose-400' : ''}`}
                            style={{ color: isEditing && !dark && isValid ? primaryColor : '' }}
                        >
                            {showIcon}
                        </span>
                    )}
                    {!isValid && isEditing && (
                        <span
                            className={`material-icons-round absolute top-1/2 -translate-y-1/2 text-rose-400 text-sm animate-pulse ${validationType === 'date' ? 'right-3' : 'right-10'}`}
                        >
                            warning
                        </span>
                    )}
                </div>
            </Tooltip>
        </div>
    );
};

export default DetailField;
