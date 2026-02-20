import React from 'react';

const ComingSoonView = ({ title, icon = 'hourglass_empty', description }) => {
    return (
        <div className="p-8 md:p-12 max-w-[1400px] mx-auto animate-in fade-in duration-1000">
            <div className="bg-white rounded-[3rem] border-2 border-slate-50 shadow-sm overflow-hidden p-10 md:p-20 flex flex-col items-center text-center space-y-8 relative group">
                {/* Decorative Background Elements */}
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-slate-50 rounded-full transition-transform duration-1000 group-hover:scale-110"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-slate-50/50 rounded-full transition-transform duration-1000 group-hover:scale-125"></div>

                <div className="w-24 h-24 rounded-[2rem] bg-slate-900 text-white flex items-center justify-center shadow-2xl relative z-10 transition-transform duration-700 group-hover:rotate-12 group-hover:scale-110">
                    <span className="material-icons-round text-4xl">{icon}</span>
                </div>

                <div className="space-y-4 relative z-10">
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">{title}</h2>
                    <div className="flex items-center justify-center gap-3">
                        <div className="h-[2px] w-8 bg-slate-200"></div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Development In Progress</span>
                        <div className="h-[2px] w-8 bg-slate-200"></div>
                    </div>
                </div>

                <p className="max-w-xl text-lg font-bold text-slate-400 group-hover:text-slate-600 transition-colors duration-700 relative z-10">
                    {description || "We are architecting a high-performance experience for this module. This section will be deployed in the upcoming sprint cycle."}
                </p>

                <div className="pt-8 relative z-10">
                    <button className="px-10 py-4 rounded-2xl bg-slate-50 text-slate-400 border border-slate-100 transition-all font-black text-[10px] uppercase tracking-widest pointer-events-none">
                        Alpha v0.8.2
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ComingSoonView;
