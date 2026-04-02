import mongoose from 'mongoose'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not defined in .env.local')
  process.exit(1)
}

async function migrate() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI!)
    console.log('Connected successfully.')

    const db = mongoose.connection.db!

    // 1. Migrate WarishApplications: family_id -> applicant_citizen_id
    console.log('Migrating WarishApplications...')
    const warishResult = await db.collection('warishapplications').updateMany(
      { family_id: { $exists: true } },
      [
        {
          $set: {
            applicant_citizen_id: '$family_id'
          }
        },
        {
          $unset: 'family_id'
        }
      ]
    )
    console.log(`Updated ${warishResult.modifiedCount} WarishApplications.`)

    // 2. Migrate Taxes: family_id -> citizen_id
    console.log('Migrating Taxes...')
    const taxResult = await db.collection('taxes').updateMany(
      { family_id: { $exists: true } },
      [
        {
          $set: {
            citizen_id: '$family_id'
          }
        },
        {
          $unset: 'family_id'
        }
      ]
    )
    console.log(`Updated ${taxResult.modifiedCount} Taxes.`)

    // 3. Migrate ReliefBeneficiaries: family_id -> citizen_id
    console.log('Migrating ReliefBeneficiaries...')
    const reliefResult = await db.collection('reliefbeneficiaries').updateMany(
      { family_id: { $exists: true } },
      [
        {
          $set: {
            citizen_id: '$family_id'
          }
        },
        {
          $unset: 'family_id'
        }
      ]
    )
    console.log(`Updated ${reliefResult.modifiedCount} ReliefBeneficiaries.`)

    // 4. Remove 'age' from heirs in WarishApplications (if any)
    console.log('Removing "age" from heirs in WarishApplications...')
    const heirsResult = await db.collection('warishapplications').updateMany(
      { 'heirs.age': { $exists: true } },
      { $unset: { 'heirs.$[].age': '' } }
    )
    console.log(`Cleaned heirs in ${heirsResult.modifiedCount} WarishApplications.`)

    // 5. Drop families collection (optional safety check)
    const collections = await db.listCollections({ name: 'families' }).toArray()
    if (collections.length > 0) {
      console.log('Dropping families collection...')
      await db.collection('families').drop()
      console.log('Dropped families collection.')
    } else {
      console.log('Families collection not found, skipping drop.')
    }

    console.log('Migration completed successfully.')
  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB.')
  }
}

migrate()
