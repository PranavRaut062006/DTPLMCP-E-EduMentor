/*
 * One-time, idempotent migration from data/db.json to MongoDB Atlas.
 * Usage: npm run migrate:json
 * The source JSON file is never changed or deleted by this script.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is missing. Paste it into Backend/.env and retry.');
  process.exit(1);
}

const sourcePath = path.resolve(__dirname, '../data/db.json');
const collectionNames = ['users', 'subjects', 'units', 'topics', 'content'];

async function migrate() {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`JSON source file not found: ${sourcePath}`);
  }

  const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || undefined);

    for (const name of collectionNames) {
      const documents = Array.isArray(source[name]) ? source[name] : [];
      if (documents.length === 0) {
        console.log(`${name}: no documents to migrate`);
        continue;
      }

      const operations = documents.map((document) => ({
        updateOne: {
          filter: { id: document.id },
          update: { $set: document },
          upsert: true,
        },
      }));
      const result = await db.collection(name).bulkWrite(operations, { ordered: false });
      const targetCount = await db.collection(name).countDocuments({ id: { $in: documents.map((d) => d.id) } });

      if (targetCount !== documents.length) {
        throw new Error(`${name}: verification failed (${targetCount}/${documents.length} migrated)`);
      }
      console.log(`${name}: verified ${targetCount}/${documents.length} documents (inserted ${result.upsertedCount}, updated ${result.modifiedCount})`);
    }

    console.log('Migration verified. data/db.json has been retained as requested.');
  } finally {
    await client.close();
  }
}

migrate().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
