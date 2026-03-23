import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Tooltip from './common/Tooltip';

const Sidebar = ({ isCollapsed, toggleCollapsed }) => {
    const navigate = useNavigate();
    const primaryColor = "#7393B3"; // Matches Admin/Home

    const links = [
        { path: '/home', icon: 'dashboard', label: 'Hub' },
        { path: '/module/sales', icon: 'shopping_cart', label: 'Sales' },
        { path: '/module/inventory', icon: 'inventory_2', label: 'Inventory' },
        { path: '/module/storage', icon: 'warehouse', label: 'Storage' },
        { path: '/module/partners', icon: 'contacts', label: 'Business Partners' },
        { path: '/module/reports', icon: 'insights', label: 'Reports' },
        { path: '/admin', icon: 'settings_suggest', label: 'Admin' },
    ];

    return (
        <aside
            className={`
                h-full relative left-0 bg-[#1a1d21] text-white flex flex-col transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-50
                ${isCollapsed ? 'w-20' : 'w-64 shadow-[20px_0_50px_rgba(0,0,0,0.3)]'}
            `}
            onMouseEnter={() => isCollapsed && toggleCollapsed()}
            onMouseLeave={() => !isCollapsed && toggleCollapsed()}
        >
            {/* Carbon Fiber Overlay */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.05]"
                style={{
                    backgroundImage: `
                        linear-gradient(45deg, #ffffff 25%, transparent 25%),
                        linear-gradient(-45deg, #ffffff 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #ffffff 75%),
                        linear-gradient(-45deg, transparent 75%, #ffffff 75%)
                    `,
                    backgroundSize: '4px 4px',
                    backgroundBlendMode: 'overlay'
                }}
            ></div>

            {/* Sidebar Toggle / Header */}
            <div className="h-24 flex items-center justify-center relative z-10 border-b border-white/5">
                <button
                    onClick={() => navigate('/home')}
                    className="flex items-center gap-3 group outline-none"
                >
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform duration-500 group-hover:scale-110 group-active:scale-95"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <span className="material-icons-round text-2xl">precision_manufacturing</span>
                    </div>
                    <div className={`overflow-hidden transition-all duration-500 ${!isCollapsed ? 'w-32 opacity-100 ml-1' : 'w-0 opacity-0'}`}>
                        <span className="text-xl font-extrabold text-white tracking-tight whitespace-nowrap">Nexora</span>
                    </div>
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-10 px-3 space-y-4 relative z-10 overflow-y-auto overflow-x-hidden">
                {links.map((link) => (
                    <NavLink
                        key={link.path}
                        to={link.path}
                        onClick={() => !isCollapsed && toggleCollapsed()}
                        className={({ isActive }) => `
                            w-full flex items-center gap-5 px-4 py-3.5 rounded-2xl transition-all duration-300 relative group
                            ${isActive ? 'bg-white/10 text-white shadow-lg shadow-black/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}
                        `}
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <div className="absolute left-[-12px] w-1.5 h-6 rounded-full transition-all duration-500" style={{ backgroundColor: primaryColor }}></div>
                                )}
                                <Tooltip text={link.label} position="right" disabled={!isCollapsed} className="w-full">
                                    <div className="flex items-center gap-5">
                                        <span className={`material-icons-round transition-transform group-hover:scale-110 ${isActive ? 'scale-110' : ''}`} style={{ color: isActive ? primaryColor : 'inherit' }}>
                                            {link.icon}
                                        </span>
                                        <div className={`overflow-hidden transition-all duration-500 whitespace-nowrap ${!isCollapsed ? 'w-40 opacity-100' : 'w-0 opacity-0'}`}>
                                            <span className="text-[11px] font-black uppercase tracking-[0.15em]">{link.label}</span>
                                        </div>
                                    </div>
                                </Tooltip>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 relative z-10">
                <div className={`text-center transition-all duration-500 ${!isCollapsed ? 'opacity-40' : 'opacity-0'}`}>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">v4.2.0</p>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
