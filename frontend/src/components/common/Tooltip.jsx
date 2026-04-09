import React, { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Premium Tooltip Component - Portal Based
 * Renders into document.body to avoid clipping by overflow: hidden/auto containers
 */
const Tooltip = ({ children, text, position = 'top', disabled = false, className = "", fullWidth = false }) => {
    const [show, setShow] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });
    const triggerRef = useRef(null);

    useLayoutEffect(() => {
        if (show && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            // We use fixed positioning patterns, so we just need the rect
            setCoords({
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
            });
        }
    }, [show]);

    const getTooltipStyles = () => {
        const gap = 8;
        let style = { position: 'fixed', zIndex: 9999 };

        switch (position) {
            case 'top':
                style.top = coords.top - gap;
                style.left = coords.left + coords.width / 2;
                style.transform = 'translate(-50%, -100%)';
                break;
            case 'bottom':
                style.top = coords.top + coords.height + gap;
                style.left = coords.left + coords.width / 2;
                style.transform = 'translate(-50%, 0)';
                break;
            case 'left':
                style.top = coords.top + coords.height / 2;
                style.left = coords.left - gap;
                style.transform = 'translate(-100%, -50%)';
                break;
            case 'right':
                style.top = coords.top + coords.height / 2;
                style.left = coords.left + coords.width + gap;
                style.transform = 'translate(0, -50%)';
                break;
            default:
                break;
        }
        return style;
    };

    const arrowClasses = {
        top: 'top-full left-1/2 -translate-x-1/2 border-t-[#1a1d21]',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[#1a1d21]',
        left: 'left-full top-1/2 -translate-y-1/2 border-l-[#1a1d21]',
        right: 'right-full top-1/2 -translate-y-1/2 border-r-[#1a1d21]'
    };

    return (
        <div
            ref={triggerRef}
            className={`${fullWidth ? 'flex' : 'inline-flex'} items-center ${className}`}
            onMouseEnter={() => !disabled && setShow(true)}
            onMouseLeave={() => setShow(false)}
        >
            {children}
            {!disabled && show && createPortal(
                <div
                    style={getTooltipStyles()}
                    className="px-2 py-1 bg-[#1a1d21] text-white text-[9px] font-black uppercase tracking-widest rounded shadow-2xl whitespace-nowrap animate-fade-in pointer-events-none"
                >
                    {text}
                    {/* Arrow */}
                    <div className={`absolute border-4 border-transparent ${arrowClasses[position]}`}></div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Tooltip;
