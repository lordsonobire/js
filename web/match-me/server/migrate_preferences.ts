
import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgres://lordsonobire@localhost:5439/match_me'
});

async function migrate() {
    try {
        await client.connect();
        console.log("Connected. Adding 'preferences' column...");
        await client.query("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;");
        console.log("Migration successful.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await client.end();
    }
}

migrate();
