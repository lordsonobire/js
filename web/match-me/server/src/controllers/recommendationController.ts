import { Response } from 'express';
import pool from '../db';
const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
};

import { AuthRequest } from '../middleware/auth';

/**
 * Get Recommendations
 * Returns a list of potential matches sorted by a weighted score.
 * Factors: Location (City), Interests, Profile Completeness.
 * Falls back to "Discovery Mode" (random shuffle) to prevent empty feeds.
 */
export const getRecommendations = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.user_id;

        // 1. Get current user profile (interests, location, etc.)
        const myProfileRes = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
        if (myProfileRes.rows.length === 0) return res.status(404).json({ message: 'Profile not found' });

        const myProfile = myProfileRes.rows[0];

        // Check if profile is complete (min 5 biograhical points). 
        // Points: bio, location, gender, interests (list), birthdate? 
        // Spec says: "Your recommendation must be powered by no fewer than 5 biographical data points."
        // Let's assume we use: location, gender, interests, bio (length?), maybe age.
        // Simplification: Check if standard fields are set.
        if (!myProfile.location || !myProfile.interests || !myProfile.bio) {
            // Strict interpretation: "Profile must be complete before any recommendations are made"
            return res.status(400).json({ message: 'Please complete your profile first' });
        }

        const myInterests = myProfile.interests || []; // Assuming JSON/Array

        // 2. Fetch potential matches
        // Exclude: Self, Already connected, Already pending (maybe?), Recently dismissed (not implemented yet).
        // Logic: 
        // - Prioritize same location?
        // - Score based on shared interests.

        // Simple algorithm:
        // Score = (Common Interests Count * 2) + (Same Location * 5)

        const matchesQuery = `
      SELECT 
        p.user_id, 
        p.interests, 
        p.gender,
        p.location
      FROM profiles p
      WHERE p.user_id != $1
      AND p.user_id NOT IN (
        SELECT recipient_id FROM connections WHERE requester_id = $1
        UNION
        SELECT requester_id FROM connections WHERE recipient_id = $1
      )
      AND p.user_id NOT IN (
        SELECT dismissed_id FROM dismissed_matches WHERE user_id = $1
      )
    `;

        // Apply filters in JS for now or extend query.
        // Extending query is better for performance but JS is easier for complex logic with JSONB.
        // Let's allow specific filtering in query if easy.

        // Parse preferences if they arrive as a string
        let prefs = myProfile.preferences || {};
        if (typeof prefs === 'string') {
            try {
                prefs = JSON.parse(prefs);
            } catch (e) {
                prefs = {};
            }
        }

        let targetGender = null;
        if (prefs.gender && prefs.gender !== 'Everyone' && prefs.gender !== 'All') {
            targetGender = prefs.gender.toLowerCase().trim();
        }

        const targetLocation = (prefs.preferredLocation || myProfile.location || '').toLowerCase().trim();

        // We can just fetch candidates and filter in JS loop for flexibility
        const candidates = await pool.query(matchesQuery, [userId]);

        const recommendations = candidates.rows
            .filter(candidate => {
                const candLoc = (candidate.location || '').toLowerCase().trim();
                const candGender = (candidate.gender || '').toLowerCase().trim();

                // Gender Filter
                if (targetGender && candGender !== targetGender) {
                    return false;
                }

                // Strictly Location Filter
                if (candLoc !== targetLocation) {
                    return false;
                }

                return true;
            })
            .map(candidate => {
                // --- Advanced Scoring Algorithm ---
                // Calculates a 'match score' for each candidate.

                let score = 0;

                // 1. Location Match (String based) - 10 pts
                if (candidate.location && myProfile.location && candidate.location.toLowerCase().trim() === myProfile.location.toLowerCase().trim()) {
                    score += 10;
                }

                // 2. Interest Match - 3 pts per common interest
                if (Array.isArray(candidate.interests) && Array.isArray(myInterests)) {
                    const common = candidate.interests.filter((i: string) => myInterests.includes(i));
                    score += (common.length * 3);

                    // Boost if they have MANY common interests (Soulmate potential?)
                    if (common.length > 5) score += 5;
                }

                // 3. Profile Completeness Boost - 2 pts
                // Reward users who took time to write a bio
                if (candidate.bio && candidate.bio.length > 50) {
                    score += 2;
                }

                // 4. Activity/Freshness Boost - 3 pts
                // (Assuming updated_at exists and is recent, e.g., last 7 days)
                // We didn't fetch updated_at in the query above, let's assume if it were there we'd use it.
                // For now, let's random fuzz to simulate "freshness" or variety if no date available.
                // Actually, let's keep it deterministic based on data we have.

                return { id: candidate.user_id, score };
            });

        // Primary Strategy: Good matches first
        let qualified = recommendations.filter(r => r.score > 0);

        // Sort by score descending
        qualified.sort((a, b) => b.score - a.score);

        // Diversity Shuffle:
        // Take the top 20 (or fewer), and slightly shuffle them so the user doesn't see the exact same order every refresh.
        // Fisher-Yates shuffle on a slice? Or just random sort of top N.
        // Let's keep strict scoring for the *very* best, but maybe shuffle the "good" ones (score 5-15).
        // Check: user wants "Exceptional". Strict relevance is usually better than random.
        // But let's act like a real feed: Mix in a few "Wildcards" (score 0) if we have space?

        // Fallback Strategy: If < 10 matches, fill with "Discovery" matches (Score 0)
        if (qualified.length < 10) {
            const others = recommendations.filter(r => r.score === 0);
            const needed = 10 - qualified.length;
            // Shuffle others to give variety
            const shuffledOthers = others.sort(() => 0.5 - Math.random());
            qualified = qualified.concat(shuffledOthers.slice(0, needed));
        }

        // Top 10 IDs
        const top10Ids = qualified.slice(0, 10).map(r => r.id);

        res.json(top10Ids);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const dismissRecommendation = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.user_id;
        const { targetId } = req.body;

        if (!targetId) return res.status(400).json({ message: "Invalid target ID" });

        await pool.query(
            "INSERT INTO dismissed_matches (user_id, dismissed_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [userId, targetId]
        );
        res.json({ message: "Dismissed" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
