import mongoose, { type ClientSession } from 'mongoose'

/**
 * Multi-document atomicity for the money flows.
 *
 * Collecting a payment writes a Payment, a Cashbook entry, sometimes a Tax
 * status change and a Citizen holding number, plus an audit record. Written as
 * separate calls, a failure part-way leaves the books unbalanced — a receipt
 * with no ledger line, or a tax marked paid with no payment behind it. Nobody
 * finds out until someone reconciles by hand.
 *
 * These helpers put the whole unit in one transaction.
 *
 * REQUIRES A REPLICA SET. MongoDB has no multi-document transactions on a
 * standalone mongod. Atlas is a replica set, so production is fine; a local
 * standalone `mongod` is not. For local development either run a single-node
 * replica set:
 *
 *   mongod --replSet rs0            # then: mongosh --eval 'rs.initiate()'
 *   MONGODB_URI=mongodb://localhost:27017/smart_union?replicaSet=rs0
 *
 * or set ALLOW_NON_TRANSACTIONAL_WRITES=true to fall back to unordered writes.
 * Never set that in production: it silently reintroduces the split-write bug.
 */

/** Cached capability probe — resolved once per process. */
let transactionSupport: Promise<boolean> | null = null

function isUnsupportedTransactionError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  return (
    message.includes('Transaction numbers are only allowed on a replica set') ||
    message.includes('Transactions are not supported') ||
    message.includes('replica set member or mongos')
  )
}

/**
 * Probes the deployment ONCE, before any real write.
 *
 * Deliberately not "try the transaction, fall back on failure" — by the time a
 * commit fails, some writes may already have happened, and re-running the
 * callback would duplicate them. Deciding up front keeps the fallback safe.
 */
async function supportsTransactions(): Promise<boolean> {
  const session = await mongoose.startSession()
  try {
    session.startTransaction()
    await session.abortTransaction()
    return true
  } catch (err) {
    if (isUnsupportedTransactionError(err)) return false
    throw err
  } finally {
    await session.endSession()
  }
}

function transactionsAvailable(): Promise<boolean> {
  if (!transactionSupport) {
    transactionSupport = supportsTransactions().catch((err) => {
      // Don't cache a probe that failed for an unrelated reason.
      transactionSupport = null
      throw err
    })
  }
  return transactionSupport
}

/**
 * Runs `fn` inside a transaction, committing on success and aborting on any
 * thrown error. Every write inside MUST be passed the session, or it will not
 * be part of the atomic unit.
 *
 * Sequence generators (receipt numbers, holding numbers) are intentionally
 * left OUTSIDE the session: counters are hot single documents, and including
 * them turns every concurrent payment into a write conflict. A rolled-back
 * operation therefore burns a number, leaving a gap in the sequence. Gaps are
 * acceptable; duplicate receipt numbers are not.
 */
export async function withTransaction<T>(fn: (session?: ClientSession) => Promise<T>): Promise<T> {
  if (!(await transactionsAvailable())) {
    if (process.env.ALLOW_NON_TRANSACTIONAL_WRITES === 'true') {
      console.warn(
        'NON_TRANSACTIONAL_WRITE: MongoDB deployment does not support transactions. ' +
          'Multi-document writes are NOT atomic. Do not run this way in production.',
      )
      return fn(undefined)
    }
    throw new Error(
      'This operation writes several documents atomically and requires a MongoDB replica set. ' +
        'Point MONGODB_URI at a replica set (Atlas already is one), or set ' +
        'ALLOW_NON_TRANSACTIONAL_WRITES=true for local development only.',
    )
  }

  const session = await mongoose.startSession()
  try {
    let result: T
    await session.withTransaction(async () => {
      result = await fn(session)
    })
    return result!
  } finally {
    await session.endSession()
  }
}

/**
 * Joins an existing transaction, or opens one if there is none.
 *
 * Lets a service be both a standalone entry point and a step inside a larger
 * atomic operation — collectPayment is called directly by the payments route
 * and as part of certificate approval, and must not open a nested transaction
 * in the second case.
 */
export function inTransaction<T>(
  session: ClientSession | undefined,
  fn: (session?: ClientSession) => Promise<T>,
): Promise<T> {
  return session ? fn(session) : withTransaction(fn)
}
