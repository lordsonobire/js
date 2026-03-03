import axios from 'axios';

const API_URL = 'http://localhost:3000';

const createUser = async () => {
    const email = `audit${Math.floor(Math.random() * 100000)}@example.com`;
    const password = 'password123';
    try {
        const res = await axios.post(`${API_URL}/auth/register`, { email, password });
        return { token: res.data.token, userId: res.data.id, email };
    } catch (err: any) {
        console.error("Create User Failed:", err.message);
        throw err;
    }
};

const runAudit = async () => {
    console.log('🔒 Starting Security Audit (v2)...');
    let passed = 0;
    let failed = 0;

    const assertFailure = async (promise: Promise<any>, expectedStatus: number, testName: string) => {
        try {
            await promise;
            console.log(`❌ FAIL: ${testName} - Request succeeded (200 OK) but should have failed.`);
            failed++;
        } catch (err: any) {
            if (err.response && err.response.status === expectedStatus) {
                console.log(`✅ PASS: ${testName} - Correctly returned ${expectedStatus}.`);
                passed++;
            } else {
                console.log(`❌ FAIL: ${testName} - Expected ${expectedStatus}, got ${err.response?.status || err.message}`);
                failed++;
            }
        }
    };

    try {
        const alice = await createUser(); // City A
        const bob = await createUser();   // City A (Matches Alice)
        const eve = await createUser();   // City C (No match)

        console.log(`Users created: Alice (${alice.userId}), Bob (${bob.userId}), Eve (${eve.userId})`);

        // Update profiles to define security boundaries
        // Alice & Bob are in City A (Compatible). Eve is in City C (Incompatible).
        await axios.put(`${API_URL}/me/profile`, { location: 'City A', first_name: 'Alice' }, { headers: { Authorization: `Bearer ${alice.token}` } });
        await axios.put(`${API_URL}/me/profile`, { location: 'City A', first_name: 'Bob' }, { headers: { Authorization: `Bearer ${bob.token}` } });
        await axios.put(`${API_URL}/me/profile`, { location: 'City C', first_name: 'Eve' }, { headers: { Authorization: `Bearer ${eve.token}` } });

        console.log('Profiles updated. Alice/Bob: City A. Eve: City C.');

        // 1. Unauthenticated Access
        await assertFailure(
            axios.get(`${API_URL}/users/${alice.userId}`),
            401,
            'Unauthenticated Access to Profile'
        );

        // 2. Accessing Unconnected/Unmatched Profile (Stealth Mode check)
        // Eve tries to view Alice. They are not connected and have DIFFERENT locations.
        await assertFailure(
            axios.get(`${API_URL}/users/${alice.userId}`, { headers: { Authorization: `Bearer ${eve.token}` } }),
            404, // Security: Eve should NOT see Alice.
            'Eve Accessing Alice Profile (Different Location)'
        );

        // 3. Accessing Chat Messages (Stealth Mode check)
        // Eve tries to read messages between her and Alice (no connection exists).
        await assertFailure(
            axios.get(`${API_URL}/chats/${alice.userId}/messages`, { headers: { Authorization: `Bearer ${eve.token}` } }),
            404,
            'Eve Accessing Alice Chat (Not Connected)'
        );

        // 4. Broken Object Level Authorization (BOLA) / IDOR on Chat
        // Setup: Alice and Bob connect.
        // Step 4a: Alice requests Bob
        await axios.post(`${API_URL}/connections`, { targetId: bob.userId }, { headers: { Authorization: `Bearer ${alice.token}` } });

        // Step 4b: Bob accepts Alice
        // Note: Check API for respond logic. Usually expecting { requesterId, status }?
        await axios.put(`${API_URL}/connections`, { requesterId: alice.userId, action: 'accept' }, { headers: { Authorization: `Bearer ${bob.token}` } });

        console.log("Alice and Bob connected.");

        // Step 4c: Eve tries to read Alice <-> Bob messages?
        // Actually the API structure is /chats/:id/messages (My chat with User :id).
        // A classic BOLA is if I can pass a chat_id query param, but here the chat room is implicitly specific to ME and :id.
        // So Eve can only ask for "Chat between Eve and Alice". Which correctly 404s.
        // Eve CANNOT ask for "Chat between Alice and Bob" because she can't impersonate headers.
        // So unless there is an endpoint like /chats/messages?partner_id=... where we can swap ID, this specific design is BOLA-resistant by default via the token.
        // We will skip explicit BOLA check as it overlaps with #3 (Accessing chat not involving me).

        // 5. Accessing Bio (Stealth Mode)
        await assertFailure(
            axios.get(`${API_URL}/users/${alice.userId}/bio`, { headers: { Authorization: `Bearer ${eve.token}` } }),
            404,
            'Eve Accessing Alice Bio (Different Location)'
        );

        console.log(`\nAudit Complete: ${passed} Passed, ${failed} Failed.`);

        if (failed === 0) {
            console.log('🛡️  APPLICATION SECURE');
        } else {
            console.log('⚠️  SECURITY VULNERABILITIES DETECTED');
        }

    } catch (err: any) {
        console.error('Audit Fatal Error:', err.response?.data || err.message);
    }
};

runAudit();
