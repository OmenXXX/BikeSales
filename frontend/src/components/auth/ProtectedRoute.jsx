import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * ProtectedRoute component handles two levels of security:
 * 1. Firebase Authentication (Is the user logged in?)
 * 2. Session Fingerprinting (Does this specific tab have the valid session key?)
 */
const ProtectedRoute = ({ children }) => {
    const { currentUser, loading } = useAuth();
    const location = useLocation();

    // Check if this tab has a valid fingerprint
    const tabFingerprint = sessionStorage.getItem('tabFingerprint');

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8fafc]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Verifying Security Session...</p>
            </div>
        );
    }

    // 1. Not logged into Firebase? Redirect to Login
    if (!currentUser) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // 2. Logged in but missing Tab Fingerprint?
    // We now let it render! The AuthContext's onSnapshot monitor will detect 
    // the missing fingerprint and show the ConflictModal automatically.
    // This allows the user to see the "Claim Session" UI instead of being redirected.

    return children;
};

export default ProtectedRoute;
