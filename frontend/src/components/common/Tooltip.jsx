import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

const Tooltip = ({ text, children, position = 'top', className = '', disabled = false }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const targetRef = useRef(null);

    const updateCoords = () => {
        if (!targetRef.current) return;
        const rect = targetRef.current.getBoundingClientRect();
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        let top = 0;
        let left = 0;

        switch (position) {
            case 'top':
                top = rect.top + scrollY - 10;
                left = rect.left + scrollX + rect.width / 2;
                break;
            case 'bottom':
                top = rect.bottom + scrollY + 10;
                left = rect.left + scrollX + rect.width / 2;
                break;
            case 'left':
                top = rect.top + scrollY + rect.height / 2;
                left = rect.left + scrollX - 10;
                break;
            case 'right':
                top = rect.top + scrollY + rect.height / 2;
                left = rect.right + scrollX + 10;
                break;
            default:
                break;
        }

        setCoords({ top, left });
    };

    useEffect(() => {
        if (isVisible) {
            updateCoords();
            window.addEventListener('scroll', updateCoords);
            window.addEventListener('resize', updateCoords);
        }
        return () => {
            window.removeEventListener('scroll', updateCoords);
            window.removeEventListener('resize', updateCoords);
        };
    }, [isVisible]);

    const posClasses = {
        top: '-translate-x-1/2 -translate-y-full mb-2',
        bottom: '-translate-x-1/2 mt-2',
        left: '-translate-x-full -translate-y-1/2 mr-2',
        right: '-translate-y-1/2 ml-2'
    };

    return (
        <div
            ref={targetRef}
            className={`relative inline-block ${className}`}
            onMouseEnter={() => !disabled && setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && ReactDOM.createPortal(
                <div
                    className="fixed z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-200"
                    style={{ top: coords.top, left: coords.left }}
                >
                    <div className={`
                        ${posClasses[position]}
                        bg-slate-900/90 backdrop-blur-md text-white px-4 py-2 rounded-xl shadow-2xl
                        whitespace-nowrap flex flex-col items-center justify-center
                    `}>
                        <span className="text-[10px] font-black uppercase tracking-[0.15em]">{text}</span>
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-xl">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Tooltip;
