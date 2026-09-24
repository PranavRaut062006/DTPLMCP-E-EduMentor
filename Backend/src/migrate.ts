import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = path.join(__dirname, '../data/db.json');

async function migrate() {
  const mongodbUri = process.env.MONGODB_URI;
  if (!mongodbUri) {
    console.error('MONGODB_URI not found in .env');
    process.exit(1);
  }

  if (!fs.existsSync(DB_PATH)) {
    console.log('No local db.json found. Nothing to migrate.');
    process.exit(0);
  }

  const client = new MongoClient(mongodbUri);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');
    const db = client.db(process.env.MONGODB_DB || undefined);

    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

    const collections = ['users', 'subjects', 'units', 'topics', 'content'];

    for (const collName of collections) {
      const records = data[collName];
      if (records && records.length > 0) {
        // Clear existing data in case we are running migration multiple times
        await db.collection(collName).deleteMany({});
        await db.collection(collName).insertMany(records);
        console.log(`Migrated ${records.length} records into '${collName}' collection.`);
      } else {
        console.log(`No records found for '${collName}' in JSON.`);
      }
    }

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.close();
  }
}

migrate();
