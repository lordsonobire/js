
import axios from 'axios';
import { Client } from 'pg';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const DB_CONFIG = {
    connectionString: process.env.DATABASE_URL || 'postgres://lordsonobire@localhost:5439/match_me'
};

async function runTest() {
    const client = new Client(DB_CONFIG);
    await client.connect();

    try {
        console.log("Cleaning up test user...");
        await client.query("DELETE FROM users WHERE email = 'test_avatar@example.com'");

        console.log("Creating Test User...");
        const res = await axios.post('http://localhost:3000/auth/register', {
            email: 'test_avatar@example.com',
            password: 'password123'
        });
        const token = res.data.token;

        // Create a dummy image file
        const dummyImagePath = path.join(__dirname, 'dummy_avatar.png');
        if (!fs.existsSync(dummyImagePath)) {
            // Create a simple text file but name it .png to pass mime check (server checks mimetype, but locally basic check)
            // Actually server uses mimetype from request which depends on client.
            // Let's create a minimal valid PNG or just a file and hope multer accepts it if we spoof header?
            // Middleware checks `file.mimetype.startsWith('image/')`. 
            // FormData usually detects mime from extension.
            fs.writeFileSync(dummyImagePath, Buffer.from('89504E470D0A1A0A0000000D494844520000000100000001010300000025DB56CA00000003504C5445000000A7C41BC00000000A4944415408D76360000000020001E221BC330000000049454E44AE426082', 'hex'));
        }

        console.log("Uploading Avatar...");
        const form = new FormData();
        form.append('first_name', 'Avatar');
        form.append('last_name', 'Tester');
        form.append('bio', 'I have an image');
        form.append('location', 'Image City');
        form.append('gender', 'Male');
        form.append('interests', JSON.stringify(['Images']));
        form.append('avatar', fs.createReadStream(dummyImagePath));

        const uploadRes = await axios.put('http://localhost:3000/me/profile', form, {
            headers: {
                Authorization: `Bearer ${token}`,
                ...form.getHeaders()
            }
        });

        console.log("Upload Response Avatar URL:", uploadRes.data.avatar_url);

        if (!uploadRes.data.avatar_url || !uploadRes.data.avatar_url.includes('/uploads/')) {
            throw new Error("Avatar URL not returned or invalid");
        }

        // Verify it persists
        const getRes = await axios.get('http://localhost:3000/me', {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (getRes.data.profile.avatar_url !== uploadRes.data.avatar_url) {
            throw new Error("Persisted avatar URL does not match uploaded URL");
        }

        console.log("PASS: Avatar uploaded and saved successfully.");

        // Clean up dummy file
        fs.unlinkSync(dummyImagePath);

    } catch (err: any) {
        console.error("Test Error:", err.message);
        if (err.response) console.error("Response:", err.response.data);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runTest();
