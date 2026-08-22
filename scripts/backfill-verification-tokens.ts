/**
 * One-time migration: give every existing certificate a verification token.
 *
 * Background: the public verification endpoint used to resolve certificates by
 * `certificate_no`. Those numbers are sequential, so the whole register could
 * be enumerated by an unauthenticated caller. Verification now happens through
 * an unguessable `verification_token`, and certificates approved before that
 * change have none — their QR codes resolve to nothing until this runs.
 *
 * Idempotent: certificates that already have a token are left alone.
 *
 * Run once after deploying:
 *   npm run backfill-verification-tokens
 */
import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const TOKEN_BYTES = 24

function generateToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES)
  globalThis.crypto.getRandomValues(bytes)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return Buffer.from(binary, 'binary')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000').replace(/\/+$/, '')
}

async function run() {
  const MONGODB_URI = process.env.MONGODB_URI
  if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI is not set in .env.local')
    process.exit(1)
  }

  await mongoose.connect(MONGODB_URI)
  console.log('Connected.')

  const certificates = mongoose.connection.db?.collection('certificates')
  if (!certificates) {
    console.error('ERROR: certificates collection not found')
    process.exit(1)
  }

  const cursor = certificates.find({
    $or: [{ verification_token: { $exists: false } }, { verification_token: null }],
  })

  let updated = 0
  for await (const doc of cursor) {
    const token = generateToken()
    await certificates.updateOne(
      { _id: doc._id },
      {
        $set: {
          verification_token: token,
          qr_code_url: `${baseUrl()}/verify/${token}`,
        },
      },
    )
    updated += 1
  }

  console.log(`Backfilled ${updated} certificate(s).`)
  console.log(
    updated > 0
      ? 'NOTE: QR codes on already-printed certificates point at the old URL and ' +
          'will no longer resolve. Reprint or re-issue those documents.'
      : 'Nothing to do.',
  )

  await mongoose.disconnect()
  process.exit(0)
}

run().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
