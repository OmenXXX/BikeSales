const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configure to connect to local Auth emulator
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

admin.initializeApp({
    projectId: "bikesakes" // Must match your .firebaserc / firebase.json
});

const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'users.json'), 'utf8'));

async function seedUsers() {
    console.log("🚀 Starting Emulator User Seeding...");

    for (const user of users) {
        try {
            // Create user with FIXED UID
            await admin.auth().createUser({
                uid: user.uid,
                email: user.email,
                password: user.password,
                displayName: user.displayName,
                emailVerified: true
            });
            console.log(`✅ Created: ${user.email} [${user.uid}]`);
        } catch (error) {
            if (error.code === 'auth/uid-already-exists' || error.code === 'auth/email-already-exists') {
                console.log(`ℹ️ Skipping: ${user.email} (Already exists)`);
            } else {
                console.error(`❌ Error creating ${user.email}:`, error.message);
            }
        }
    }

    console.log("\n✨ Seeding Complete!");
    process.exit(0);
}

seedUsers();
