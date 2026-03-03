import axios from 'axios';

const API_URL = 'http://localhost:3000';

const createUser = async () => {
    const email = `test${Math.floor(Math.random() * 10000)}@example.com`;
    const password = 'password123';
    try {
        const res = await axios.post(`${API_URL}/auth/register`, { email, password });
        return { token: res.data.token, userId: res.data.id, email };
    } catch (err: any) {
        console.error("Create User Failed:", err.message);
        throw err;
    }
};

const runTest = async () => {
    try {
        console.log('1. Registering Viewer and Target...');
        const viewer = await createUser();
        const target = await createUser();

        console.log(`Viewer ID: ${viewer.userId}, Target ID: ${target.userId}`);

        // Update profiles to be incompatible (Different locations)
        // Access rules:
        // 1. Connection? No.
        // 2. Recommended? (Same location OR preferred location match).

        // Viewer is in "City A", Target in "City B". No preferences set.
        await axios.put(`${API_URL}/me/profile`, { location: 'City A', first_name: 'Viewer' }, { headers: { Authorization: `Bearer ${viewer.token}` } });
        await axios.put(`${API_URL}/me/profile`, { location: 'City B', first_name: 'Target' }, { headers: { Authorization: `Bearer ${target.token}` } });

        console.log('2. Attempting to access incompatible user profile...');
        // Should return 404 (Not Found) effectively hiding them.
        try {
            await axios.get(`${API_URL}/users/${target.userId}`, {
                headers: { Authorization: `Bearer ${viewer.token}` }
            });
            console.log('❌ FAIL: Access should have been denied but succeeded (200 OK).');
        } catch (err: any) {
            if (err.response) {
                if (err.response.status === 404) {
                    console.log('✅ PASS: Access denied returned 404 Not Found.');
                } else {
                    console.log(`❌ FAIL: Expected 404, got ${err.response.status}`);
                }
            } else {
                console.error("Request Error", err.message);
            }
        }

    } catch (error: any) {
        console.error('Test Failed:', error.response?.data || error.message);
    }
};

runTest();
