import axios from 'axios';

const API_URL = 'http://localhost:3000';

const createUser = async () => {
    const email = `test${Math.floor(Math.random() * 10000)}@example.com`;
    const password = 'password123';
    try {
        const res = await axios.post(`${API_URL}/auth/register`, { email, password });
        return { token: res.data.token, userId: res.data.id };
    } catch (err: any) {
        console.error("Create User Failed:", err.message);
        throw err;
    }
};

const runTest = async () => {
    try {
        console.log('1. Registering user...');
        const { token, userId } = await createUser();

        console.log('2. Updating profile with biographical data...');
        const updateRes = await axios.put(
            `${API_URL}/me/profile`,
            {
                first_name: 'Test',
                last_name: 'User',
                bio: 'I am a test user',
                location: 'Test City',
                gender: 'Non-binary',
                interests: JSON.stringify(['Testing', 'Coding'])
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (updateRes.data.id) {
            console.log('✅ PASS: Profile update returns id.');
        } else {
            console.log('❌ FAIL: Profile update missing id.', updateRes.data);
        }

        console.log('3. Fetching Bio Endpoint (GET /users/:id/bio)...');
        const res = await axios.get(`${API_URL}/users/${userId}/bio`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Bio Endpoint Response:', res.data);

        const keys = Object.keys(res.data);
        console.log(`Fields returned: ${keys.join(', ')}`);

        // Spec verification: The user mentioned "The bio endpoint returns biographical data"
        // We verified in code it returns: id, interests, location, gender.
        if (keys.includes('location') && keys.includes('gender') && keys.includes('interests')) {
            console.log('✅ PASS: Bio endpoint returns core biographical data (Location, Gender, Interests).');
        } else {
            console.log('❌ FAIL: Bio endpoint missing expected data.');
        }

    } catch (error: any) {
        console.error('Test Failed:', error.response?.data || error.message);
    }
};

runTest();
