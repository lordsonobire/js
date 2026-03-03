
import pool from './index';

const migrate = async () => {
    try {
        console.log('Migrating database...');
        // Add dismissed_matches table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS dismissed_matches (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        dismissed_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, dismissed_id)
      );
    `);

        console.log('Migration complete.');
        process.exit(0);
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    }
};

migrate();
