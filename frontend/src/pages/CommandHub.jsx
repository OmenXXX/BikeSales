import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * CommandHub: A standalone premium ERP dashboard page
 * Uses mathematically precise hexagonal mesh layout with Axial (q, r) coordinates.
 */
const CommandHub = () => {
    const navigate = useNavigate();

    // Dynamic HEX_SIZE based on viewport width while maintaining mesh integrity
    const [hexSize, setHexSize] = useState(window.innerWidth < 768 ? 60 : 90);
    const GAP = 12; // Constant spacing variable for pixel-perfect gaps

    useEffect(() => {
        const handleResize = () => setHexSize(window.innerWidth < 768 ? 60 : 90);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Pointy-top axial coordinate dataset for the mesh structure
    const modules = [
        { id: 'dashboard', label: 'System Dashboard', icon: 'dashboard', q: 0, r: 0 },
        { id: 'sales', label: 'Sales', icon: 'shopping_cart', q: 1, r: -1 },
        { id: 'inventory', label: 'Inventory', icon: 'inventory_2', q: 1, r: 0 },
        { id: 'staff', label: 'Staff', icon: 'badge', q: 0, r: 1 },
        { id: 'reports', label: 'Reports', icon: 'insights', q: -1, r: 1 },
        { id: 'admin', label: 'Admin', icon: 'settings_suggest', q: -1, r: 0 },
        { id: 'storage', label: 'Storage', icon: 'warehouse', q: 0, r: -1 },
    ];

    /**
     * calculatePosition - Pointy-top Axial (q, r) conversion
     * x = size * (sqrt(3) * q + sqrt(3)/2 * r)
     * y = size * (3/2 * r)
     */
    const calculatePosition = (q, r, size) => {
        // spacingFactor accounts for the GAP between edges
        const spacingFactor = (Math.sqrt(3) * size + GAP) / Math.sqrt(3);

        const x = spacingFactor * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
        const y = spacingFactor * (3 / 2 * r);

        return { x, y };
    };

    return (
        <div className="min-h-[884px] h-screen bg-[#f8fafc] flex items-center justify-center p-4 overflow-hidden font-display animate-fade-in">
            {/* Centralized Grid Container */}
            <div className="relative w-full h-full flex items-center justify-center">

                {/* Honeycomb Mesh Layout */}
                <div className="relative">
                    {modules.map((m) => {
                        const { x, y } = calculatePosition(m.q, m.r, hexSize);

                        return (
                            <button
                                key={m.id}
                                onClick={() => navigate(m.id === 'dashboard' ? '/dashboard' : `/module/${m.id}`)}
                                className={`
                                    absolute flex items-center justify-center
                                    transition-all duration-700 ease-in-out
                                    hover:scale-110 hover:z-50 active:scale-95 group
                                    shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] hover:shadow-primary/30
                                `}
                                style={{
                                    left: '50%',
                                    top: '50%',
                                    width: `${Math.sqrt(3) * hexSize}px`,
                                    height: `${2 * hexSize}px`,
                                    // Applied pointy-top polygon to match orientation and math logic
                                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                                    background: 'white',
                                }}
                            >
                                {/* Pixel-Perfect Interior Mesh Item */}
                                <div className="w-full h-full flex flex-col items-center justify-center p-4 border-2 border-slate-50 bg-white group-hover:bg-slate-50 transition-colors duration-500">
                                    <div className={`
                                        w-12 h-12 md:w-16 md:h-16 rounded-2xl mb-2
                                        flex items-center justify-center text-white
                                        bg-gradient-to-br from-primary to-indigo-600
                                        shadow-lg shadow-primary/20 group-hover:rotate-6
                                        transition-all duration-500
                                    `}>
                                        <span className="material-icons-round text-2xl md:text-3xl">{m.icon}</span>
                                    </div>
                                    <span className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.2em] text-slate-700 text-center px-2">
                                        {m.label}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CommandHub;
