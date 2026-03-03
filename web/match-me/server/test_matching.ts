
import axios from 'axios';
import { Client } from 'pg';

const DB_CONFIG = {
    connectionString: 'postgres://lordsonobire@localhost:5439/match_me'
};

/*
Scenario:
User A: New York, [Coding]
User B: London, [Gardening]
Score should be 0.
Expectation: User B should NOT show up in User A's recommendations.
*/

async function runTest() {
    const client = new Client(DB_CONFIG);
    await client.connect();

    try {
        console.log("Cleaning up test users...");
        await client.query("DELETE FROM users WHERE email LIKE 'test_match_%'");

        // Unique attributes to isolate from existing DB noise
        const UNIQUE_LOCATION_A = 'Mars_Colony_X';
        const UNIQUE_INTEREST_A = 'Unobtainium_Mining';
        const UNIQUE_LOCATION_B = 'Venus_Cloud_City';
        const UNIQUE_INTEREST_B = 'Gas_Farming';

        console.log("Creating User A (Target)...");
        const resA = await axios.post('http://localhost:3000/auth/register', {
            email: 'test_match_a@example.com',
            password: 'password123'
        });
        const tokenA = resA.data.token;
        const idA = resA.data.id;

        await axios.put('http://localhost:3000/me/profile', {
            first_name: 'Alice',
            last_name: 'Mars',
            bio: 'Miner',
            location: UNIQUE_LOCATION_A,
            gender: 'Female',
            interests: [UNIQUE_INTEREST_A, 'Coding'],
            avatar_url: ''
        }, { headers: { Authorization: `Bearer ${tokenA}` } });

        console.log("Creating User B (Poor Match)...");
        const resB = await axios.post('http://localhost:3000/auth/register', {
            email: 'test_match_b@example.com',
            password: 'password123'
        });
        const tokenB = resB.data.token;
        const idB = resB.data.id;

        await axios.put('http://localhost:3000/me/profile', {
            first_name: 'Bob',
            last_name: 'Venus',
            bio: 'Farmer',
            location: UNIQUE_LOCATION_B,
            gender: 'Male',
            interests: [UNIQUE_INTEREST_B],
            avatar_url: ''
        }, { headers: { Authorization: `Bearer ${tokenB}` } });

        console.log("Creating User C (Good Match)...");
        const resC = await axios.post('http://localhost:3000/auth/register', {
            email: 'test_match_c@example.com',
            password: 'password123'
        });
        const tokenC = resC.data.token;
        const idC = resC.data.id;

        await axios.put('http://localhost:3000/me/profile', {
            first_name: 'Charlie',
            last_name: 'Mars',
            bio: 'Miner Colleague',
            location: UNIQUE_LOCATION_A, // Match
            gender: 'Male',
            interests: [UNIQUE_INTEREST_A], // Match
            avatar_url: ''
        }, { headers: { Authorization: `Bearer ${tokenC}` } });


        console.log("Fetching recommendations for User A...");
        const recsResponse = await axios.get('http://localhost:3000/recommendations', {
            headers: { Authorization: `Bearer ${tokenA}` }
        });

        const recs = recsResponse.data; // Array of { id }
        console.log(`Received ${recs.length} recommendations`);
        console.log("Recommendations:", recs);

        const hasC = recs.some((r: any) => r.id === idC);
        const hasB = recs.some((r: any) => r.id === idB);

        if (!hasC) {
            console.error("FAIL: Good match (User C) was NOT found!");
        } else {
            console.log("PASS: Good match (User C) found.");
        }

        if (hasB) {
            console.error("FAIL: Poor match (User B) WAS recommended!");
        } else {
            console.log("PASS: Poor match (User B) NOT recommended.");
        }

        if (recs.length > 0) {
            console.log(`PASS: Recommendation count ${recs.length} (filtered poor matches).`);
        }

    } catch (err: any) {
        console.error("Test Error:", err.message);
        if (err.response) console.error("Response:", err.response.data);
    } finally {
        await client.end();
    }
}

runTest();
