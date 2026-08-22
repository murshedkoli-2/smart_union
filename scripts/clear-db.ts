import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

/**
 * Refuse to run against anything that looks like a production database.
 *
 * This script drops every collection with no confirmation prompt. The only
 * thing standing between it and total data loss is which MONGODB_URI happened
 * to be in .env.local, so the guards below are the safety mechanism.
 *
 * To wipe a real remote database deliberately, set CONFIRM_DESTRUCTIVE_WIPE
 * to the exact database name.
 */
function assertSafeTarget(uri: string): void {
  const confirmation = process.env.CONFIRM_DESTRUCTIVE_WIPE?.trim()

  if (process.env.NODE_ENV === 'production' && !confirmation) {
    console.error('REFUSED: NODE_ENV=production. This script drops every collection.')
    process.exit(1)
  }

  const dbName = uri.split('/').pop()?.split('?')[0] ?? ''
  const isLocal = /(^|\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/)/.test(uri)

  if (!isLocal && !confirmation) {
    console.error(`REFUSED: "${uri.replace(/\/\/[^@]+@/, '//***@')}" is not a local database.`)
    console.error(`This drops every collection. To proceed, re-run with:`)
    console.error(`  CONFIRM_DESTRUCTIVE_WIPE=${dbName} npm run clear-db`)
    process.exit(1)
  }

  if (confirmation && confirmation !== dbName) {
    console.error(
      `REFUSED: CONFIRM_DESTRUCTIVE_WIPE="${confirmation}" does not match target database "${dbName}".`,
    )
    process.exit(1)
  }

  console.log(`Target database: ${dbName}${isLocal ? ' (local)' : ' (remote — confirmed)'}`)
}

async function run() {
  const MONGODB_URI = process.env.MONGODB_URI
  if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI is not set in .env.local')
    process.exit(1)
  }

  assertSafeTarget(MONGODB_URI)

  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log('Connected.')

  // Drop exactly the collections we want to wipe everything
  const collections = await mongoose.connection.db?.collections()
  if (collections) {
    for (const collection of collections) {
      await collection.drop()
      console.log(`Dropped collection: ${collection.collectionName}`)
    }
  }

  console.log('All data removed successfully.')
  await mongoose.disconnect()
  process.exit(0)
}

run().catch((err) => {
  console.error('Failed to clear database:', err)
  process.exit(1)
})
