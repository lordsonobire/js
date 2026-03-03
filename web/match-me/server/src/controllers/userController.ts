import { Request, Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../middleware/auth'; // We'll need to export AuthRequest from auth middleware or duplicate it

export const getMe = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.user_id;
        const user = await pool.query('SELECT id, email, created_at FROM users WHERE id = $1', [userId]);
        const profile = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);

        if (user.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user: user.rows[0], profile: profile.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Helper to check if user can see profile
const checkAccess = async (viewerId: number, targetId: any) => {
    if (viewerId === Number(targetId)) return true;

    // 1. Check connections (Connected or Pending)
    const conn = await pool.query(
        'SELECT * FROM connections WHERE (requester_id = $1 AND recipient_id = $2) OR (requester_id = $2 AND recipient_id = $1)',
        [viewerId, targetId]
    );
    if (conn.rows.length > 0) return true;

    // 2. Check if recommended (Same location/preferred location + gender match + not dismissed)
    const viewerProfileRes = await pool.query('SELECT location, preferences FROM profiles WHERE user_id = $1', [viewerId]);
    const targetProfileRes = await pool.query('SELECT location, gender FROM profiles WHERE user_id = $1', [targetId]);

    if (viewerProfileRes.rows.length === 0 || targetProfileRes.rows.length === 0) return false;

    const viewer = viewerProfileRes.rows[0];
    const target = targetProfileRes.rows[0];

    // Check if dismissed
    const dismissed = await pool.query('SELECT * FROM dismissed_matches WHERE user_id = $1 AND dismissed_id = $2', [viewerId, targetId]);
    if (dismissed.rows.length > 0) return false;

    // Parse preferences
    let prefs = viewer.preferences || {};
    if (typeof prefs === 'string') {
        try { prefs = JSON.parse(prefs); } catch { prefs = {}; }
    }

    const targetLoc = (prefs.preferredLocation || viewer.location || '').toLowerCase().trim();
    const candLoc = (target.location || '').toLowerCase().trim();

    if (targetLoc !== candLoc) return false;

    // Optional: Gender check? Usually "recommended" implies business matching logic.
    const targetGender = prefs.gender && prefs.gender !== 'Everyone' && prefs.gender !== 'All' ? prefs.gender.toLowerCase().trim() : null;
    const candGender = (target.gender || '').toLowerCase().trim();
    if (targetGender && candGender !== targetGender) return false;

    return true;
};

export const getUserById = async (req: AuthRequest, res: Response) => {
    try {
        const viewerId = req.user.user_id;
        const targetId = req.params.id;

        if (!(await checkAccess(viewerId, targetId))) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Basic info: name and profile picture link
        const profile = await pool.query('SELECT user_id, first_name, last_name, avatar_url FROM profiles WHERE user_id = $1', [targetId]);

        if (profile.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check connection status
        const connRes = await pool.query(
            `SELECT status FROM connections 
             WHERE (requester_id = $1 AND recipient_id = $2) 
                OR (requester_id = $2 AND recipient_id = $1)`,
            [viewerId, targetId]
        );

        let connectionStatus = 'none';
        if (Number(viewerId) === Number(targetId)) {
            connectionStatus = 'self';
        } else if (connRes.rows.length > 0) {
            connectionStatus = connRes.rows[0].status;
        }

        const p = profile.rows[0];
        res.json({
            id: p.user_id,
            name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            avatar_url: p.avatar_url,
            connection_status: connectionStatus
        });
    } catch (err) {
        console.error(err);
        res.status(404).json({ message: 'User not found' });
    }
};

export const getUserProfile = async (req: AuthRequest, res: Response) => {
    try {
        const viewerId = req.user.user_id;
        const targetId = req.params.id;

        if (!(await checkAccess(viewerId, targetId))) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Spec: "returns the users 'about me' type information"
        const profile = await pool.query('SELECT user_id, bio FROM profiles WHERE user_id = $1', [targetId]);

        if (profile.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ id: profile.rows[0].user_id, bio: profile.rows[0].bio });
    } catch (err) {
        res.status(404).json({ message: 'User not found' });
    }
};

export const getUserBio = async (req: AuthRequest, res: Response) => {
    try {
        const viewerId = req.user.user_id;
        const targetId = req.params.id;

        if (!(await checkAccess(viewerId, targetId))) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Spec: "returns the users biographical data (the data used to power recommendations)."
        const profile = await pool.query('SELECT user_id as id, interests, location, gender FROM profiles WHERE user_id = $1', [targetId]);

        if (profile.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(profile.rows[0]);
    } catch (err) {
        res.status(404).json({ message: 'User not found' });
    }
};

export const updateMyProfile = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.user_id;
        let { first_name, last_name, bio, gender, location, interests, preferences, avatar_url } = req.body;

        // Handle file upload
        if (req.file) {
            // Construct full URL (assuming server runs on same host/port)
            // Ideally, use an env var for BASE_URL
            const protocol = req.protocol;
            const host = req.get('host');
            avatar_url = `${protocol}://${host}/uploads/${req.file.filename}`;
        }

        // Handle text fields (multipart/form-data sends everything as strings)
        let interestsData = interests;
        if (typeof interests === 'string') {
            try {
                interestsData = JSON.parse(interests);
            } catch {
                // Ignore parse error
            }
        }

        let preferencesData = preferences;
        if (typeof preferences === 'string') {
            try {
                preferencesData = JSON.parse(preferences);
            } catch {
                // Ignore parse error
            }
        }

        // TODO: Validate inputs?

        const q = `
      UPDATE profiles 
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          bio = COALESCE($3, bio),
          gender = COALESCE($4, gender),
          location = COALESCE($5, location),
          interests = COALESCE($6, interests),
          avatar_url = COALESCE($7, avatar_url),
          preferences = COALESCE($8, preferences),
          updated_at = NOW()
      WHERE user_id = $9
      RETURNING *, user_id as id
    `;

        const result = await pool.query(q, [first_name, last_name, bio, gender, location, JSON.stringify(interestsData), avatar_url, JSON.stringify(preferencesData), userId]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
