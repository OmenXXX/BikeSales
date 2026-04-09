import React, { createContext, useContext, useState, useCallback } from 'react';

const StatusContext = createContext();

export const useStatus = () => {
    const context = useContext(StatusContext);
    if (!context) {
        throw new Error('useStatus must be used within a StatusProvider');
    }
    return context;
};

export const StatusProvider = ({ children }) => {
    const [status, setStatus] = useState({
        isOpen: false,
        type: 'success', // 'success', 'error', 'info', 'warning', 'confirm'
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null
    });
    const [timer, setTimer] = useState(null);

    const hideStatus = useCallback(() => {
        setStatus(prev => ({ ...prev, isOpen: false }));
        if (timer) clearTimeout(timer);
    }, [timer]);

    const showStatus = useCallback(({ type = 'success', title, message, onConfirm, duration }) => {
        // Clear any existing timer
        if (timer) clearTimeout(timer);

        setStatus({
            isOpen: true,
            type,
            title: title || (type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Notification'),
            message,
            onConfirm,
            onCancel: null
        });

        // Auto-dismiss for success or if duration provided
        const autoDismiss = duration || (type === 'success' ? 5000 : null);
        if (autoDismiss) {
            const newTimer = setTimeout(() => {
                setStatus(prev => ({ ...prev, isOpen: false }));
            }, autoDismiss);
            setTimer(newTimer);
        }
    }, [timer]);

    const showConfirm = useCallback(({ title, message }) => {
        if (timer) clearTimeout(timer);
        
        return new Promise((resolve) => {
            setStatus({
                isOpen: true,
                type: 'confirm',
                title: title || 'Confirmation Required',
                message,
                onConfirm: () => {
                    hideStatus();
                    resolve(true);
                },
                onCancel: () => {
                    hideStatus();
                    resolve(false);
                }
            });
        });
    }, [timer, hideStatus]);

    return (
        <StatusContext.Provider value={{ ...status, showStatus, showConfirm, hideStatus }}>
            {children}
        </StatusContext.Provider>
    );
};
