/**
 * One-off migration: turn legacy encrypted PII back into plaintext.
 *
 * An earlier version of this app encrypted `nid_no`, `birth_cert_no` and
 * `mobile` at rest with AES-256-GCM, storing them as
 * `enc:<iv-hex>:<authTag-hex>:<ciphertext-base64>` and decrypting them in
 * Mongoose post-find hooks. This branch has no such layer, so those documents
 * now render their ciphertext straight into the UI:
 *
 *   enc:58bd0c32ca19cf7fa5c4cec0:751107379ee504ec32385295477d4ab6:/x3NWCUl6eYrqp0=
 *
 * This script decrypts every such value in place, once, using the original
 * ENCRYPTION_KEY. After it runs the field-level encryption is gone for good —
 * that is the intent, because nothing in this branch can read it back.
 *
 * Usage:
 *   1. Put the ORIGINAL key in .env.local:  ENCRYPTION_KEY=<the key>
 *   2. Dry run (writes nothing):            npm run decrypt-pii
 *   3. Apply:                               npm run decrypt-pii -- --apply
 *
 * The dry run reports what would change and, crucially, whether every value
 * decrypts. A wrong key fails the GCM auth tag on every value, so a key that
 * "mostly works" does not exist: it is all or nothing, and the script refuses
 * to write unless every value decrypted.
 *
 * BACK UP THE DATABASE FIRST. Decryption is reversible only by re-encrypting,
 * and only while you still hold the key.
 */
import * as dotenv from 'dotenv'
import path from 'path'
import mongoose from 'mongoose'
import { createDecipheriv, createHash } from 'crypto'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SENTINEL = 'enc:'
const ALGORITHM = 'aes-256-gcm'
const TAG_LENGTH = 16

const APPLY = process.argv.includes('--apply')

/**
 * The original key derivation, reproduced exactly.
 *
 * A base64 key of 32 bytes or more is used directly; anything else is hashed
 * to 32 bytes. Deriving differently produces a valid-looking key that fails
 * every auth tag, which is indistinguishable from having the wrong key.
 */
function encryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      'ENCRYPTION_KEY is not set. Put the ORIGINAL key in .env.local — without it ' +
        'AES-256-GCM ciphertext cannot be recovered.',
    )
  }

  const decoded = Buffer.from(raw, 'base64')
  if (decoded.length >= 32) return decoded.subarray(0, 32)
  return createHash('sha256').update(raw, 'utf8').digest()
}

function decrypt(value: string, key: Buffer): string {
  const [ivHex, tagHex, ciphertextBase64] = value.slice(SENTINEL.length).split(':')
  if (!ivHex || !tagHex || !ciphertextBase64) throw new Error('Malformed encrypted value')

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex').subarray(0, TAG_LENGTH))

  return (
    decipher.update(Buffer.from(ciphertextBase64, 'base64')).toString('utf8') +
    decipher.final('utf8')
  )
}

interface Change {
  path: string
  plain: string
}

/**
 * Collects every `enc:` string in a document, with its dotted path.
 *
 * Walks the whole document rather than a fixed field list: the encrypted set
 * grew over time (system settings picked up an API key), and a field missed
 * here would stay unreadable with no key left to fix it later.
 */
function collect(value: unknown, currentPath: string, key: Buffer, out: Change[], failures: string[]): void {
  if (typeof value === 'string') {
    if (!value.startsWith(SENTINEL)) return
    try {
      out.push({ path: currentPath, plain: decrypt(value, key) })
    } catch {
      failures.push(currentPath)
    }
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collect(item, `${currentPath}.${index}`, key, out, failures))
    return
  }

  if (
    value &&
    typeof value === 'object' &&
    !(value instanceof Date) &&
    !(value instanceof mongoose.Types.ObjectId)
  ) {
    for (const [field, child] of Object.entries(value)) {
      collect(child, currentPath ? `${currentPath}.${field}` : field, key, out, failures)
    }
  }
}

/** Masks a recovered value so a dry run does not print PII to the terminal. */
function mask(value: string): string {
  if (value.length <= 4) return '***'
  return `${value.slice(0, 2)}***${value.slice(-2)}`
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not set')

  const key = encryptionKey()
  await mongoose.connect(uri)
  const db = mongoose.connection.db!

  const collections = await db.listCollections().toArray()
  const plan: Array<{ collection: string; id: unknown; changes: Change[] }> = []
  const perField = new Map<string, { count: number; sample: string }>()
  const failures: string[] = []

  for (const { name } of collections) {
    const documents = await db.collection(name).find({}).toArray()

    for (const document of documents) {
      const changes: Change[] = []
      const documentFailures: string[] = []
      collect(document, '', key, changes, documentFailures)

      failures.push(...documentFailures.map((field) => `${name}.${field}`))
      if (changes.length === 0) continue

      plan.push({ collection: name, id: document._id, changes })
      for (const change of changes) {
        const fieldKey = `${name}.${change.path}`
        const entry = perField.get(fieldKey) ?? { count: 0, sample: mask(change.plain) }
        entry.count += 1
        perField.set(fieldKey, entry)
      }
    }
  }

  if (perField.size === 0 && failures.length === 0) {
    console.log('No encrypted values found — nothing to do.')
    await mongoose.disconnect()
    return
  }

  console.log(`\n${APPLY ? 'APPLYING' : 'DRY RUN'} — encrypted values found:\n`)
  for (const [field, { count, sample }] of [...perField].sort()) {
    console.log(`  ${field.padEnd(40)} ${String(count).padStart(4)} values   e.g. ${sample}`)
  }

  if (failures.length > 0) {
    const shown = failures.slice(0, 5).join(', ')
    console.error(
      `\n${failures.length} value(s) failed to decrypt (e.g. ${shown}).\n` +
        'This is what a WRONG ENCRYPTION_KEY looks like — AES-GCM rejects the auth tag.\n' +
        'Nothing was written. Check that .env.local holds the key these records were ' +
        'encrypted with.',
    )
    await mongoose.disconnect()
    process.exitCode = 1
    return
  }

  if (!APPLY) {
    console.log(
      `\nAll ${plan.length} document(s) decrypt cleanly. Back up the database, then re-run ` +
        'with --apply to write the plaintext back.',
    )
    await mongoose.disconnect()
    return
  }

  let updated = 0
  for (const { collection, id, changes } of plan) {
    const set = Object.fromEntries(changes.map((change) => [change.path, change.plain]))
    await db.collection(collection).updateOne({ _id: id as never }, { $set: set })
    updated += 1
  }

  console.log(`\nUpdated ${updated} document(s). The 'enc:' values are now plaintext.`)
  await mongoose.disconnect()
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
