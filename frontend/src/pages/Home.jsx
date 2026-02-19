import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
    const navigate = useNavigate();

    const { userData } = useAuth(); // START_CHANGE
    // Dynamic HEX_SIZE: smaller for mobile, larger for desktop
    const [hexSize, setHexSize] = useState(window.innerWidth < 768 ? 54 : 95);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const GAP = window.innerWidth < 768 ? 8 : 14;

    const user = userData ? {
        name: `${userData.Name_First} ${userData.Name_Last}`,
        role: userData.Role || "Staff",
        image: userData.ImageUrl || null // Note: ImageUrl might not be in minimalistUser, check AuthContext
    } : {
        name: "Guest User",
        role: "Visitor",
        image: null
    };

    useEffect(() => {
        const handleResize = () => setHexSize(window.innerWidth < 768 ? 55 : 95);
        window.addEventListener('resize', handleResize);
        document.body.classList.remove('dark');
        document.documentElement.classList.remove('dark');

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Module mapping for Desktop (Row/Col) and Mobile (Col/Row)
    const modules = [
        { id: 'storage', label: 'Storage', icon: 'warehouse', dr: 0, dc: 0, mc: 0, mr: 0, colors: 'from-indigo-500 to-purple-600', accent: 'text-indigo-600' },
        { id: 'sales', label: 'Sales', icon: 'shopping_cart', dr: 0, dc: 1, mc: 1, mr: 0, colors: 'from-primary to-indigo-600', accent: 'text-primary' },
        { id: 'admin', label: 'Admin', icon: 'settings_suggest', dr: 1, dc: 0, mc: 0, mr: 1, colors: 'from-slate-600 to-slate-800', accent: 'text-slate-900' },
        { id: 'dashboard', label: 'System Dashboard', icon: 'dashboard', dr: 1, dc: 1, mc: 1, mr: 1, colors: 'from-primary to-indigo-600', accent: 'text-primary' },
        { id: 'inventory', label: 'Inventory', icon: 'inventory_2', dr: 1, dc: 2, mc: 0, mr: 2, colors: 'from-blue-500 to-indigo-500', accent: 'text-blue-600' },
        { id: 'reports', label: 'Reports', icon: 'insights', dr: 2, dc: 0, mc: 1, mr: 2, colors: 'from-rose-500 to-orange-500', accent: 'text-rose-600' },
        { id: 'staff', label: 'Staff', icon: 'badge', dr: 2, dc: 1, mc: 0, mr: 3, colors: 'from-teal-500 to-emerald-500', accent: 'text-teal-600' },
    ];

    const calculatePosition = (size) => {
        const isMobile = window.innerWidth < 768;
        const width = 2.1 * size;
        const height = 2.4 * size;
        const spacingX = width + GAP;
        const spacingY = (height * 0.75) + (GAP * 0.75);

        return modules.map(m => {
            let x, y;
            if (isMobile) {
                // 2-column zigzag vertically
                x = (m.mc - 0.5) * spacingX;
                y = (m.mr + (m.mc === 1 ? 0.5 : 0)) * spacingY - (spacingY * 1.5);
            } else {
                // 3-row horizontal interlocking (similar to SO example logic)
                // Row 0/2 have 2 modules, Row 1 has 3 modules
                const rowOffset = (m.dr === 0 || m.dr === 2) ? 0.5 : 0;
                x = (m.dc + rowOffset - 1) * spacingX;
                y = (m.dr - 1) * spacingY;
            }
            return { ...m, x, y };
        });
    };

    const positionedModules = calculatePosition(hexSize);

    return (
        <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-900 font-display overflow-x-hidden animate-fade-in relative">
            <header className="sticky top-0 z-50 h-24 w-full px-4 md:px-10 flex items-center justify-between">
                {/* Brand */}
                <div className="flex items-center gap-3 min-w-[60px] md:min-w-[200px]">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <span className="material-icons-round text-2xl">precision_manufacturing</span>
                    </div>
                    <span className="text-2xl font-[1000] text-slate-900 tracking-tight hidden md:block">Nexora</span>
                </div>

                {/* Title */}
                <div className="flex flex-col items-center justify-center flex-1 px-4">
                    <h1 className="text-xl md:text-3xl font-[1000] text-slate-900 tracking-tighter text-center leading-tight">
                        Operational <span className="text-primary">Command</span> Hub
                    </h1>
                </div>

                {/* Profile */}
                <div className="flex items-center gap-4 min-w-[60px] md:min-w-[200px] justify-end">
                    <div className="relative">
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="flex items-center gap-2 outline-none group"
                        >
                            <div className="flex flex-col items-end hidden md:flex text-right mr-2 transition-all group-hover:mr-3">
                                <span className="text-sm font-[900] leading-tight text-slate-900 uppercase tracking-tighter">{user.name}</span>
                                <span className="text-[10px] text-primary font-black uppercase tracking-widest">{user.role}</span>
                            </div>
                            <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-white shadow-xl transition-transform group-active:scale-90 bg-slate-100">
                                {user.image ? (
                                    <img alt="Profile" className="w-full h-full object-cover" src={user.image} />
                                ) : (
                                    <span className="text-xs font-black text-slate-400">
                                        {user.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <span className={`material-icons-round text-slate-400 transition-transform duration-500 ${isProfileOpen ? 'rotate-180' : ''}`}>expand_more</span>
                        </button>

                        {/* Dropdown */}
                        {isProfileOpen && (
                            <div className="absolute right-0 mt-5 w-64 bg-white/95 backdrop-blur-xl border border-white/20 rounded-[2rem] shadow-[0_30px_100px_rgba(0,0,0,0.15)] py-4 z-[100] animate-slide-up">
                                <a className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors" href="#">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <span className="material-icons-round text-xl">notifications</span>
                                    </div>
                                    <div>
                                        <span className="text-sm font-black text-slate-800 block">Recent Alerts</span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">3 new messages</span>
                                    </div>
                                </a>
                                <div className="md:hidden px-6 py-4 bg-slate-50/50 mb-2">
                                    <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">{user.name}</p>
                                    <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-0.5">{user.role}</p>
                                </div>
                                <a className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors" href="#">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                        <span className="material-icons-round text-xl">person</span>
                                    </div>
                                    <span className="text-sm font-black text-slate-800">Account Settings</span>
                                </a>
                                <div className="border-t border-slate-100/50 my-2 mx-4"></div>
                                <button
                                    onClick={() => {
                                        setIsProfileOpen(false);
                                        sessionStorage.removeItem('LoggedInUserData');
                                        navigate('/');
                                    }}
                                    className="w-[calc(100%-24px)] mx-3 flex items-center gap-4 px-6 py-4 hover:bg-rose-50 rounded-2xl transition-colors text-rose-500"
                                >
                                    <span className="material-icons-round text-xl">logout</span>
                                    <span className="text-sm font-black uppercase tracking-[0.2em]">Sign Out</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center w-full relative">
                <div className="relative h-[700px] md:h-[850px] w-full flex items-center justify-center">
                    <div className="relative translate-y-[-20px] md:translate-y-[-50px]">
                        {positionedModules.map((m) => {
                            const isCenter = m.id === 'dashboard';

                            return (
                                <button
                                    key={m.id}
                                    onClick={() => {
                                        if (m.id === 'dashboard') navigate('/dashboard');
                                        else if (m.id === 'admin') navigate('/admin');
                                        else navigate(`/module/${m.id}`);
                                    }}
                                    // wrapper container for drop-shadow and positioning
                                    className={`
                                        absolute flex items-center justify-center
                                        transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1)
                                        ${isCenter ? 'z-20' : 'z-10'} group
                                    `}
                                    style={{
                                        left: '50%',
                                        top: '50%',
                                        width: `${2.1 * hexSize}px`,
                                        height: `${2.4 * hexSize}px`,
                                        transform: `translate(calc(-50% + ${m.x}px), calc(-50% + ${m.y}px))`,
                                        filter: 'drop-shadow(0 15px 35px rgba(0,0,0,0.08))'
                                    }}
                                >
                                    {/* The Actual Hexagon Content - HOVER ZOOM HERE */}
                                    <div className={`
                                        w-full h-full flex flex-col items-center justify-center p-6
                                        bg-white border-2 border-slate-50/50
                                        transition-all duration-700 ease-out
                                        group-hover:scale-115 group-hover:z-50 active:scale-95
                                        group-hover:border-primary/30 group-hover:bg-slate-50/50
                                    `}
                                        style={{
                                            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                                        }}>

                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-b from-primary/10 to-transparent transition-opacity duration-700 pointer-events-none"></div>

                                        <div className={`
                                            w-14 h-14 md:w-20 md:h-20 rounded-[1.25rem] md:rounded-[1.5rem] mb-3 md:mb-5
                                            flex items-center justify-center text-white
                                            bg-gradient-to-br ${m.colors}
                                            shadow-xl ${isCenter ? 'shadow-primary/30' : 'shadow-slate-200'}
                                            group-hover:scale-125 transition-all duration-700 ease-out z-10
                                        `}>
                                            <span className="material-icons-round text-3xl md:text-5xl">{m.icon}</span>
                                        </div>
                                        <span className={`
                                            text-[10px] md:text-[13px] font-[1000] uppercase tracking-[0.2em] md:tracking-[0.35em] z-10 text-center px-4
                                            ${isCenter ? 'text-primary' : 'text-slate-800'} 
                                            group-hover:${m.accent} transition-colors duration-500 leading-tight
                                        `}>
                                            {m.label.split(' ').map((word, i) => (
                                                <span key={i} className="block">{word}</span>
                                            ))}
                                        </span>
                                    </div>

                                    {/* Dynamic Primary Shadow on Hover */}
                                    <div
                                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 -z-10 group-hover:scale-115"
                                        style={{
                                            filter: 'drop-shadow(0 40px 100px rgba(80,72,229,0.45))'
                                        }}
                                    >
                                        <div className="w-full h-full bg-primary/5" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}></div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <footer className="mt-auto text-center opacity-40 pb-6 w-full">
                    <p className="text-[10px] md:text-[12px] text-slate-500 font-[1000] uppercase tracking-[0.3em] md:tracking-[0.5em]">Nexora Intelligence Cloud High-Performance Ecosystem • v4.2.0</p>
                </footer>
            </main>
        </div>
    );
};

export default Home;
