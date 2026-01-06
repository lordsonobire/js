"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const index_1 = __importDefault(require("./index"));
dotenv_1.default.config();
const createDatabase = async () => {
    const dbUrl = process.env.DATABASE_URL || '';
    // Extract database name and base URL
    const dbName = dbUrl.split('/').pop();
    const baseUrl = dbUrl.substring(0, dbUrl.lastIndexOf('/')) + '/postgres';
    const client = new pg_1.Client({ connectionString: baseUrl });
    try {
        await client.connect();
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`);
        if (res.rowCount === 0) {
            console.log(`Database ${dbName} does not exist. Creating...`);
            await client.query(`CREATE DATABASE ${dbName}`);
            console.log(`Database ${dbName} created.`);
        }
        else {
            console.log(`Database ${dbName} already exists.`);
        }
    }
    catch (err) {
        console.error('Error creating database (ignoring if just connection issue):', err);
    }
    finally {
        await client.end();
    }
};
const setupDatabase = async () => {
    try {
        await createDatabase();
        const schemaPath = path_1.default.join(__dirname, 'schema.sql');
        const schemaSql = fs_1.default.readFileSync(schemaPath, 'utf8');
        console.log('Running schema...');
        await index_1.default.query(schemaSql);
        console.log('Database schema setup complete.');
        process.exit(0);
    }
    catch (err) {
        console.error('Error setting up database:', err);
        process.exit(1);
    }
};
setupDatabase();
