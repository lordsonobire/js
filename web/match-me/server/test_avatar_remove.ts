
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
        await client.query("DELETE FROM users WHERE email = 'test_remove_avatar@example.com'");

        console.log("Creating Test User...");
        const res = await axios.post('http://localhost:3000/auth/register', {
            email: 'test_remove_avatar@example.com',
            password: 'password123'
        });
        const token = res.data.token;

        // 1. Upload Avatar
        console.log("Uploading Avatar...");
        const dummyImagePath = path.join(__dirname, 'dummy_remove.png');
        if (!fs.existsSync(dummyImagePath)) {
            fs.writeFileSync(dummyImagePath, Buffer.from('89504E470D0A1A0A0000000D494844520000000100000001010300000025DB56CA00000003504C5445000000A7C41BC00000000A4944415408D76360000000020001E221BC330000000049454E44AE426082', 'hex'));
        }

        const form = new FormData();
        form.append('first_name', 'Remover');
        form.append('last_name', 'Tester');
        form.append('avatar', fs.createReadStream(dummyImagePath));

        const uploadRes = await axios.put('http://localhost:3000/me/profile', form, {
            headers: { Authorization: `Bearer ${token}`, ...form.getHeaders() }
        });

        if (!uploadRes.data.avatar_url) throw new Error("Avatar upload failed");
        console.log("Avatar Set:", uploadRes.data.avatar_url);

        // 2. Remove Avatar (Send empty string)
        console.log("Removing Avatar...");
        const removeForm = new FormData();
        removeForm.append('first_name', 'Remover');
        removeForm.append('last_name', 'Tester');
        removeForm.append('avatar_url', ''); // Empty string to clear

        const removeRes = await axios.put('http://localhost:3000/me/profile', removeForm, {
            headers: { Authorization: `Bearer ${token}`, ...removeForm.getHeaders() }
        });

        console.log("Remove Response Avatar URL:", removeRes.data.avatar_url);

        if (removeRes.data.avatar_url !== '' && removeRes.data.avatar_url !== null) {
            throw new Error(`Avatar was NOT removed. Value: ${removeRes.data.avatar_url}`);
        }

        // Verify Persistence
        const getRes = await axios.get('http://localhost:3000/me', {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (getRes.data.profile.avatar_url) {
            throw new Error("Avatar persisted after removal!");
        }

        console.log("PASS: Avatar removed successfully.");
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
