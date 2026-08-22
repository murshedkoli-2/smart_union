import type { Schema, Query, Aggregate } from 'mongoose'

/**
 * Soft delete via a `deleted_at` timestamp.
 *
 * Replaces the previous approach, which set `status = 'deleted'` and then
 * appended `_del_<timestamp>` to every unique field — nid_no, birth_cert_no,
 * holding_no, certificate_no — purely to dodge the unique index. That
 * destroyed the real value: a deleted citizen's National ID became
 * `1234567890_del_1719',` so the record could no longer be matched against the
 * person it belonged to, and restoring one meant guessing where the original
 * ended and the suffix began. Unique fields are left untouched here; the
 * indexes are made partial instead, so a deleted record releases its NID
 * without losing it.
 *
 * It also closes a leak. Excluding deleted rows relied on callers passing a
 * status filter, and `listCitizens` only filters by status when the caller
 * supplies one — so deleted citizens appeared in the default listing. The
 * query hooks below apply the exclusion in one place instead of at ~40 call
 * sites, where a single omission is a data leak rather than a visible bug.
 *
 * To include deleted documents deliberately (admin recovery, migrations),
 * pass `.setOptions({ withDeleted: true })` on the query.
 */

const READ_HOOKS = [
  'find',
  'findOne',
  'findOneAndUpdate',
  'findOneAndDelete',
  'countDocuments',
  'distinct',
  'updateOne',
  'updateMany',
] as const

interface SoftDeleteOptions {
  withDeleted?: boolean
}

export interface SoftDeleteFields {
  deleted_at?: Date | null
}

export function softDeletePlugin(schema: Schema): void {
  schema.add({
    deleted_at: { type: Date, default: null, index: true },
  })

  for (const hook of READ_HOOKS) {
    // { document: false, query: true } is explicit on purpose: for `updateOne`
    // Mongoose can register document middleware, where `this` is a Document
    // and getFilter/getOptions do not exist. Being explicit keeps every hook
    // in this loop a query hook regardless of Mongoose's per-name defaults.
    schema.pre(hook, { document: false, query: true }, function (this: Query<unknown, unknown>) {
      const options = this.getOptions() as SoftDeleteOptions
      if (options.withDeleted) return

      // Respect an explicit deleted_at condition from the caller.
      const conditions = this.getFilter()
      if (conditions.deleted_at !== undefined) return

      this.where({ deleted_at: null })
    })
  }

  schema.pre('aggregate', function (this: Aggregate<unknown[]>) {
    const options = this.options as SoftDeleteOptions
    if (options?.withDeleted) return

    const pipeline = this.pipeline()
    // Must go first so later stages never see deleted documents.
    if (pipeline[0] && '$match' in pipeline[0] && 'deleted_at' in (pipeline[0].$match ?? {})) return
    pipeline.unshift({ $match: { deleted_at: null } })
  })
}

/** Filter fragment for the rare query built outside Mongoose. */
export const NOT_DELETED = { deleted_at: null } as const
