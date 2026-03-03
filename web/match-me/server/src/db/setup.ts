import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';
import pool from './index';

dotenv.config();

const createDatabase = async () => {
    const dbUrl = process.env.DATABASE_URL || '';
    // Extract database name and base URL
    const dbName = dbUrl.split('/').pop();
    const baseUrl = dbUrl.substring(0, dbUrl.lastIndexOf('/')) + '/postgres';

    const client = new Client({ connectionString: baseUrl });
    try {
        await client.connect();
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`);
        if (res.rowCount === 0) {
            console.log(`Database ${dbName} does not exist. Creating...`);
            await client.query(`CREATE DATABASE ${dbName}`);
            console.log(`Database ${dbName} created.`);
        } else {
            console.log(`Database ${dbName} already exists.`);
        }
    } catch (err) {
        console.error('Error creating database (ignoring if just connection issue):', err);
    } finally {
        await client.end();
    }
};

const setupDatabase = async () => {
    try {
        await createDatabase();

        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Running schema...');
        await pool.query(schemaSql);
        console.log('Database schema setup complete.');
        process.exit(0);
    } catch (err) {
        console.error('Error setting up database:', err);
        process.exit(1);
    }
};

setupDatabase();
