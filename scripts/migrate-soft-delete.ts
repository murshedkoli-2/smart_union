/**
 * One-time migration: move soft deletion from `status: 'deleted'` + mangled
 * unique fields to a `deleted_at` timestamp with partial unique indexes.
 *
 * Deleting a citizen used to append `_del_<timestamp>` to nid_no,
 * birth_cert_no and holding_no — and a certificate to its certificate_no —
 * purely so the value would stop colliding with the plain unique index. That
 * destroyed the real identifier. This script:
 *
 *   1. Backfills `deleted_at: null` on every live document.
 *   2. Converts legacy `status: 'deleted'` rows to `deleted_at`, restoring a
 *      valid status value ('deleted' is no longer in the schema enum).
 *   3. Strips `_del_<digits>` suffixes, restoring the original identifiers.
 *   4. Drops the old plain unique indexes and builds partial ones that apply
 *      to live records only.
 *
 * Idempotent — safe to run more than once.
 *
 * Run once after deploying:
 *   npm run migrate-soft-delete
 */
import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const DEL_SUFFIX = /_del_\d+$/

/** Old plain unique indexes, by collection. Dropped so partial ones can replace them. */
const OLD_UNIQUE_INDEXES: Record<string, string[]> = {
  citizens: ['holding_no_1', 'nid_no_1', 'birth_cert_no_1'],
  certificates: ['certificate_no_1', 'verification_token_1'],
  reliefbeneficiaries: ['relief_list_id_1_citizen_id_1', 'program_id_1_citizen_id_1'],
}

interface NewIndex {
  name: string
  key: Record<string, 1>
  partialFilterExpression: Record<string, unknown>
}

/**
 * The partial replacements.
 *
 * String identifier indexes also carry `$type: 'string'` so records that never
 * had the field stay out of the index — the job the old `sparse: true` did.
 * The relief compound indexes need only the deleted_at clause, because both
 * their keys are always present.
 */
const stringIdIndex = (field: string): NewIndex => ({
  name: `${field}_1`,
  key: { [field]: 1 },
  partialFilterExpression: { [field]: { $type: 'string' }, deleted_at: null },
})

const NEW_INDEXES: Record<string, NewIndex[]> = {
  citizens: [
    stringIdIndex('holding_no'),
    stringIdIndex('nid_no'),
    stringIdIndex('birth_cert_no'),
  ],
  certificates: [stringIdIndex('certificate_no'), stringIdIndex('verification_token')],
  reliefbeneficiaries: [
    {
      name: 'relief_list_id_1_citizen_id_1',
      key: { relief_list_id: 1, citizen_id: 1 },
      partialFilterExpression: { deleted_at: null },
    },
    {
      name: 'program_id_1_citizen_id_1',
      key: { program_id: 1, citizen_id: 1 },
      partialFilterExpression: { deleted_at: null },
    },
  ],
}

type Collection = mongoose.mongo.Collection

async function backfillDeletedAt(collection: Collection): Promise<number> {
  const result = await collection.updateMany(
    { deleted_at: { $exists: false } },
    { $set: { deleted_at: null } },
  )
  return result.modifiedCount
}

async function convertLegacyDeleted(
  collection: Collection,
  restoreStatus: (doc: Record<string, unknown>) => string,
  mangledFields: string[],
): Promise<number> {
  const cursor = collection.find({ status: 'deleted' })
  let converted = 0

  for await (const doc of cursor) {
    const set: Record<string, unknown> = {
      // updatedAt is the closest record of when the deletion happened.
      deleted_at: (doc.updatedAt as Date | undefined) ?? new Date(),
      status: restoreStatus(doc),
    }

    // Restore the real identifiers. Safe against collisions: deleted rows are
    // excluded from the new partial indexes entirely.
    for (const field of mangledFields) {
      const value = doc[field]
      if (typeof value === 'string' && DEL_SUFFIX.test(value)) {
        set[field] = value.replace(DEL_SUFFIX, '')
      }
    }

    await collection.updateOne({ _id: doc._id }, { $set: set })
    converted += 1
  }

  return converted
}

/**
 * Repairs mangled identifiers on rows that were suffixed but whose status was
 * already something other than 'deleted' — belt and braces.
 */
