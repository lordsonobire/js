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
        console.log('1. Registering user...');
        const { token, userId } = await createUser();

        console.log(`User created with ID: ${userId}`);

        // Update profile slightly so we aren't comparing empty nulls
        await axios.put(
            `${API_URL}/me/profile`,
            {
                first_name: 'Parity',
                last_name: 'Check',
                bio: 'Comparing endpoints',
                location: 'Mirror World'
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );


        console.log('2. Testing /me vs /users/:id ...');
        const meRes = await axios.get(`${API_URL}/me`, { headers: { Authorization: `Bearer ${token}` } });
        const userRes = await axios.get(`${API_URL}/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } });

        if (JSON.stringify(meRes.data) === JSON.stringify(userRes.data)) {
            console.log('✅ /me matches /users/:id');
        } else {
            console.log('❌ MISMATCH: /me vs /users/:id');
            console.log('Me:', meRes.data);
            console.log('User:', userRes.data);
        }

        console.log('3. Testing /me/profile vs /users/:id/profile ...');
        const meProf = await axios.get(`${API_URL}/me/profile`, { headers: { Authorization: `Bearer ${token}` } });
        const userProf = await axios.get(`${API_URL}/users/${userId}/profile`, { headers: { Authorization: `Bearer ${token}` } });

        if (JSON.stringify(meProf.data) === JSON.stringify(userProf.data)) {
            console.log('✅ /me/profile matches /users/:id/profile');
        } else {
            console.log('❌ MISMATCH: /me/profile vs /users/:id/profile');
        }

        console.log('4. Testing /me/bio vs /users/:id/bio ...');
        const meBio = await axios.get(`${API_URL}/me/bio`, { headers: { Authorization: `Bearer ${token}` } });
        const userBio = await axios.get(`${API_URL}/users/${userId}/bio`, { headers: { Authorization: `Bearer ${token}` } });

        if (JSON.stringify(meBio.data) === JSON.stringify(userBio.data)) {
            console.log('✅ /me/bio matches /users/:id/bio');
        } else {
            console.log('❌ MISMATCH: /me/bio vs /users/:id/bio');
        }

    } catch (error: any) {
        console.error('Test Failed:', error.response?.data || error.message);
    }
};

runTest();
