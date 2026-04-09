import React from 'react';

const ComingSoonView = ({ title = "Coming Soon", icon = "construction", description = "We're currently building this module. Check back soon for updates!" }) => {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center text-center animate-fade-in py-20 px-6">
            <div className="w-32 h-32 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200 mb-8 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <span className="material-icons-round text-7xl relative z-10 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-12 text-slate-300">{icon}</span>
            </div>

            <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">
                {title}
            </h2>

            <div className="flex items-center gap-3 mb-8">
                <div className="h-px w-8 bg-slate-200"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Working on it</span>
                <div className="h-px w-8 bg-slate-200"></div>
            </div>

            <p className="text-slate-500 max-w-sm leading-relaxed font-medium">
                {description}
            </p>

            {/* Subtle floating elements for premium feel */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-4">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
        </div>
    );
};

export default ComingSoonView;
