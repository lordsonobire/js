
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
        await client.query("DELETE FROM users WHERE email = 'test_incomplete@example.com'");

        console.log("Creating New User (Incomplete Profile)...");
        const res = await axios.post('http://localhost:3000/auth/register', {
            email: 'test_incomplete@example.com',
            password: 'password123'
        });
        const token = res.data.token;

        console.log("Attempting to fetch recommendations (Should Fail)...");
        try {
            await axios.get('http://localhost:3000/recommendations', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.error("FAIL: Recommendations were returned for incomplete profile!");
            process.exit(1);
        } catch (err: any) {
            if (err.response && err.response.status === 400) {
                console.log("PASS: Server correctly rejected request with 400 Bad Request.");
            } else {
                console.error("FAIL: Unexpected error:", err.message);
                process.exit(1);
            }
        }

        console.log("Updating Profile (Completing)...");
        await axios.put('http://localhost:3000/me/profile', {
            first_name: 'Incomplete',
            last_name: 'Tester',
            bio: 'Now I have a bio',
            location: 'Test City',
            gender: 'NB',
            interests: ['Testing'],
            avatar_url: 'http://placeholder.com/img.png'
        }, { headers: { Authorization: `Bearer ${token}` } });

        console.log("Attempting to fetch recommendations (Should Succeed)...");
        try {
            // It might return empty list if no matches, but should match 200 OK.
            await axios.get('http://localhost:3000/recommendations', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("PASS: Recommendations fetched successfully after completion.");
        } catch (err: any) {
            console.error("FAIL: Failed to fetch recommendations even after update:", err.message);
            if (err.response) console.error(err.response.data);
            process.exit(1);
        }

    } catch (err: any) {
        console.error("Test Error:", err.message);
    } finally {
        await client.end();
    }
}

runTest();
