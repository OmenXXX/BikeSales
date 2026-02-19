import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getEmployeeByFirebaseId, updateRecord, logoutGlobal, verifySession } from '../api';
import ConflictModal from '../components/auth/ConflictModal';
import { v4 as uuidv4 } from 'uuid';
import { UAParser } from 'ua-parser-js';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Security Helpers: XOR Scrambling
const scramble = (data, key) => {
    if (!data || !key) return data;
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    const keyStr = String(key);
    let result = '';
    for (let i = 0; i < str.length; i++) {
        result += String.fromCharCode(str.charCodeAt(i) ^ keyStr.charCodeAt(i % keyStr.length));
    }
    return window.btoa(result);
};

const descramble = (encoded, key) => {
    if (!encoded || !key) return encoded;
    try {
        const str = window.atob(encoded);
        const keyStr = String(key);
        let result = '';
        for (let i = 0; i < str.length; i++) {
            result += String.fromCharCode(str.charCodeAt(i) ^ keyStr.charCodeAt(i % keyStr.length));
        }
        try { return JSON.parse(result); } catch (e) { return result; }
    } catch (e) { return encoded; }
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showConflictModal, setShowConflictModal] = useState(false);

    // Persistent Device Identity
    const deviceUUID = useRef(null);
    const deviceLabel = useRef(null);
    const syncChannel = useRef(null);

    // Initialize Device Identity (Run once)
    useEffect(() => {
        // 1. Get or Create Device UUID
        let storedUUID = localStorage.getItem('device_uuid');
        if (!storedUUID) {
            storedUUID = uuidv4();
            localStorage.setItem('device_uuid', storedUUID);
        }
        deviceUUID.current = storedUUID;

        // 2. Generate Device Label (e.g., "Chrome on Windows")
        const parser = new UAParser();
        const result = parser.getResult();
        deviceLabel.current = `${result.browser.name} on ${result.os.name}`;

        console.log(`AUTH: Device Initialized: ${deviceLabel.current} (${deviceUUID.current})`);
    }, []);

    const claimSession = async () => {
        if (!currentUser) return;

        console.log("%c AUTH: claimSession() triggered ", "background: #222; color: #34d399");
        try {
            // Guard: Never claim a session if we don't have user data (prevents race during logout)
            const stored = sessionStorage.getItem('LoggedInUserData');
            if (!stored) {
                console.warn("AUTH: claimSession aborted (No user data found)");
                return;
            }

            const fingerprint = uuidv4();
            const sessionString = `${fingerprint}|${new Date().toISOString()}|${deviceLabel.current}`;

            // Update Local State
            sessionStorage.setItem('tabFingerprint', fingerprint);

            // Update Firestore (Mirror)
            await setDoc(doc(db, "sessions", currentUser.uid), {
                fingerprint: fingerprint,
                device: deviceLabel.current,
                deviceUUID: deviceUUID.current,
                lastLogin: serverTimestamp(),
                email: currentUser.email
            });

            // Update FileMaker (Source of Truth)
            if (stored) {
                const lock = sessionStorage.getItem('StorageLock');
                const employee = descramble(stored, lock);
                await updateRecord('Employees', employee.recordId, {
                    SessionKey: sessionString,
                    CurrentlyLoggedInDevice: deviceLabel.current
                });
            }

            setShowConflictModal(false);
            console.log("AUTH: Session claimed successfully.");
        } catch (error) {
            console.error("AUTH: claimSession() FAILED:", error);
        }
    };

    const login = async (email, password) => {
        console.log("%c AUTH: Starting login process... ", "background: #222; color: #bada55");
        try {
            // Set persistence to SESSION (Tab-only) to allow multiple accounts in same browser
            await setPersistence(auth, browserSessionPersistence);

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const scrambled = await getEmployeeByFirebaseId(user.uid);
            // 1. Employee Data is now auto-descrambled by api.js interceptor
            const rawEmployee = scrambled.employee;

            if (rawEmployee.fieldData.Active === "SUSPENDED" || rawEmployee.fieldData.Active === "0") {
                await logout();
                throw { message: "Your account is currently suspended. Please contact your manager." };
            }

            // 2. Minimalist Mapping (Keep only 9 essentials)
            const {
                recordId,
                modId,
                fieldData: {
                    PrimaryKey,
                    FireBaseUserID,
                    Name_First,
                    Name_Last,
                    Role,
                    Active,
                    AccessLevelJSON,
                    EmailAddress
                }
            } = rawEmployee;

            const minimalistUser = {
                recordId,
                modId,
                PrimaryKey,
                FireBaseUserID,
                Name_First,
                Name_Last,
                Role,
                Active,
                AccessLevelJSON,
                EmailAddress
            };

            const fingerprint = uuidv4();
            // FIX: Use deviceUUID for FileMaker SessionKey to match header checks
            const sessionString = `${deviceUUID.current}|${new Date().toISOString()}|${deviceLabel.current}`;

            // 3. Storage Scrambling (using PrimaryKey as lock)
            const storageLock = PrimaryKey;
            const encryptedSessionData = scramble(minimalistUser, storageLock);

            sessionStorage.setItem('tabFingerprint', fingerprint);
            sessionStorage.setItem('LoggedInUserData', encryptedSessionData);
            sessionStorage.setItem('StorageLock', storageLock); // Needed to decrypt on refresh

            // 4. Update Remote States
            await setDoc(doc(db, "sessions", user.uid), {
                fingerprint: fingerprint,
                device: deviceLabel.current,
                deviceUUID: deviceUUID.current,
                lastLogin: serverTimestamp(),
                email: user.email
            });

            await updateRecord('Employees', recordId, {
                SessionKey: sessionString,
                CurrentlyLoggedInDevice: deviceLabel.current
            });

            setUserData(minimalistUser);
            return minimalistUser;
        } catch (error) {
            console.error("AUTH: Login failed", error);
            throw error;
        }
    };

    const logout = async (global = false) => {
        console.log(`%c AUTH: logout(global=${global}) triggered`, "background: #222; color: #f87171");

        // 1. Capture State for Cleanup
        const stored = sessionStorage.getItem('LoggedInUserData');
        const lock = sessionStorage.getItem('StorageLock');

        // 2. Immediately Clear Local State (Stop Flickers & UI Races)
        sessionStorage.clear();
        setUserData(null);
        setCurrentUser(null);
        setShowConflictModal(false);

        if (global) {
            console.log("AUTH: Revoking all sessions globally...");
            await logoutGlobal().catch(err => console.warn("Global Logout API failed", err));
        }

        let recordId = null;
        if (stored && lock) {
            try {
                const parsed = descramble(stored, lock);
                recordId = parsed.recordId;
            } catch (e) { /* ignore */ }
        }

        try {
            // 2. Cleanup Remote Source of Truth (Async)
            if (recordId) {
                await updateRecord('Employees', recordId, {
                    SessionKey: "",
                    CurrentlyLoggedInDevice: ""
                }).catch(err => console.warn("FM Logout update failed", err));
            }

            // 3. Final Firebase Signout
            await signOut(auth);
            console.log("AUTH: Firebase Logout Successful");
            window.location.href = '/'; // Force a clean slate
        } catch (error) {
            console.error("AUTH: Logout Error during cleanup", error);
            window.location.href = '/';
        }
    };

    // Heartbeat Sync Channel (Same Browser Auto-Heal)
    useEffect(() => {
        try {
            syncChannel.current = new BroadcastChannel('nexora_session_sync');
            syncChannel.current.onmessage = (event) => {
                const localFingerprint = sessionStorage.getItem('tabFingerprint');
                if (event.data.type === 'PING' && localFingerprint) {
                    syncChannel.current.postMessage({ type: 'PONG', fingerprint: localFingerprint });
                }
            };
        } catch (e) {
            console.warn("AUTH-SYNC: BroadcastChannel failed", e);
        }
        return () => {
            if (syncChannel.current) syncChannel.current.close();
        };
    }, []);

    // Session Enforcement Monitor
    useEffect(() => {
        let unsubscribeDoc = null;
        let isCheckingHeartbeat = false;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            // Check for Identity Shift
            const storedData = sessionStorage.getItem('LoggedInUserData');
            const storageLock = sessionStorage.getItem('StorageLock');

            if (storedData && storageLock) {
                try {
                    const parsed = descramble(storedData, storageLock);
                    setUserData(parsed);
                    const localUid = parsed.FireBaseUserID;

                    if (user && localUid && user.uid !== localUid) {
                        console.warn("AUTH: Identity shift detected. Account changed in another tab. Reloading...");
                        sessionStorage.clear();
                        window.location.href = '/';
                        return;
                    }
                    if (!user && localUid) {
                        console.log("AUTH: Global logout detected. Cleaning up this tab.");
                        sessionStorage.clear();
                        window.location.href = '/';
                        return;
                    }
                } catch (e) { console.error("Identity check error", e); }
            } else {
                setUserData(null);
            }

            setCurrentUser(user);
            setLoading(false);

            if (unsubscribeDoc) {
                unsubscribeDoc();
                unsubscribeDoc = null;
            }

            if (user) {
                unsubscribeDoc = onSnapshot(doc(db, "sessions", user.uid), (snapshot) => {
                    const data = snapshot.data();
                    const localFingerprint = sessionStorage.getItem('tabFingerprint');
                    const isLoginPage = window.location.pathname === '/';

                    // CONFLICT LOGIC:
                    // 1. If fingerprints match -> All Good.
                    // 2. If mismatch AND Device IDs match -> Heartbeat Check (Auto-Heal if alone).
                    // 3. If mismatch AND Device IDs DIFFER -> HARD CONFLICT (Popup).

                    if (data && data.fingerprint !== localFingerprint && !isLoginPage) {

                        const remoteDeviceUUID = data.deviceUUID;
                        const localDeviceUUID = deviceUUID.current;

                        // Case: Different Device -> Immediate Hard Block
                        if (remoteDeviceUUID && remoteDeviceUUID !== localDeviceUUID) {
                            console.warn(`AUTH: Hard Conflict! Remote Device: ${data.device} (${remoteDeviceUUID})`);
                            setShowConflictModal(true);
                            return;
                        }

                        // Case: Same Device -> Try Auto-Heal via Heartbeat
                        if (isCheckingHeartbeat) return;
                        isCheckingHeartbeat = true;
                        let pongs = [];

                        const handlePong = (event) => {
                            if (event.data.type === 'PONG') pongs.push(event.data.fingerprint);
                        };

                        if (syncChannel.current) {
                            syncChannel.current.addEventListener('message', handlePong);
                            syncChannel.current.postMessage({ type: 'PING' });

                            setTimeout(() => {
                                syncChannel.current.removeEventListener('message', handlePong);

                                // Only auto-heal if we STILL have user data (weren't logged out during the 600ms wait)
                                const stillLoggedIn = sessionStorage.getItem('LoggedInUserData');

                                if (pongs.length === 0 && stillLoggedIn) {
                                    console.log("AUTH-SYNC: Auto-healing orphaned session on same device.");
                                    claimSession().finally(() => { isCheckingHeartbeat = false; });
                                } else {
                                    if (stillLoggedIn) setShowConflictModal(true);
                                    isCheckingHeartbeat = false;
                                }
                            }, 600);
                        } else {
                            setShowConflictModal(true);
                            isCheckingHeartbeat = false;
                        }

                    } else {
                        setShowConflictModal(false);
                    }
                });
            } else {
                setShowConflictModal(false);
            }
        });

        return () => {
            if (unsubscribeAuth) unsubscribeAuth();
            if (unsubscribeDoc) unsubscribeDoc();
        };
    }, []);

    // Phase 2: Heartbeat Check (60s)
    useEffect(() => {
        if (!currentUser) return;

        const interval = setInterval(async () => {
            try {
                const result = await verifySession();
                if (result && result.success) {
                    const { sessionId, status } = result.data;
                    const localFingerprint = sessionStorage.getItem('tabFingerprint');

                    // 1. Suspension Check
                    // Use userData (minimalist structure)
                    if (userData?.Active === "SUSPENDED" || userData?.Active === "0") {
                        console.error(`KILLED: Account for ${userData?.Name_First} suspended by Admin; tokens revoked`);
                        await logout();
                        return;
                    }

                    // 2. Session ID Check
                    const remoteUUID = sessionId ? sessionId.split('|')[0] : null;

                    if (remoteUUID && remoteUUID !== localFingerprint) {
                        console.log(`HEARTBEAT_STATUS: Verified session for UID [${currentUser?.uid}]`);
                        setShowConflictModal(true);
                    } else {
                        console.log(`HEARTBEAT_STATUS: Verified session for UID [${currentUser?.uid}]`);
                    }
                }
            } catch (err) {
                console.warn("AUTH-HEARTBEAT: Check failed", err);
            }
        }, 300000); // 5 minutes (TODO: REDUCE_TO_60S_FOR_PROD)

        return () => clearInterval(interval);
    }, [currentUser]);

    const value = useMemo(() => ({
        currentUser,
        userData,
        loading,
        login,
        logout,
        claimSession
    }), [currentUser, userData, loading]);

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
            {showConflictModal && (
                <ConflictModal onLogout={() => logout(true)} onClaim={claimSession} />
            )}
        </AuthContext.Provider>
    );
};
