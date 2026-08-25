/**
 * Clears citizen and certificate data, keeping the secretary account and the
 * configuration needed to start issuing again immediately.
 *
 * Everything that references a citizen goes with them — payments, cashbook
 * entries, warish applications, relief lists. Deleting only the citizens would
 * leave those records pointing at IDs that no longer exist, and a receipt or
 * ledger line whose subject cannot be resolved is worse than no record at all.
 *
 * KEPT on purpose:
 *   - the secretary user (the only login that survives)
 *   - certificate templates and system settings — configuration, not citizen data
 *   - audit logs — the trail of who did what, including this wipe
 *   - counters — so receipt and holding numbers continue rather than restart,
 *     which would let a new receipt reuse a number that appears in an audit log
 *
 * Usage:
 *   npm run reset-citizen-data                 # dry run, writes nothing
 *   CONFIRM_DESTRUCTIVE_WIPE=<dbname> npm run reset-citizen-data -- --apply
 *
 * BACK UP THE DATABASE FIRST. There is no undo.
 */
import * as dotenv from 'dotenv'
import path from 'path'
import mongoose from 'mongoose'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const APPLY = process.argv.includes('--apply')

/**
 * Collections emptied completely.
 *
 * Both spellings of several collections are listed: earlier versions of the
 * app used snake_case and Mongoose's default pluralisation at different times,
 * and both sets of documents are still present. Missing one would leave live
 * citizen data behind under a name nobody thinks to look at.
 */
const CLEAR_COMPLETELY = [
  'citizens',
  'certificates',
  'certificate_issuances',
  'official_certificates',
  'trade_licenses',
  'trade_license_issuances',
  'taxes',
  'payments',
  'cashbook',
  'cashbooks',
  'warish_applications',
  'warishapplications',
  'relief_lists',
  'relieflists',
  'relief_beneficiaries',
  'reliefbeneficiaries',
  'village_court_cases',
  'grievances',
  'sms_logs',
]

/** Collections kept, listed so the intent is explicit rather than implied. */
const KEPT = [
  'users (secretary only)',
  'certificate_templates / certificatetemplates',
  'system_settings / systemsettings',
  'relief_programs / reliefprograms (program definitions, not citizen data)',
  'audit_logs / auditlogs',
  'counters',
]

const SECRETARY_ROLE = 'secretary'

function assertSafeTarget(uri: string): string {
  const dbName = uri.split('/').pop()?.split('?')[0] ?? ''
  if (!APPLY) return dbName

  const confirmation = process.env.CONFIRM_DESTRUCTIVE_WIPE?.trim()
  if (!confirmation) {
    console.error(
      'REFUSED: --apply deletes data permanently. Re-run with:\n' +
        `  CONFIRM_DESTRUCTIVE_WIPE=${dbName} npm run reset-citizen-data -- --apply`,
    )
    process.exit(1)
  }
  if (confirmation !== dbName) {
    console.error(
      `REFUSED: CONFIRM_DESTRUCTIVE_WIPE="${confirmation}" does not match target database "${dbName}".`,
    )
    process.exit(1)
  }
  return dbName
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not set in .env.local')

  const dbName = assertSafeTarget(uri)
  await mongoose.connect(uri)
  const db = mongoose.connection.db!

  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name))
  const users = db.collection('users')

  // Non-secretary logins go; their refresh tokens go with them, so a deleted
  // account cannot keep using a session it already holds.
  const doomedUsers = await users.find({ role: { $ne: SECRETARY_ROLE } }).toArray()
  const doomedUserIds = doomedUsers.map((user) => user._id)
  const secretaries = await users.countDocuments({ role: SECRETARY_ROLE })

  if (secretaries === 0) {
    console.error('REFUSED: no secretary account found — this would delete every login.')
    await mongoose.disconnect()
    process.exit(1)
  }

  console.log(`\n${APPLY ? 'APPLYING' : 'DRY RUN'} — target database: ${dbName}\n`)
  console.log('Will empty:')

  let totalDocuments = 0
  for (const name of CLEAR_COMPLETELY) {
    if (!existing.has(name)) continue
    const count = await db.collection(name).countDocuments()
    totalDocuments += count
    if (count > 0) console.log(`  ${name.padEnd(28)} ${String(count).padStart(4)} documents`)
  }

  const tokenCollections = ['refresh_tokens', 'refreshtokens'].filter((name) => existing.has(name))
  let doomedTokens = 0
  for (const name of tokenCollections) {
    doomedTokens += await db.collection(name).countDocuments({ user_id: { $in: doomedUserIds } })
  }

  console.log(`\n  users                        ${String(doomedUsers.length).padStart(4)} non-secretary accounts`)
  for (const user of doomedUsers) console.log(`    - ${user.email} (${user.role})`)
  console.log(`  refresh tokens               ${String(doomedTokens).padStart(4)} belonging to those accounts`)

  console.log(`\nWill keep:`)
  for (const line of KEPT) console.log(`  ${line}`)
  console.log(`  (${secretaries} secretary account${secretaries === 1 ? '' : 's'})`)

  if (!APPLY) {
    console.log(
      `\nTotal to delete: ${totalDocuments + doomedUsers.length + doomedTokens} documents.\n` +
        'Back up the database, then re-run with:\n' +
        `  CONFIRM_DESTRUCTIVE_WIPE=${dbName} npm run reset-citizen-data -- --apply`,
    )
    await mongoose.disconnect()
    return
  }

  for (const name of CLEAR_COMPLETELY) {
    if (!existing.has(name)) continue
    const { deletedCount } = await db.collection(name).deleteMany({})
    if (deletedCount > 0) console.log(`  emptied ${name} (${deletedCount})`)
  }

  for (const name of tokenCollections) {
    const { deletedCount } = await db.collection(name).deleteMany({ user_id: { $in: doomedUserIds } })
    if (deletedCount > 0) console.log(`  removed ${deletedCount} refresh token(s) from ${name}`)
  }

  const { deletedCount: removedUsers } = await users.deleteMany({ role: { $ne: SECRETARY_ROLE } })
  console.log(`  removed ${removedUsers} non-secretary user(s)`)

  console.log(`\nDone. ${await users.countDocuments()} user(s) remain.`)
  await mongoose.disconnect()
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
