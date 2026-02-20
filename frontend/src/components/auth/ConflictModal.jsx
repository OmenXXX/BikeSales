import React from 'react';

const ConflictModal = ({ onUseHere, onLogout }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500"></div>

            {/* Modal Card */}
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-700">
                {/* Visual Decor */}
                <div className="h-32 bg-slate-900 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_2px_2px,white_1px,transparent_0)] bg-[length:24px_24px]"></div>
                    <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-slate-900 shadow-xl relative z-10">
                        <span className="material-icons-round text-3xl animate-pulse">devices</span>
                    </div>
                </div>

                <div className="p-8 text-center">
                    <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Active Session Detected</h3>
                    <p className="text-sm font-bold text-slate-400 mb-8 leading-relaxed">
                        This account is currently active on another device or tab. Security protocols allow only one concurrent session.
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={onUseHere}
                            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            Use This Device
                        </button>
                        <button
                            onClick={onLogout}
                            className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                        >
                            Exit All Sessions
                        </button>
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Protected by Nexora Security</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConflictModal;
