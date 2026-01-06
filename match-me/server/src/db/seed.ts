import pool from './index';
import bcrypt from 'bcrypt';

const interestsList = ['Hiking', 'Coding', 'Gaming', 'Cooking', 'Travel', 'Reading', 'Music', 'Art', 'Fitness', 'Movies', 'Sci-Fi', 'Gardening'];
const locations = ['New York', 'London', 'Berlin', 'Paris', 'Tokyo', 'Sydney', 'Toronto', 'Remote', 'Mars', 'Venus'];
const bios = [
    'Loves long walks and coding.',
    'Foodie and tech enthusiast.',
    'Gamer looking for player 2.',
    'Artist seeking inspiration.',
    'Just a regular human person.',
    'Fan of interplanetary travel.',
    'Coffee addict.',
    'Night owl.',
    'Early bird.'
];

const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

const getRandomElement = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
const getRandomSubset = (arr: any[], count: number) => {
    const shuffled = arr.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

const seed = async () => {
    try {
        console.log('Seeding database...');

        await pool.query('TRUNCATE users, profiles, connections, messages, user_photos RESTART IDENTITY CASCADE');

        const passwordHash = await bcrypt.hash('password123', 10);

        const usersToCreate = [];

        for (let i = 0; i < 100; i++) {
            const firstName = getRandomElement(firstNames);
            const lastName = getRandomElement(lastNames);
            const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
            const avatarUrl = `https://i.pravatar.cc/300?u=${email}`;

            usersToCreate.push({
                email,
                passwordHash,
                profile: {
                    first_name: firstName,
                    last_name: lastName,
                    bio: getRandomElement(bios),
                    interests: JSON.stringify(getRandomSubset(interestsList, 3)),
                    location: getRandomElement(locations),
                    gender: Math.random() > 0.5 ? 'Male' : 'Female',
                    avatar_url: avatarUrl
                }
            });
        }

        for (const user of usersToCreate) {
            // 1. Insert User
            const userRes = await pool.query(
                'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
                [user.email, user.passwordHash]
            );
            const userId = userRes.rows[0].id;

            // 2. Insert Profile
            await pool.query(
                `INSERT INTO profiles (user_id, first_name, last_name, bio, interests, location, gender, avatar_url)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    userId,
                    user.profile.first_name,
                    user.profile.last_name,
                    user.profile.bio,
                    user.profile.interests,
                    user.profile.location,
                    user.profile.gender,
                    user.profile.avatar_url
                ]
            );

            // 3. Insert Photos (Main + Extra)
            // Main photo (same as avatar)
            await pool.query(
                'INSERT INTO user_photos (user_id, url, is_main) VALUES ($1, $2, $3)',
                [userId, user.profile.avatar_url, true]
            );

            // Add 1-2 random extra photos
            const extraPhotosCount = Math.floor(Math.random() * 3); // 0, 1, or 2
            for (let j = 0; j < extraPhotosCount; j++) {
                const extraUrl = `https://picsum.photos/300/300?random=${userId}${j}`;
                await pool.query(
                    'INSERT INTO user_photos (user_id, url, is_main) VALUES ($1, $2, $3)',
                    [userId, extraUrl, false]
                );
            }
        }

        console.log('Seeding complete. 100 users created with profiles and photos.');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding database:', err);
        process.exit(1);
    }
};

seed();
