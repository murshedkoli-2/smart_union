/**
 * One-time migration: activate login accounts for citizens approved before
 * approveCitizen started syncing User.status.
 *
 * Background: self-registered citizens get a 'pending' user account.
 * approveCitizen used to flip only Citizen.status to 'approved' and never
 * touched the linked User, so anyone approved before that fix landed is
 * stuck seeing "Your account is pending approval" at login forever.
 *
 * Idempotent: only touches users still stuck on 'pending' whose citizen
 * profile is already 'approved'.
 *
 * Run once after deploying:
 *   npm run backfill-approved-citizen-status
 */
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

  await mongoose.connect(MONGODB_URI)
  console.log('Connected.')

  const citizens = mongoose.connection.db?.collection('citizens')
  const users = mongoose.connection.db?.collection('users')
  if (!citizens || !users) {
    console.error('ERROR: citizens or users collection not found')
    process.exit(1)
  }

  const cursor = citizens.find({
    status: 'approved',
    user_id: { $ne: null },
  })

  let updated = 0
  for await (const citizen of cursor) {
    const result = await users.updateOne(
      { _id: citizen.user_id, status: 'pending' },
      { $set: { status: 'active' } },
    )
    if (result.modifiedCount > 0) updated += 1
  }

  console.log(`Activated ${updated} user account(s) for already-approved citizens.`)
  console.log(updated > 0 ? 'Those citizens can now log in.' : 'Nothing to do.')

  await mongoose.disconnect()
  process.exit(0)
}

run().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
