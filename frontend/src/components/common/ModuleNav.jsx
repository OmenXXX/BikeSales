import React from 'react';
import { useNavigate } from 'react-router-dom';
import Tooltip from './Tooltip';

const modules = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', color: '#5048e5' },
    { id: 'partners', label: 'Business Partners', icon: 'contacts', color: '#10b981' },
    { id: 'employees', label: 'Employees', icon: 'people', color: '#6366f1' },
    { id: 'inventory', label: 'Products', icon: 'inventory_2', color: '#3b82f6' },
    { id: 'storage', label: 'Storage', icon: 'warehouse', color: '#8b5cf6' },
    { id: 'sales', label: 'Sales', icon: 'shopping_cart', color: '#f59e0b' },
    { id: 'reports', label: 'Reports', icon: 'insights', color: '#f43f5e' },
    { id: 'admin', label: 'System Admin', icon: 'settings_suggest', color: '#475569' }
];

const ModuleNav = ({ activeModule, onModuleChange }) => {
    const navigate = useNavigate();

    return (
        <div className="w-16 h-full bg-[#1e293b] flex flex-col items-center py-6 gap-6 z-[60] relative shadow-2xl overflow-y-auto no-scrollbar border-r border-white/5">
            {/* Nexora Mini Logo */}
            <button
                onClick={() => navigate('/home')}
                className="w-10 h-10 bg-gradient-to-br from-primary to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg transform transition-transform hover:scale-110 active:scale-95 mb-4"
            >
                <span className="material-icons-round text-xl">precision_manufacturing</span>
            </button>

            {modules.map((mod) => (
                <Tooltip key={mod.id} text={mod.label} position="right">
                    <button
                        onClick={() => onModuleChange ? onModuleChange(mod.id) : navigate(`/admin/${mod.id}`)}
                        className={`
                            relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 group
                            ${activeModule === mod.id
                                ? 'bg-white/10 text-white shadow-glow'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'}
                        `}
                    >
                        {activeModule === mod.id && (
                            <div
                                className="absolute left-[-12px] w-1.5 h-6 rounded-full animate-fade-in"
                                style={{ backgroundColor: mod.color }}
                            ></div>
                        )}
                        <span
                            className={`material-icons-round transition-all duration-300 ${activeModule === mod.id ? 'scale-110' : 'group-hover:scale-110'}`}
                            style={{ color: activeModule === mod.id ? mod.color : 'inherit' }}
                        >
                            {mod.icon}
                        </span>

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 rounded-xl bg-current opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none"></div>
                    </button>
                </Tooltip>
            ))}

            <div className="mt-auto pt-6 border-t border-white/5 w-8 flex flex-col items-center gap-6">
                <Tooltip text="User Profile" position="right">
                    <button className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden border border-white/10 hover:border-white/30 transition-colors">
                        <img
                            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                            alt="User"
                            className="w-full h-full object-cover"
                        />
                    </button>
                </Tooltip>
                <Tooltip text="Logout" position="right">
                    <button className="text-slate-500 hover:text-rose-400 transition-colors">
                        <span className="material-icons-round text-xl">power_settings_new</span>
                    </button>
                </Tooltip>
            </div>
        </div>
    );
};

export default ModuleNav;