async function repairStrayMangledValues(
  collection: Collection,
  fields: string[],
): Promise<number> {
  let repaired = 0
  for (const field of fields) {
    const cursor = collection.find({ [field]: { $regex: '_del_\\d+$' } })
    for await (const doc of cursor) {
      const value = doc[field]
      if (typeof value !== 'string') continue
      await collection.updateOne(
        { _id: doc._id },
        {
          $set: {
            [field]: value.replace(DEL_SUFFIX, ''),
            deleted_at: (doc.deleted_at as Date | null) ?? (doc.updatedAt as Date) ?? new Date(),
          },
        },
      )
      repaired += 1
    }
  }
  return repaired
}

async function rebuildIndexes(collection: Collection, name: string): Promise<void> {
  const existing = await collection.indexes()

  for (const indexName of OLD_UNIQUE_INDEXES[name] ?? []) {
    const current = existing.find((index) => index.name === indexName)
    // Only drop if it is still the old non-partial index.
    if (current && !current.partialFilterExpression) {
      await collection.dropIndex(indexName)
      console.log(`  dropped stale index ${name}.${indexName}`)
    }
  }

  for (const index of NEW_INDEXES[name] ?? []) {
    const current = (await collection.indexes()).find((i) => i.name === index.name)
    if (current?.partialFilterExpression) continue

    await collection.createIndex(index.key, {
      name: index.name,
      unique: true,
      partialFilterExpression: index.partialFilterExpression,
    })
    console.log(`  created partial unique index ${name}.${index.name}`)
  }
}

async function run() {
  const MONGODB_URI = process.env.MONGODB_URI
  if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI is not set in .env.local')
    process.exit(1)
  }

  await mongoose.connect(MONGODB_URI)
  const db = mongoose.connection.db
  if (!db) {
    console.error('ERROR: no database handle')
    process.exit(1)
  }
  console.log('Connected.\n')

  const citizens = db.collection('citizens')
  const certificates = db.collection('certificates')

  console.log('citizens:')
  console.log(`  backfilled deleted_at on ${await backfillDeletedAt(citizens)} document(s)`)
  console.log(
    `  converted ${await convertLegacyDeleted(
      citizens,
      (doc) => (doc.approved_at ? 'approved' : 'pending'),
      ['nid_no', 'birth_cert_no', 'holding_no'],
    )} legacy deleted record(s)`,
  )
  console.log(
    `  repaired ${await repairStrayMangledValues(citizens, [
      'nid_no',
      'birth_cert_no',
      'holding_no',
    ])} stray mangled value(s)`,
  )
  await rebuildIndexes(citizens, 'citizens')

  console.log('\ncertificates:')
  console.log(`  backfilled deleted_at on ${await backfillDeletedAt(certificates)} document(s)`)
  console.log(
    `  converted ${await convertLegacyDeleted(
      certificates,
      (doc) => (doc.approved_at ? 'approved' : 'draft'),
      ['certificate_no', 'referenceNo', 'certificateNo'],
    )} legacy deleted record(s)`,
  )
  console.log(
    `  repaired ${await repairStrayMangledValues(certificates, [
      'certificate_no',
      'referenceNo',
      'certificateNo',
    ])} stray mangled value(s)`,
  )
  await rebuildIndexes(certificates, 'certificates')

  // Relief beneficiaries used a third pattern: a `deleted: boolean`. No field
  // was ever mangled here, so this only needs the flag converted to a
  // timestamp and the unique indexes made partial — which is what unblocks
  // re-adding a citizen who was previously removed from a list.
  console.log('\nreliefbeneficiaries:')
  const beneficiaries = db.collection('reliefbeneficiaries')
  console.log(`  backfilled deleted_at on ${await backfillDeletedAt(beneficiaries)} document(s)`)
  const converted = await beneficiaries.updateMany(
    { deleted: true, deleted_at: null },
    [{ $set: { deleted_at: { $ifNull: ['$updatedAt', '$$NOW'] } } }],
  )
  console.log(`  converted ${converted.modifiedCount} legacy deleted flag(s)`)
  const unset = await beneficiaries.updateMany({ deleted: { $exists: true } }, {
    $unset: { deleted: '' },
  })
  console.log(`  removed the obsolete 'deleted' field from ${unset.modifiedCount} document(s)`)
  await rebuildIndexes(beneficiaries, 'reliefbeneficiaries')

  console.log('\nMigration complete.')
  await mongoose.disconnect()
  process.exit(0)
}

run().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
