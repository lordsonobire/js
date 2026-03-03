
import pool from './src/db';

async function check() {
    try {
        const users = await pool.query('SELECT count(*) FROM users');
        const profiles = await pool.query('SELECT location, count(*) FROM profiles GROUP BY location');
        console.log('User count:', users.rows[0].count);
        console.log('Location distribution:', profiles.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
