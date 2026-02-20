import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import ConflictModal from './ConflictModal';

const ProtectedRoute = ({ children }) => {
    const { user, loading, userData, claimSession, logout } = useAuth();
    const [conflict, setConflict] = useState(false);

    useEffect(() => {
        if (!user) return;

        // Monitor session state in Firestore
        const unsubscribe = onSnapshot(doc(db, 'sessions', user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const sessionData = docSnap.data();
                const currentFingerprint = sessionStorage.getItem('session_fingerprint');

                if (sessionData.fingerprint && sessionData.fingerprint !== currentFingerprint) {
                    setConflict(true);
                } else {
                    setConflict(false);
                }
            }
        });

        return () => unsubscribe();
    }, [user]);

    if (loading) return null;

    if (!user) {
        return <Navigate to="/login" />;
    }

    if (conflict) {
        return (
            <ConflictModal
                onUseHere={() => {
                    claimSession();
                    setConflict(false);
                }}
                onLogout={logout}
            />
        );
    }

    return children;
};

export default ProtectedRoute;
