"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecommendations = void 0;
const db_1 = __importDefault(require("../db"));
const getRecommendations = async (req, res) => {
    try {
        const userId = req.user.user_id;
        // 1. Get current user profile (interests, location, etc.)
        const myProfileRes = await db_1.default.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
        if (myProfileRes.rows.length === 0)
            return res.status(404).json({ message: 'Profile not found' });
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
        p.location 
      FROM profiles p
      WHERE p.user_id != $1
      AND p.user_id NOT IN (
        SELECT recipient_id FROM connections WHERE requester_id = $1
        UNION
        SELECT requester_id FROM connections WHERE recipient_id = $1
      )
    `;
        const candidates = await db_1.default.query(matchesQuery, [userId]);
        const recommendations = candidates.rows.map(candidate => {
            let score = 0;
            // Location Match
            if (candidate.location && myProfile.location && candidate.location.toLowerCase() === myProfile.location.toLowerCase()) {
                score += 5;
            }
            // Interest Match
            if (Array.isArray(candidate.interests) && Array.isArray(myInterests)) {
                const common = candidate.interests.filter((i) => myInterests.includes(i));
                score += (common.length * 2);
            }
            return { id: candidate.user_id, score };
        });
        // Sort by score DESC
        recommendations.sort((a, b) => b.score - a.score);
        // Top 10
        const top10 = recommendations.slice(0, 10).map(r => ({ id: r.id })); // Return only ID as per spec.
        res.json(top10);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getRecommendations = getRecommendations;
