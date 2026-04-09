import React from 'react';
import { useNavigate } from 'react-router-dom';
import ComingSoonView from '../components/common/ComingSoonView';

const ComingSoon = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-[calc(100vh-6rem)] relative">
            <ComingSoonView
                title="System Dashboard"
                icon="dashboard"
                description="The global intelligence dashboard is currently being synthesized. Check back soon for real-time analytics and insights."
            />

            <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
                <button
                    onClick={() => navigate('/home')}
                    className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-[#1a1d21] text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl active:scale-95"
                >
                    <span className="material-icons-round text-sm">arrow_back</span>
                    Back to Hub
                </button>
            </div>
        </div>
    );
};

export default ComingSoon;
