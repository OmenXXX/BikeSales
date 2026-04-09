import React from 'react';
import { useStatus } from '../../context/StatusContext';

const StatusModal = () => {
    const { isOpen, type, title, message, hideStatus, onConfirm, onCancel } = useStatus();

    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return 'check_circle';
            case 'error': return 'error';
            case 'info': return 'info';
            case 'warning': return 'warning';
            case 'confirm': return 'help_outline';
            default: return 'notifications';
        }
    };

    const getColors = () => {
        switch (type) {
            case 'success': return { icon: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', btn: 'bg-emerald-500 hover:bg-emerald-600', ring: 'ring-emerald-500/20' };
            case 'error': return { icon: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100', btn: 'bg-rose-500 hover:bg-rose-600', ring: 'ring-rose-500/20' };
            case 'warning': return { icon: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', btn: 'bg-amber-500 hover:bg-amber-600', ring: 'ring-amber-500/20' };
            case 'confirm': return { icon: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100', btn: 'bg-blue-500 hover:bg-blue-600', ring: 'ring-blue-500/20' };
            default: return { icon: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100', btn: 'bg-blue-500 hover:bg-blue-600', ring: 'ring-blue-500/20' };
        }
    };

    const colors = getColors();

    const handleConfirm = () => {
        if (onConfirm) onConfirm();
        else hideStatus();
    };

    const handleCancel = () => {
        if (onCancel) onCancel();
        else hideStatus();
    };

    // Render as Toast for Success
    if (type === 'success') {
        return (
            <div className="fixed bottom-6 right-6 z-[10000] animate-slide-in-right">
                <div className={`
                    bg-white/90 backdrop-blur-xl w-80 rounded-[1.5rem] p-4 shadow-2xl border ${colors.border}
                    flex items-start gap-4 ring-1 ${colors.ring}
                `}>
                    <div className={`w-10 h-10 shrink-0 ${colors.bg} rounded-full flex items-center justify-center`}>
                        <span className={`material-icons-round text-2xl ${colors.icon}`}>{getIcon()}</span>
                    </div>

                    <div className="flex-1 min-w-0 pr-2">
                        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-1">
                            {title}
                        </h3>
                        <p className="text-[11px] font-bold text-slate-400 leading-snug">
                            {message}
                        </p>
                    </div>

                    <button
                        onClick={handleCancel}
                        className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-300 hover:text-slate-600"
                    >
                        <span className="material-icons-round text-lg">close</span>
                    </button>
                </div>
            </div>
        );
    }

    // Render as Modal for Errors/Info/Confirm
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className={`
                bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border ${colors.border}
                animate-scale-in
            `}>
                <div className="flex flex-col items-center text-center">
                    <div className={`w-20 h-20 ${colors.bg} rounded-full flex items-center justify-center mb-6`}>
                        <span className={`material-icons-round text-5xl ${colors.icon}`}>{getIcon()}</span>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest mb-2">
                        {title}
                    </h3>

                    <p className="text-sm font-medium text-slate-500 leading-relaxed mb-8 px-2">
                        {message}
                    </p>

                    <div className="flex flex-col w-full gap-3">
                        <button
                            onClick={handleConfirm}
                            className={`
                                w-full py-4 rounded-2xl text-white text-[11px] font-black uppercase tracking-[0.2em] 
                                transition-all active:scale-95 shadow-lg shadow-black/5
                                ${colors.btn}
                            `}
                        >
                            {type === 'confirm' ? 'Confirm' : 'Dismiss'}
                        </button>

                        {type === 'confirm' && (
                            <button
                                onClick={handleCancel}
                                className="w-full py-4 rounded-2xl text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatusModal;
