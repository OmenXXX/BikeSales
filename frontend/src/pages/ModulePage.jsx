import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import ComingSoonView from '../components/common/ComingSoonView';
import PartnersView from './modules/PartnersView';
import SalesView from './modules/SalesView';
import ProductView from './modules/ProductView';
import StorageView from './modules/StorageView';

const ModulePage = () => {
    const { moduleName } = useParams();

    // Whitelist valid modules
    const validModules = ['sales', 'inventory', 'storage', 'reports', 'partners', 'products'];

    if (!validModules.includes(moduleName?.toLowerCase())) {
        return <Navigate to="/home" replace />;
    }

    const mName = moduleName?.toLowerCase();

    if (mName === 'sales') {
        return (
            <div className="h-full bg-slate-100 overflow-y-auto">
                <SalesView />
            </div>
        );
    }

    if (mName === 'partners') {
        return (
            <div className="h-full bg-slate-100 overflow-y-auto">
                <PartnersView />
            </div>
        );
    }

    if (mName === 'products' || mName === 'inventory') {
        return (
            <div className="h-full bg-slate-100 overflow-y-auto">
                <ProductView />
            </div>
        );
    }

    if (mName === 'storage') {
        return (
            <div className="h-full bg-slate-100">
                <StorageView />
            </div>
        );
    }

    return (
        <div className="h-full bg-slate-50/50">
            <ComingSoonView
                title={`${mName === 'inventory' ? 'Products' : moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} Module`}
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
