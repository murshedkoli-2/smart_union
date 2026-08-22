import { describe } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryReplSet } from 'mongodb-memory-server'

/**
 * A real mongod for tests, started as a single-node REPLICA SET.
 *
 * A replica set rather than a standalone because the payment and registration
 * paths run inside transactions, and MongoDB only supports those on a replica
 * set. A standalone would fail every one of those tests for an environmental
 * reason and tempt someone to set ALLOW_NON_TRANSACTIONAL_WRITES, which is
 * exactly the bug these tests exist to catch.
 *
 * The server is started at import time so suites can be skipped — rather than
 * failed — on a machine that cannot run mongod at all. On Windows that usually
 * means the Visual C++ redistributable is missing:
 * https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist
 * CI runs Linux, where these always execute.
 */
let replSet: MongoMemoryReplSet | null = null
let startupError: Error | null = null

async function start(): Promise<void> {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  })
  await mongoose.connect(replSet.getUri(), { dbName: 'smart_union_test' })
  // Build the indexes the schemas declare — the unique and partial indexes are
  // what several tests assert on.
  await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()))
}

try {
  await start()
} catch (err) {
  startupError = err as Error
  console.warn(
    `\n[tests] Skipping database integration suites — mongod could not start.\n` +
      `        ${startupError.message.split('\n')[0]}\n` +
      `        On Windows this is usually a missing Visual C++ redistributable.\n`,
  )
}

/** True when a real mongod is available for this run. */
export const hasTestDb = startupError === null

/** describe() that skips the whole block when no mongod could be started. */
export const describeWithDb = hasTestDb ? describe : describe.skip

export async function stopTestDb(): Promise<void> {
  if (!hasTestDb) return
  await mongoose.disconnect()
  await replSet?.stop()
  replSet = null
}

/** Empties every collection between tests without dropping indexes. */
export async function clearTestDb(): Promise<void> {
  if (!hasTestDb) return
  const collections = mongoose.connection.collections
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})))
}
