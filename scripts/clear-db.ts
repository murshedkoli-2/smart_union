import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function run() {
  const MONGODB_URI = process.env.MONGODB_URI
  if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI is not set in .env.local')
    process.exit(1)
  }

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
