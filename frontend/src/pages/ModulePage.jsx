import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import ComingSoonView from '../components/common/ComingSoonView';
import PartnersView from './modules/PartnersView';

const ModulePage = () => {
    const { moduleName } = useParams();

    // Whitelist valid modules - currently everything in ModulePage is 'Coming Soon'
    // since Admin has its own dedicated /admin route and is the only 'implemented' module.
    const validModules = ['sales', 'inventory', 'storage', 'reports', 'partners'];

    if (!validModules.includes(moduleName?.toLowerCase())) {
        return <Navigate to="/home" replace />;
    }

    if (moduleName?.toLowerCase() === 'sales') {
        return (
            <div className="p-8 animate-fade-in h-screen bg-slate-50/50">
                <h1 className="text-3xl font-black capitalize mb-4 text-slate-900 tracking-tight">
                    {moduleName} Module
                </h1>
                <div className="card h-[calc(100vh-12rem)] flex items-center justify-center text-slate-400 border-dashed border-2 bg-white/50 rounded-[2rem] shadow-sm">
                    <p className="font-bold text-sm uppercase tracking-widest">Module content will be loaded here.</p>
                </div>
            </div>
        );
    }

    if (moduleName?.toLowerCase() === 'partners') {
        return (
            <div className="h-full bg-slate-100 overflow-y-auto">
                <PartnersView />
            </div>
        );
    }

    return (
        <div className="h-full bg-slate-50/50">
            <ComingSoonView
                title={`${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} Module`}
                icon={
                    moduleName === 'inventory' ? 'inventory_2' :
                        moduleName === 'storage' ? 'warehouse' :
                            moduleName === 'reports' ? 'insights' :
                                'construction'
                }
            />
        </div>
    );
};

export default ModulePage;
