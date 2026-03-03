
import { Client } from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgres://lordsonobire@localhost:5439/match_me'
});

const LOCATIONS = ['New York', 'London', 'Berlin', 'Paris', 'Tokyo', 'San Francisco'];
const INTERESTS = ['Coding', 'Hiking', 'Cooking', 'Travel', 'Art', 'Music', 'Gaming', 'Reading'];
const GENDERS = ['Male', 'Female', 'Non-binary'];

const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Jamie', 'Riley', 'Avery', 'Sam', 'Quinn'];
const LAST_NAMES = ['Smith', 'Jones', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson'];

const AVATAR_URLS = [
    'https://i.pravatar.cc/150?u=1',
    'https://i.pravatar.cc/150?u=2',
    'https://i.pravatar.cc/150?u=3',
    'https://i.pravatar.cc/150?u=4',
    'https://i.pravatar.cc/150?u=5',
    'https://i.pravatar.cc/150?u=6',
    'https://i.pravatar.cc/150?u=7',
    'https://i.pravatar.cc/150?u=8'
];

async function seed() {
    try {
        await client.connect();
        console.log("Connected. Seeding users...");

        // Clear existing (optional, maybe keep for user?)
        // await client.query("DELETE FROM users WHERE email LIKE 'seed_%'");

        const passwordHash = await bcrypt.hash('password123', 10);

        for (let i = 0; i < 105; i++) {
            const email = `seed_user_${i}@matchme.com`;

            // Check if exists
            const check = await client.query("SELECT id FROM users WHERE email = $1", [email]);
            if (check.rows.length > 0) continue;

            const userRes = await client.query(
                "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
                [email, passwordHash]
            );
            const userId = userRes.rows[0].id;

            const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
            const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
            const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
            const gender = GENDERS[Math.floor(Math.random() * GENDERS.length)];

            // Random subset of interests
            const myInterests: string[] = [];
            while (myInterests.length < 3) {
                const interest = INTERESTS[Math.floor(Math.random() * INTERESTS.length)];
                if (!myInterests.includes(interest)) myInterests.push(interest);
            }

            const avatar = AVATAR_URLS[Math.floor(Math.random() * AVATAR_URLS.length)];

            await client.query(
                `INSERT INTO profiles (user_id, first_name, last_name, bio, location, gender, interests, avatar_url)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [userId, firstName, lastName, `Hi, I'm ${firstName}! I love ${myInterests.join(' and ')}.`, location, gender, JSON.stringify(myInterests), avatar]
            );

            console.log(`Created ${firstName} (${location})`);
        }

        console.log("Seeding complete.");
    } catch (err) {
        console.error("Seeding failed:", err);
    } finally {
        await client.end();
    }
}

seed();
