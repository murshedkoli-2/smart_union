/**
 * One-time migration: drop stale non-sparse indexes from collections.
 *
 * Background: schemas were renamed from camelCase to snake_case.
 * The old indexes were NOT sparse, so multiple null values cause
 * E11000 duplicate key errors during document creation.
 *
 * Run once:
 *   npm run fix-indexes
 */
import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const STALE_INDEXES = {
  citizens: [
    'citizens_birthCertificateNo_key',
    'citizens_nidNo_key',
    'citizens_passportNo_key',
    'citizens_registrationNo_key',
    'citizens_nid_key',
  ],
  payments: [
    'payments_receiptNo_key', // Old camelCase, now using receipt_no
  ],
  cashbooks: [
    'cashbooks_entryNo_key', // Old camelCase, now using entry_no
  ],
}

async function run() {
  const MONGODB_URI = process.env.MONGODB_URI
  if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI is not set in .env.local')
    process.exit(1)
  }

  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')

  const db = mongoose.connection.db!

  for (const [collectionName, indexNames] of Object.entries(STALE_INDEXES)) {
    console.log(`\nChecking collection: ${collectionName}`)
    const collection = db.collection(collectionName)
    const existingIndexes = await collection.indexes()
    const existingNames = existingIndexes.map((idx) => idx.name as string)

    for (const indexName of indexNames) {
      if (existingNames.includes(indexName)) {
        await collection.dropIndex(indexName)
        console.log(`✓ Dropped stale index: ${indexName}`)
      } else {
        console.log(`- Index not found (already clean): ${indexName}`)
      }
    }
  }

  await mongoose.disconnect()
  console.log('Done.')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
