
import axios from 'axios';
import { Client } from 'pg';

const DB_CONFIG = {
    connectionString: process.env.DATABASE_URL || 'postgres://lordsonobire@localhost:5439/match_me'
};

async function runTest() {
    const client = new Client(DB_CONFIG);
    await client.connect();

    try {
        console.log("Cleaning up test users...");
        await client.query("DELETE FROM users WHERE email LIKE 'test_pref_%'");

        const UNIQUE_INTEREST = 'Targeted_Interest';

        // User A: Male, Seeking Female
        console.log("Creating User A (Male, Seeking Female)...");
        const resA = await axios.post('http://localhost:3000/auth/register', {
            email: 'test_pref_a@example.com',
            password: 'password123'
        });
        const tokenA = resA.data.token;
        const idA = resA.data.id;

        await axios.put('http://localhost:3000/me/profile', {
            first_name: 'Alice', // Ironic name for a Male
            last_name: 'Seeker',
            bio: 'Looking for a match',
            location: 'Preference City',
            gender: 'Male',
            interests: [UNIQUE_INTEREST],
            avatar_url: '',
            preferences: { gender: 'Female' }
        }, { headers: { Authorization: `Bearer ${tokenA}` } });


        // User B: Male (Should be excluded)
        console.log("Creating User B (Male - Poor match)...");
        const resB = await axios.post('http://localhost:3000/auth/register', {
            email: 'test_pref_b@example.com',
            password: 'password123'
        });
        const tokenB = resB.data.token;
        const idB = resB.data.id;

        await axios.put('http://localhost:3000/me/profile', {
            first_name: 'Bob',
            last_name: 'Excluder',
            bio: 'I am a male',
            location: 'Preference City',
            gender: 'Male',
            interests: [UNIQUE_INTEREST],
            avatar_url: ''
        }, { headers: { Authorization: `Bearer ${tokenB}` } });


        // User C: Female (Should be included)
        console.log("Creating User C (Female - Good match)...");
        const resC = await axios.post('http://localhost:3000/auth/register', {
            email: 'test_pref_c@example.com',
            password: 'password123'
        });
        const tokenC = resC.data.token;
        const idC = resC.data.id;

        await axios.put('http://localhost:3000/me/profile', {
            first_name: 'Carol',
            last_name: 'Includer',
            bio: 'I am a female',
            location: 'Preference City',
            gender: 'Female',
            interests: [UNIQUE_INTEREST],
            avatar_url: ''
        }, { headers: { Authorization: `Bearer ${tokenC}` } });


        console.log("Fetching recommendations for User A...");
        const recsResponse = await axios.get('http://localhost:3000/recommendations', {
            headers: { Authorization: `Bearer ${tokenA}` }
        });

        const recs = recsResponse.data;
        console.log(`Received ${recs.length} recommendations`);

        const hasB = recs.some((r: any) => r.id === idB);
        const hasC = recs.some((r: any) => r.id === idC);

        if (hasB) {
            console.error("FAIL: User B (Male) was recommended despite preference for Female!");
            process.exit(1);
        } else {
            console.log("PASS: User B (Male) was correctly excluded.");
        }

        if (!hasC) {
            console.error("FAIL: User C (Female) was NOT recommended!");
            process.exit(1);
        } else {
            console.log("PASS: User C (Female) was recommended.");
        }

    } catch (err: any) {
        console.error("Test Error:", err.message);
        if (err.response) console.error("Response:", err.response.data);
    } finally {
        await client.end();
    }
}

runTest();
