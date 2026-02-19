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

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
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
            const stored = sessionStorage.getItem('LoggedInUserData');
            if (stored) {
                const employee = JSON.parse(stored);
                await updateRecord('Employees', employee.recordId, {
                    z_session_id: sessionString,
                    z_device_name: deviceLabel.current
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

            const { employee } = await getEmployeeByFirebaseId(user.uid);

            if (employee.Active !== '1') {
                await signOut(auth);
                throw { message: "Your account is currently suspended. Please contact your manager." };
            }

            const fingerprint = uuidv4();
            // Format: UUID | Timestamp | Label
            const sessionString = `${fingerprint}|${new Date().toISOString()}|${deviceLabel.current}`;

            // 1. Local Storage
            sessionStorage.setItem('tabFingerprint', fingerprint);
            sessionStorage.setItem('LoggedInUserData', JSON.stringify(employee));

            // 2. Firestore Mirror (Fast Check)
            await setDoc(doc(db, "sessions", user.uid), {
                fingerprint: fingerprint, // This is the UUID part we check against
                device: deviceLabel.current,
                deviceUUID: deviceUUID.current,
                lastLogin: serverTimestamp(),
                email: user.email
            });

            // 3. FileMaker Source of Truth (Secure Check)
            await updateRecord('Employees', employee.recordId, {
                SessionKey: sessionString,
                CurrentlyLoggedInDevice: deviceLabel.current
            });

            return employee;
        } catch (error) {
            console.error("AUTH: Login failed", error);
            throw error;
        }
    };

    const logout = async (global = false) => {
        console.log(`%c AUTH: logout(global=${global}) triggered`, "background: #222; color: #f87171");

        if (global) {
            console.log("AUTH: Revoking all sessions globally...");
            await logoutGlobal().catch(err => console.warn("Global Logout API failed", err));
        }

        const stored = sessionStorage.getItem('LoggedInUserData');
        let recordId = null;
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                recordId = parsed.recordId;
            } catch (e) { /* ignore */ }
        }

        try {
            if (recordId) {
                // Clear FileMaker Session Key
                await updateRecord('Employees', recordId, {
                    z_session_id: "",
                    z_device_name: ""
                }).catch(err => console.warn("FM Logout update failed", err));
            }
            await signOut(auth);
        } catch (error) {
            console.error("AUTH: Logout Error", error);
        } finally {
            sessionStorage.clear();
            setShowConflictModal(false);
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
            if (storedData) {
                try {
                    const parsed = JSON.parse(storedData);
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
                                if (pongs.length === 0) {
                                                                    console.log("AUTH-SYNC: Auto-healing orphaned session on same device.");
                                    claimSession().finally(() => { isCheckingHeartbeat = false; });
                                } else {
                                    setShowConflictModal(true);
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
                    if (status !== '1') {
                        console.warn("AUTH-HEARTBEAT: User Inactive/Suspended! Logging out...");
                        await logout(); // Local logout + redirect
                        alert("Your account is no longer active. Please contact an administrator.");
                        return;
                    }

                    // 2. Session ID Check
                    // Remote SessionKey: UUID|Time|Label
                    const remoteUUID = sessionId ? sessionId.split('|')[0] : null;

                    // Logic: If remote has a UUID, and it doesn't match our local fingerprint
                    if (remoteUUID && remoteUUID !== localFingerprint) {
                        console.warn(`AUTH-HEARTBEAT: Mismatch! Remote [${remoteUUID}] != Local [${localFingerprint}]`);
                        setShowConflictModal(true);
                    }
                }
            } catch (err) {
                console.warn("AUTH-HEARTBEAT: Check failed", err);
            }
        }, 60000); // 60 seconds

        return () => clearInterval(interval);
    }, [currentUser]);

    const value = useMemo(() => ({
        currentUser,
        loading,
        login,
        logout,
        claimSession
    }), [currentUser, loading]);

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
            {showConflictModal && (
                <ConflictModal onLogout={() => logout(true)} onClaim={claimSession} />
            )}
        </AuthContext.Provider>
    );
};
