"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDB = exports.connectDB = void 0;
const mongodb_1 = require("mongodb");
let client = null;
let dbInstance = null;
const connectDB = async () => {
    // Read this at startup, after dotenv.config() has loaded Backend/.env.
    const mongodbUri = process.env.MONGODB_URI;
    if (!mongodbUri) {
        console.error('MONGODB_URI is not defined in .env! (Please paste it there)');
        process.exit(1);
    }
    try {
        client = new mongodb_1.MongoClient(mongodbUri);
        await client.connect();
        dbInstance = client.db(process.env.MONGODB_DB || undefined);
        await Promise.all([
            dbInstance.collection('users').createIndex({ id: 1 }, { unique: true }),
            dbInstance.collection('users').createIndex({ email: 1 }, { unique: true }),
            dbInstance.collection('subjects').createIndex({ id: 1 }, { unique: true }),
            dbInstance.collection('units').createIndex({ id: 1 }, { unique: true }),
            dbInstance.collection('units').createIndex({ subject_id: 1, unit_number: 1 }),
            dbInstance.collection('topics').createIndex({ id: 1 }, { unique: true }),
            dbInstance.collection('topics').createIndex({ unit_id: 1, position: 1 }),
            dbInstance.collection('content').createIndex({ id: 1 }, { unique: true }),
            dbInstance.collection('content').createIndex({ topic_id: 1 }, { unique: true }),
        ]);
        console.log('Connected to MongoDB successfully');
    }
    catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
const getDB = () => {
    if (!dbInstance) {
        throw new Error('Database not connected. Call connectDB first.');
    }
    return dbInstance;
};
exports.getDB = getDB;
