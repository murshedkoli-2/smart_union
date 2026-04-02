/**
 * Seed script — creates the initial super_admin user.
 * Run once: npx ts-node --project tsconfig.json scripts/seed.ts
 *
 * Requires .env.local to be present.
 */
import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
import path from 'path'

// Load .env.local before importing modules that need env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// Dynamic imports after env is loaded
async function run() {
  const MONGODB_URI = process.env.MONGODB_URI
  if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI is not set in .env.local')
    process.exit(1)
  }

  const email = process.env.SEED_SUPER_ADMIN_EMAIL
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD
  const name = process.env.SEED_SUPER_ADMIN_NAME

  if (!email || !password || !name) {
    console.error('ERROR: SEED_SUPER_ADMIN_* variables are not set in .env.local')
    process.exit(1)
  }

  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log('Connected.')

  // Import after connection to avoid model registration issues
  const { default: User } = await import('../src/models/User')
  const { hashPassword } = await import('../src/lib/auth/password')

  // Check if secretary already exists
  const existing = await User.findOne({ role: 'secretary' })
  if (existing) {
    console.log(`Secretary already exists: ${existing.email}`)
    await mongoose.disconnect()
    process.exit(0)
  }

  const hashedPassword = await hashPassword(password)

  const superAdmin = await User.create({
    name,
    email,
    password: hashedPassword,
    role: 'secretary',
    permissions: [],
    status: 'active',
  })

  console.log('✓ Secretary created successfully:')
  console.log(`  Name : ${superAdmin.name}`)
  console.log(`  Email: ${superAdmin.email}`)
  console.log(`  Role : ${superAdmin.role}`)
  console.log(`  ID   : ${superAdmin._id}`)
  console.log('')
  console.log('IMPORTANT: Change the password in .env.local after first login!')

  await mongoose.disconnect()
  process.exit(0)
}

run().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
