import { Request, Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../middleware/auth';
// Request already has file property if @types/multer (or express with multer types) is loaded.
// However AuthRequest might not. Let's ensure access.


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

export const getUserById = async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        // Basic info: name and profile picture link
        const profile = await pool.query('SELECT user_id, first_name, last_name, avatar_url FROM profiles WHERE user_id = $1', [userId]);

        if (profile.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Must return "name" as combined first/last or just names? 
        // Spec: "returns the user's name and link to the profile picture."
        // Let's combine for convenience, or return fields. Code: first_name + " " + last_name
        const p = profile.rows[0];
        res.json({
            id: p.user_id,
            name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            avatar_url: p.avatar_url
        });
    } catch (err) {
        console.error(err);
        // If invalid ID syntax (like non-int), pg throws error. Handle gracefully?
        res.status(404).json({ message: 'User not found' });
    }
};

export const getUserProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        // Spec: "returns the users 'about me' type information"
        const profile = await pool.query('SELECT user_id, bio FROM profiles WHERE user_id = $1', [userId]);

        if (profile.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ id: profile.rows[0].user_id, bio: profile.rows[0].bio });
    } catch (err) {
        res.status(404).json({ message: 'User not found' });
    }
};

export const getUserBio = async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        // Spec: "returns the users biographical data (the data used to power recommendations)."
        const profile = await pool.query('SELECT user_id, interests, location, gender FROM profiles WHERE user_id = $1', [userId]);

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
        let { first_name, last_name, bio, gender, location, interests, avatar_url } = req.body;

        // If file uploaded, use its path
        if (req.file) {
            const port = process.env.PORT || 3000;
            avatar_url = `http://localhost:${port}/uploads/${req.file.filename}`;
        }

        // Handle interests parsing for FormData
        let interestsToSave = interests;
        if (typeof interests === 'string') {
            try {
                interestsToSave = JSON.parse(interests);
            } catch (e) {
                // If not valid JSON, treat as raw string or ignore
            }
        }

        const q = `
      UPDATE profiles 
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          bio = COALESCE($3, bio),
          gender = COALESCE($4, gender),
          location = COALESCE($5, location),
          interests = COALESCE($6, interests),
          avatar_url = COALESCE($7, avatar_url),
          updated_at = NOW()
      WHERE user_id = $8
      RETURNING *
    `;

        const result = await pool.query(q, [
            first_name,
            last_name,
            bio,
            gender,
            location,
            interestsToSave ? JSON.stringify(interestsToSave) : null,
            avatar_url,
            userId
        ]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// -- Photo Gallery Controllers --

export const uploadPhotos = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.user_id;
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            return res.status(400).json({ message: "No files uploaded" });
        }

        const port = process.env.PORT || 3000;
        const savedPhotos = [];

        for (const file of files) {
            const url = `http://localhost:${port}/uploads/${file.filename}`;
            const q = "INSERT INTO user_photos (user_id, url) VALUES ($1, $2) RETURNING *";
            const result = await pool.query(q, [userId, url]);
            savedPhotos.push(result.rows[0]);
        }

        res.json(savedPhotos);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getPhotos = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.user_id;
        // Optionally fetch by other user ID via params if public? 
        // For now, "My Photos"

        const q = "SELECT * FROM user_photos WHERE user_id = $1 ORDER BY created_at DESC";
        const result = await pool.query(q, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deletePhoto = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.user_id;
        const photoId = req.params.id;

        const q = "DELETE FROM user_photos WHERE id = $1 AND user_id = $2 RETURNING *";
        const result = await pool.query(q, [photoId, userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Photo not found" });
        }
        res.json({ message: "Photo deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const setMainPhoto = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.user_id;
        const photoId = req.params.id;

        // Verify photo ownership & get URL
        const check = await pool.query("SELECT * FROM user_photos WHERE id = $1 AND user_id = $2", [photoId, userId]);
        if (check.rows.length === 0) return res.status(404).json({ message: "Photo not found" });

        const photoUrl = check.rows[0].url;

        // Transaction ideally
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Reset all is_main for user
            await client.query("UPDATE user_photos SET is_main = false WHERE user_id = $1", [userId]);

            // 2. Set new main
            await client.query("UPDATE user_photos SET is_main = true WHERE id = $1", [photoId]);

            // 3. Update profiles avatar_url
            await client.query("UPDATE profiles SET avatar_url = $1 WHERE user_id = $2", [photoUrl, userId]);

            await client.query('COMMIT');
            res.json({ message: "Main photo updated", avatar_url: photoUrl });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getPublicUserPhotos = async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        // Check if user exists first? Or just return empty array
        const q = "SELECT * FROM user_photos WHERE user_id = $1 ORDER BY is_main DESC, created_at DESC";
        const result = await pool.query(q, [userId]);

        // Return only safe fields if needed, but url/id/is_main seems safe
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
