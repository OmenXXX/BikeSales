import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  setPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { filemaker } from '../services/api';
import { getDeviceUUID } from '../utils/device';
import { v4 as uuidv4 } from 'uuid';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isConflict, setIsConflict] = useState(false);
  const [activeSession, setActiveSession] = useState(null);

  // Heartbeat Channel for Tab Sync
  const sessionChannel = new BroadcastChannel('auth_session_sync');

  const claimSession = async (user, employeeData) => {
    const deviceUUID = getDeviceUUID();
    const tabId = window.name || `tab_${uuidv4().slice(0, 8)}`;
    window.name = tabId;

    const timestamp = new Date().toISOString();
    const sessionKey = `${deviceUUID}|${timestamp}|${tabId}`;

    console.log(`[AUTH] Claiming Session: ${sessionKey}`);

    try {
        // 1. Update FileMaker (Backend handles validation bypass via X-Session-Claim)
        const fmResult = await filemaker.update(
            "Employees", 
            employeeData.recordId, 
            { 
                SessionKey: sessionKey,
                CurrentlyLoggedInDevice: `Web (${tabId})` 
            },
            true // isSessionClaim flag
        );

        if (!fmResult.data.success) {
            throw new Error(fmResult.data.message || "Failed to update FM session");
        }

        // 2. Update Firestore
        const sessionRef = doc(db, 'active_sessions', user.uid);
        await setDoc(sessionRef, {
            uid: user.uid,
            sessionKey: sessionKey,
            lastHeartbeat: timestamp,
            deviceInfo: navigator.userAgent
        });

        setActiveSession(sessionKey);
        setIsConflict(false);
        
        // Notify other tabs
        sessionChannel.postMessage({ type: 'SESSION_CLAIMED', sessionKey, uid: user.uid });

    } catch (err) {
        console.error("[AUTH] Session Claim Failed:", err);
        throw err;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Fetch employee data from FileMaker
          const fmResult = await filemaker.find('Employees', [{ FireBaseUserID: `==${user.uid}` }]);
          
          if (fmResult.data.success && fmResult.data.data.length > 0) {
            const employeeData = fmResult.data.data[0];
            const fieldData = employeeData.fieldData;
            
            // Critical Check: Account Suspension
            if (fieldData.Active === 'SUSPENDED' || fieldData.Active === '0') {
               console.warn("[AUTH] Account is suspended.");
               await firebaseSignOut(auth);
               setCurrentUser(null);
               setUserData(null);
               setLoading(false);
               return;
            }

            const fullUserData = {
              uid: user.uid,
              email: user.email,
              ...fieldData,
              recordId: employeeData.recordId
            };

            setCurrentUser(user);
            setUserData(fullUserData);

            // Session Monitoring
            const sessionRef = doc(db, 'active_sessions', user.uid);
            
            // Initial Check
            const sessionSnap = await getDoc(sessionRef);
            const deviceUUID = getDeviceUUID();

            if (sessionSnap.exists()) {
                const currentSession = sessionSnap.data().sessionKey;
                const activeDevice = currentSession.split('|')[0];

                if (activeDevice !== deviceUUID) {
                    console.warn("[AUTH] Conflict detected: Session active on another device.");
                    setActiveSession(currentSession);
                    setIsConflict(true);
                } else {
                    setActiveSession(currentSession);
                    setIsConflict(false);
                }
            } else {
                // No active session in Firestore, claim it
                await claimSession(user, fullUserData);
            }

            // Real-time listener for remote logouts or session shifts
            const sessionUnsub = onSnapshot(sessionRef, (doc) => {
                if (doc.exists()) {
                    const remoteSession = doc.data().sessionKey;
                    const remoteDevice = remoteSession.split('|')[0];
                    const localDevice = getDeviceUUID();

                    if (remoteDevice !== localDevice) {
                        setActiveSession(remoteSession);
                        setIsConflict(true);
                    } else {
                        setIsConflict(false);
                    }
                }
            });

            return () => sessionUnsub();

          } else {
            console.error('Employee record not found in FileMaker');
            // If no FM record, we can't let them in
            await firebaseSignOut(auth);
          }
        } catch (error) {
          console.error('Error fetching employee data:', error);
          await firebaseSignOut(auth);
        }
      } else {
        setCurrentUser(null);
        setUserData(null);
        setIsConflict(false);
      }
      setLoading(false);
    });

    // Tab Sync Listener
    sessionChannel.onmessage = (event) => {
        if (event.data.type === 'SESSION_CLAIMED' && currentUser?.uid === event.data.uid) {
            console.log("[AUTH] Session claimed in another tab, syncing status.");
            setActiveSession(event.data.sessionKey);
            setIsConflict(false);
        }
    };

    return () => {
        unsubscribe();
        sessionChannel.close();
    };
  }, []);

  const login = async (email, password) => {
    try {
        // Enforce session persistence (only this tab/session)
        await setPersistence(auth, browserSessionPersistence);
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result;
    } catch (error) {
        throw error;
    }
  };

  const logout = async () => {
    try {
      if (currentUser) {
          // Optional: Clear Firestore session on logout
          // await deleteDoc(doc(db, 'active_sessions', currentUser.uid));
      }
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    currentUser,
    userData,
    loading,
    login,
    logout,
    isConflict,
    activeSession,
    claimSession: () => claimSession(currentUser, userData)
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
