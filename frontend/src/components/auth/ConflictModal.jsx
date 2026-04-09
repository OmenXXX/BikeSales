import React from 'react';
import { useAuth } from '../../context/AuthContext'; // Import context to access remote device info if needed

const ConflictModal = ({ onLogout, onClaim }) => {

    const handleWorkHere = () => {
        console.log("CONFLICT: User clicked Work In This Tab");
        onClaim();
    };

    const handleLogoutAll = () => {
        console.log("CONFLICT: User clicked Log Out All");
        onLogout();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md w-full border border-slate-100 animate-in zoom-in-95 duration-500">

                <div className="h-2 bg-gradient-to-r from-amber-400 via-rose-500 to-amber-400"></div>

                <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="material-icons-round text-rose-500 text-4xl">sync_problem</span>
                    </div>

                    <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">
                        Session Active Elsewhere
                    </h2>

                    <p className="text-slate-500 mb-8 leading-relaxed">
                        Your account is currently active on another device or browser.
                        To protect your data, only one active session is allowed at a time.
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleWorkHere}
                            className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                        >
                            <span className="material-icons-round text-sm text-emerald-400">bolt</span>
                            USE HERE INSTEAD
                        </button>

                        <button
                            onClick={handleLogoutAll}
                            className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors"
                        >
                            Log out from all devices
                        </button>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase text-center tracking-tighter">
                        Protected by Nexora Secure Auth System
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ConflictModal;
