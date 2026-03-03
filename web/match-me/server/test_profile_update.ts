
import axios from 'axios';
import { Client } from 'pg';

const DB_CONFIG = {
    connectionString: 'postgres://lordsonobire@localhost:5439/match_me'
};

async function runTest() {
    const client = new Client(DB_CONFIG);
    await client.connect();

    try {
        console.log("Cleaning up test user...");
        await client.query("DELETE FROM users WHERE email = 'test_update@example.com'");

        console.log("Creating User...");
        const res = await axios.post('http://localhost:3000/auth/register', {
            email: 'test_update@example.com',
            password: 'password123'
        });
        const token = res.data.token;

        console.log("Setting Initial Profile...");
        await axios.put('http://localhost:3000/me/profile', {
            first_name: 'Original',
            last_name: 'Name',
            bio: 'Old Bio',
            location: 'Old City',
            gender: 'Male',
            interests: ['OldInterest'],
            avatar_url: ''
        }, { headers: { Authorization: `Bearer ${token}` } });

        console.log("Verifying Initial State...");
        const res1 = await axios.get('http://localhost:3000/me', { headers: { Authorization: `Bearer ${token}` } });
        if (res1.data.profile.first_name !== 'Original') throw new Error("Initial setup failed");

        console.log("Updating Profile...");
        await axios.put('http://localhost:3000/me/profile', {
            first_name: 'Updated',
            last_name: 'Name',
            bio: 'New Bio',
            location: 'New City',
            gender: 'Non-binary',
            interests: ['NewInterest', 'Coding'],
            avatar_url: ''
        }, { headers: { Authorization: `Bearer ${token}` } });

        console.log("Verifying Updates...");
        const res2 = await axios.get('http://localhost:3000/me', { headers: { Authorization: `Bearer ${token}` } });
        const p = res2.data.profile;

        if (p.first_name !== 'Updated') throw new Error(`First Name mismatch: ${p.first_name}`);
        if (p.bio !== 'New Bio') throw new Error(`Bio mismatch: ${p.bio}`);
        if (p.location !== 'New City') throw new Error(`Location mismatch: ${p.location}`);

        // Check interests
        let interests = p.interests;
        if (typeof interests === 'string') interests = JSON.parse(interests);
        if (!interests.includes('Coding')) throw new Error("Interests failed to update");

        console.log("PASS: Profile correctly updated.");

    } catch (err: any) {
        console.error("Test Error:", err.message);
        if (err.response) console.error(err.response.data);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runTest();
