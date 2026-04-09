import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDyQ6rYl45mVQTM9sWznP3OWMXK9Wv7qU8",
    authDomain: "bikesakes.firebaseapp.com",
    projectId: "bikesakes",
    storageBucket: "bikesakes.firebasestorage.app",
    messagingSenderId: "834760104445",
    appId: "1:834760104445:web:9fab1dd8fa75b57d68e194",
    measurementId: "G-2ZQ7J5DNB9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Connect to local emulators ONLY IF running on localhost
// This ensures that when you go live, it automatically uses the production DB.
if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.includes("192.168.") // Allows local network testing
) {
    console.log("🛠️ LOCAL DEV: Connecting to Firebase Emulators...");
    connectAuthEmulator(auth, "http://127.0.0.1:9099");
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
