// Auth emulator must be configured before firebase-admin loads (official guidance).
process.env.FIREBASE_AUTH_EMULATOR_HOST =
    process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';

const fs = require('fs');
const path = require('path');
const net = require('net');
const admin = require('firebase-admin');

const PROJECT_ID = 'bikesakes';

function waitForAuthEmulator(host, port, timeoutMs = 20000) {
    const deadline = Date.now() + timeoutMs;
    return new Promise((resolve, reject) => {
        const tryOnce = () => {
            const socket = net.connect({ host, port }, () => {
                socket.end();
                resolve();
            });
            socket.on('error', () => {
                socket.destroy();
                if (Date.now() >= deadline) {
                    reject(
                        new Error(
                            `Auth emulator not reachable at ${host}:${port} within ${timeoutMs}ms. ` +
                                'Start emulators first: npm run emulators'
                        )
                    );
                    return;
                }
                setTimeout(tryOnce, 400);
            });
        };
        tryOnce();
    });
}

admin.initializeApp({
    projectId: PROJECT_ID,
});

const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'users.json'), 'utf8'));

async function seedUsers() {
    const [emHost, emPortRaw] = process.env.FIREBASE_AUTH_EMULATOR_HOST.split(':');
    const emPort = parseInt(emPortRaw || '9099', 10) || 9099;
    console.log(
        `[seed] Target: Auth emulator ${emHost}:${emPort}, projectId=${PROJECT_ID} (match this in Emulator UI)`
    );

    await waitForAuthEmulator(emHost, emPort);

    console.log('🚀 Starting Emulator User Seeding...');

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of users) {
        try {
            await admin.auth().createUser({
                uid: user.uid,
                email: user.email,
                password: user.password,
                displayName: user.displayName,
                emailVerified: true,
            });
            console.log(`✅ Created: ${user.email} [${user.uid}]`);
            created++;
        } catch (error) {
            if (error.code === 'auth/uid-already-exists' || error.code === 'auth/email-already-exists') {
                console.log(`ℹ️ Skipping: ${user.email} (Already exists)`);
                skipped++;
            } else {
                console.error(`❌ Error creating ${user.email}:`, error.message);
                failed++;
            }
        }
    }

    console.log(`\n✨ Seeding finished. Created: ${created}, skipped: ${skipped}, failed: ${failed}`);

    if (failed > 0) {
        process.exit(1);
    }
    if (created === 0 && skipped === 0) {
        console.error('[seed] No users were processed. Check users.json and emulator logs.');
        process.exit(1);
    }
    process.exit(0);
}

seedUsers().catch((err) => {
    console.error('[seed] Fatal error:', err.message || err);
    process.exit(1);
});
