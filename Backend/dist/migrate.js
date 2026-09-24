"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const DB_PATH = path_1.default.join(__dirname, '../data/db.json');
async function migrate() {
    const mongodbUri = process.env.MONGODB_URI;
    if (!mongodbUri) {
        console.error('MONGODB_URI not found in .env');
        process.exit(1);
    }
    if (!fs_1.default.existsSync(DB_PATH)) {
        console.log('No local db.json found. Nothing to migrate.');
        process.exit(0);
    }
    const client = new mongodb_1.MongoClient(mongodbUri);
    try {
        await client.connect();
        console.log('Connected to MongoDB Atlas');
        const db = client.db(process.env.MONGODB_DB || undefined);
        const data = JSON.parse(fs_1.default.readFileSync(DB_PATH, 'utf-8'));
        const collections = ['users', 'subjects', 'units', 'topics', 'content'];
        for (const collName of collections) {
            const records = data[collName];
            if (records && records.length > 0) {
                // Clear existing data in case we are running migration multiple times
                await db.collection(collName).deleteMany({});
                await db.collection(collName).insertMany(records);
                console.log(`Migrated ${records.length} records into '${collName}' collection.`);
            }
            else {
                console.log(`No records found for '${collName}' in JSON.`);
            }
        }
        console.log('Migration completed successfully!');
    }
    catch (err) {
        console.error('Migration failed:', err);
    }
    finally {
        await client.close();
    }
}
migrate();
