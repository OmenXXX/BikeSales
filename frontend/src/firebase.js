import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Your web app's Firebase configuration
// TODO: Replace with your project's config object
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

// Connect to Emulators if running locally
if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    console.log("%c Firebase: Connecting to local emulators...", "color: #fbbf24; font-weight: bold;");
    connectAuthEmulator(auth, "http://127.0.0.1:9099");
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
