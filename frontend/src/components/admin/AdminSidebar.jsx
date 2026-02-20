import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminSidebar = ({
    isSidebarExpanded,
    setIsSidebarExpanded,
    activeView,
    setActiveView,
    primaryColor,
    carbonFiberStyle,
    role
}) => {
    const navigate = useNavigate();
    const { userData } = useAuth();

    const user = userData ? {
        name: `${userData.Name_First} ${userData.Name_Last}`,
        role: userData.Role || "Staff",
        image: userData.ImageUrl || null
    } : {
        name: "Guest User",
        role: "Visitor",
        image: null
    };

    return (
        <div className="w-20 flex-shrink-0 relative z-50 h-full">
            <aside
                onMouseEnter={() => setIsSidebarExpanded(true)}
                onMouseLeave={() => setIsSidebarExpanded(false)}
                className={`
                    absolute top-0 left-0 h-full
                    ${isSidebarExpanded ? 'w-64 shadow-[20px_0_50px_rgba(0,0,0,0.3)]' : 'w-20'} 
                    bg-[#1a1d21] text-white flex flex-col transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                `}
            >
                {/* Carbon Fiber Overlay */}
                <div className="absolute inset-0 pointer-events-none" style={carbonFiberStyle}></div>

                {/* Sidebar Header / Brand */}
                <div className="h-24 flex items-center px-5 gap-3 border-b border-white/5 relative z-10">
                    <button
                        onClick={() => navigate('/home')}
                        className="flex items-center gap-3 group outline-none"
                    >
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-all duration-500 group-hover:scale-110 group-active:scale-95"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <span className="material-icons-round text-2xl">precision_manufacturing</span>
                        </div>
                        <div className={`overflow-hidden transition-all duration-500 ${isSidebarExpanded ? 'w-32 opacity-100 ml-1' : 'w-0 opacity-0'}`}>
                            {/* Synced with Home.jsx Nexora Branding */}
                            <span className="text-xl md:text-2xl font-extrabold text-white tracking-tight whitespace-nowrap">Nexora</span>
                        </div>
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 py-10 px-3 space-y-4 relative z-10">
                    <SidebarLink
                        icon="business"
                        label="Company Details"
                        active={activeView === 'company'}
                        expanded={isSidebarExpanded}
                        onClick={() => { setActiveView('company'); setIsSidebarExpanded(false); }}
                        primaryColor={primaryColor}
                    />
                    <SidebarLink
                        icon="people"
                        label="Employees"
                        active={activeView === 'employees' || activeView === 'detail'}
                        expanded={isSidebarExpanded}
                        onClick={() => { setActiveView('employees'); setIsSidebarExpanded(false); }}
                        primaryColor={primaryColor}
                    />

                    {/* Admin Only: System Structure */}
                    {role === 'Administrator' && (
                        <SidebarLink
                            icon="hub"
                            label="Structure"
                            active={activeView === 'structure'}
                            expanded={isSidebarExpanded}
                            onClick={() => { setActiveView('structure'); setIsSidebarExpanded(false); }}
                            primaryColor={primaryColor}
                        />
                    )}
                </nav>

                <div className="p-4 border-t border-white/5 space-y-4 relative z-10 overflow-hidden">
                    <div className="flex items-center gap-3 px-1">
                        <div className={`w-10 h-10 rounded-full border-2 overflow-hidden bg-slate-800 flex-shrink-0 transition-all duration-500 ${isSidebarExpanded ? 'scale-100' : 'scale-90'} flex items-center justify-center`} style={{ borderColor: `${primaryColor}44` }}>
                            {user.image ? (
                                <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-[10px] font-black text-slate-400">
                                    {user.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </span>
                            )}
                        </div>
                        <div className={`transition-all duration-500 whitespace-nowrap ${isSidebarExpanded ? 'w-32 opacity-100' : 'w-0 opacity-0'}`}>
                            <p className="text-xs font-black truncate">{user.name}</p>
                            <p className="text-[10px] uppercase font-black tracking-widest" style={{ color: primaryColor }}>{user.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setIsSidebarExpanded(false); navigate('/home'); }}
                        className={`
                        flex items-center gap-4 px-3 py-3 text-slate-400 hover:text-white transition-colors duration-300
                        ${isSidebarExpanded ? 'w-full' : 'w-10'}
                    `}
                    >
                        <span className="material-icons-round">logout</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest transition-all duration-500 whitespace-nowrap ${isSidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>Exit Admin</span>
                    </button>
                </div>
            </aside>
        </div>
    );
};

import Tooltip from '../common/Tooltip';

const SidebarLink = ({ icon, label, active, expanded, onClick, primaryColor }) => (
    <Tooltip text={label} position="right" disabled={expanded} className="w-full">
        <button
            onClick={onClick}
            className={`
                w-full flex items-center gap-5 px-4 py-3.5 rounded-2xl transition-all duration-300 relative group
                ${active ? 'bg-white/10 text-white shadow-lg shadow-black/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}
            `}
        >
            {active && (
                <div className="absolute left-[-12px] w-1.5 h-6 rounded-full transition-all duration-500" style={{ backgroundColor: primaryColor }}></div>
            )}
            <span className={`material-icons-round transition-transform group-hover:scale-110 ${active ? 'scale-110' : ''}`} style={{ color: active ? primaryColor : 'inherit' }}>{icon}</span>
            <div className={`overflow-hidden transition-all duration-500 whitespace-nowrap ${expanded ? 'w-40 opacity-100' : 'w-0 opacity-0'}`}>
                <span className="text-[11px] font-black uppercase tracking-[0.15em]">{label}</span>
            </div>
        </button>
    </Tooltip>
);

export default AdminSidebar;
