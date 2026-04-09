import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header = () => {
    const navigate = useNavigate();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [imageError, setImageError] = useState(false);
    const location = useLocation();

    const pathSegments = location.pathname.split('/');
    const moduleName = pathSegments[pathSegments.length - 1];

    // Formatting title with specific override for partners
    let displayTitle = moduleName ? moduleName.charAt(0).toUpperCase() + moduleName.slice(1) : 'Module View';
    if (moduleName?.toLowerCase() === 'partners') {
        displayTitle = 'BUSINESS PARTNERS';
    } else if (moduleName?.toLowerCase() === 'inventory') {
        displayTitle = 'PRODUCTS';
    } else if (moduleName?.toLowerCase() === 'products') {
        displayTitle = 'PRODUCTS';
    }

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

    const getInitials = (name) => {
        return name ? name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase() : 'U';
    };

    const primaryColor = "#7393B3";

    return (
        <header className="h-24 bg-white border-b border-slate-100 flex items-center justify-between px-6 md:px-10 sticky top-0 z-50 transition-all duration-300 shadow-sm">
            <div className="flex items-center">
                <div className="flex items-center gap-4">
                    {moduleName?.toLowerCase() === 'partners' && (
                        <>
                            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
                                <span className="material-icons-round text-xl">contacts</span>
                            </div>
                            <h1 className="text-xl md:text-2xl font-[1000] tracking-tight text-teal-600">
                                {displayTitle}
                            </h1>
                        </>
                    )}
                    {moduleName?.toLowerCase() === 'sales' && (
                        <>
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 hover:scale-105 transition-transform">
                                <span className="material-icons-round text-2xl">shopping_cart</span>
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-xl md:text-2xl font-[1000] tracking-tighter text-indigo-600 leading-none">
                                    SALES
                                </h1>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
                                    Order Management System
                                </p>
                            </div>
                        </>
                    )}
                    {['inventory', 'products', 'storage'].includes(moduleName?.toLowerCase()) && (
                        <>
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white shadow-xl shadow-violet-500/30 hover:scale-105 transition-transform">
                                <span className="material-icons-round text-2xl">
                                    {moduleName?.toLowerCase() === 'storage' ? 'warehouse' : 'inventory_2'}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-xl md:text-2xl font-[1000] tracking-tighter text-indigo-600 leading-none uppercase">
                                    {moduleName?.toLowerCase() === 'storage' ? 'STORAGE' : 'PRODUCTS'}
                                </h1>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
                                    {moduleName?.toLowerCase() === 'storage' ? 'Inventory Management' : 'Product Management System'}
                                </p>
                            </div>
                        </>
                    )}
                    {!['partners', 'sales', 'inventory', 'products', 'storage'].includes(moduleName?.toLowerCase()) && (
                        <h1 className="text-xl md:text-2xl font-[1000] tracking-tight text-slate-900">
                            {displayTitle}
                        </h1>
                    )}
                </div>
            </div>

            {/* Right: Profile Actions */}
            <div className="flex items-center gap-4">
                <div className="relative">
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center gap-3 outline-none group"
                    >
                        <div className="hidden md:flex flex-col items-end text-right mr-1 transition-all group-hover:mr-2">
                            <span className="text-sm font-extrabold leading-tight text-slate-900 uppercase tracking-tighter">{user.name}</span>
                            <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: primaryColor }}>{user.role}</span>
                        </div>
                        <div className="w-11 h-11 rounded-full bg-slate-100 p-0.5 border-2 border-white shadow-xl transition-transform group-active:scale-90 overflow-hidden flex items-center justify-center">
                            {!imageError && user.image ? (
                                <img
                                    alt="Profile"
                                    className="w-full h-full rounded-full object-cover"
                                    src={user.image}
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <span className="text-sm font-extrabold text-slate-600 tracking-wider">
                                    {getInitials(user.name)}
                                </span>
                            )}
                        </div>
                    </button>

                    {/* Dropdown - Matching Home.jsx style */}
                    {isProfileOpen && (
                        <div className="absolute right-0 mt-4 w-64 bg-white/95 backdrop-blur-xl border border-white/20 rounded-[2rem] shadow-[0_30px_100px_rgba(0,0,0,0.15)] py-4 z-[100] animate-fade-in origin-top-right">
                            <div className="px-6 py-4 border-b border-slate-50">
                                <p className="text-xs font-extra-bold text-slate-900 uppercase tracking-tighter">{user.name}</p>
                                <p className="text-[10px] font-extra-bold uppercase tracking-widest mt-0.5" style={{ color: primaryColor }}>{user.role}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsProfileOpen(false);
                                    sessionStorage.removeItem('LoggedInUserData');
                                    navigate('/');
                                }}
                                className="w-[calc(100%-24px)] mx-3 mt-2 flex items-center gap-4 px-6 py-4 hover:bg-rose-50 rounded-2xl transition-colors text-rose-500"
                            >
                                <span className="material-icons-round text-xl">logout</span>
                                <span className="text-sm font-black uppercase tracking-[0.2em]">Sign Out</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
