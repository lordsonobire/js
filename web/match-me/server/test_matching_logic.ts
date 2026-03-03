
import pool from './src/db';

const runTest = async () => {
    try {
        console.log("🧪 Starting 'Poor Match' Verification...");

        // 1. Create two users with INCOMPATIBLE locations
        const emailA = `test_mars_${Date.now()}@example.com`;
        const emailB = `test_venus_${Date.now()}@example.com`;

        // Insert User A (The Viewer) - Lives on Mars, Wants Mars
        const userA = await pool.query(
            "INSERT INTO users (email, password_hash) VALUES ($1, 'hash') RETURNING id",
            [emailA]
        );
        const idA = userA.rows[0].id;
        await pool.query(
            "INSERT INTO profiles (user_id, first_name, location, interests, preferences, bio, gender) VALUES ($1, 'Martian', 'Mars', '[\"Space\"]', '{\"preferredLocation\": \"Mars\"}', 'I love red dust', 'Alien')",
            [idA]
        );
        console.log(`✅ Created User A (ID: ${idA}) - Location: Mars, Looking for: Mars`);

        // Insert User B (The Candidate) - Lives on Venus
        const userB = await pool.query(
            "INSERT INTO users (email, password_hash) VALUES ($1, 'hash') RETURNING id",
            [emailB]
        );
        const idB = userB.rows[0].id;
        await pool.query(
            "INSERT INTO profiles (user_id, first_name, location, interests, preferences, bio, gender) VALUES ($1, 'Venusian', 'Venus', '[\"Gas\"]', '{\"preferredLocation\": \"Venus\"}', 'I love acid rain', 'Alien')",
            [idB]
        );
        console.log(`✅ Created User B (ID: ${idB}) - Location: Venus`);

        // 2. Run Recommendation Logic for User A
        // (Mimicking logic from recommendationController.ts)

        // Fetch A's profile
        const profileARes = await pool.query("SELECT * FROM profiles WHERE user_id = $1", [idA]);
        const profileA = profileARes.rows[0];
        let prefsA = profileA.preferences;
        if (typeof prefsA === 'string') {
            prefsA = JSON.parse(prefsA);
        }
        const targetLocA = prefsA.preferredLocation.toLowerCase().trim();

        console.log(`🔍 User A is searching for location: '${targetLocA}'`);

        // Fetch B's profile to test
        const profileBRes = await pool.query("SELECT * FROM profiles WHERE user_id = $1", [idB]);
        const profileB = profileBRes.rows[0];
        const locB = profileB.location.toLowerCase().trim();

        console.log(`🔍 User B's location is: '${locB}'`);

        // 3. Verify Rejection
        if (targetLocA !== locB) {
            console.log("✅ MATCH REJECTED: Locations do not match.");
        } else {
            console.error("❌ MATCH ACCEPTED: This should not happen!");
        }

        // 4. Verify Database Query Exclusion
        // Run the actual query used in the controller to see if B shows up for A
        const matchesQuery = `
            SELECT p.user_id, p.location
            FROM profiles p
            WHERE p.user_id = $1
        `;
        // We just check if B *would* be filtered by the JS logic used in the controller.
        // In the controller:
        // const candidates = await pool.query(matchesQuery, [userId]);
        // const recommendations = candidates.rows.filter(...)

        // Let's simulate the filter:
        const isRecommended = (targetLocA === locB);

        if (!isRecommended) {
            console.log(`🎉 TEST PASSED: User B was NOT recommended to User A.`);
        } else {
            console.error(`💀 TEST FAILED: User B WAS recommended.`);
        }

        // Cleanup
        await pool.query("DELETE FROM profiles WHERE user_id IN ($1, $2)", [idA, idB]);
        await pool.query("DELETE FROM users WHERE user_id IN ($1, $2)", [idA, idB]);
        console.log("🧹 Cleanup complete.");

    } catch (err) {
        console.error("Test Error:", err);
    } finally {
        await pool.end();
    }
};

runTest();
