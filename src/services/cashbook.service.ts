import mongoose from 'mongoose'
import Cashbook from '@/models/Cashbook'
import type { JwtAccessPayload } from '@/types/auth.types'

// ── List Entries ──────────────────────────────────────────────────────────────

export async function listEntries(
  query: {
    fiscal_year?: string
    source?: string
    entry_type?: string
    page?: number
    limit?: number
  },
  actor: JwtAccessPayload,
) {
  const { fiscal_year, source, entry_type, page = 1, limit = 20 } = query

  const filter: Record<string, unknown> = {}
  if (fiscal_year) filter.fiscal_year = fiscal_year
  if (source) filter.source = source
  if (entry_type) filter.entry_type = entry_type

  // Admin can only see cashbook entries that they recorded
  if (actor.role === 'entrepreneur') {
    filter.recorded_by = new mongoose.Types.ObjectId(actor.sub)
  }

  const skip = (page - 1) * limit
  const [entries, total] = await Promise.all([
    Cashbook.find(filter)
      .populate('recorded_by', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Cashbook.countDocuments(filter),
  ])

  const normalizedEntries = entries.map((entry) => ({
    _id: String(entry._id),
    entry_date: entry.createdAt,
    entry_type: entry.entry_type,
    source: entry.source,
    description: entry.description,
    amount: entry.amount,
    reference: `${entry.reference_type} / ${String(entry.reference_id)}`,
  }))

  return { entries: normalizedEntries, total, page, limit }
}

// ── Get Summary ───────────────────────────────────────────────────────────────

export async function getSummary(
  query: { fiscal_year?: string },
  actor: JwtAccessPayload,
) {
  const { fiscal_year } = query

  const matchStage: Record<string, unknown> = {}
  if (fiscal_year) matchStage.fiscal_year = fiscal_year

  // Admin can only see summaries for entries they personally recorded
  if (actor.role === 'entrepreneur') {
    matchStage.recorded_by = new mongoose.Types.ObjectId(actor.sub)
  }

  const result = await Cashbook.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { source: '$source', entry_type: '$entry_type' },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: '$_id.source',
        entries: {
          $push: {
            entry_type: '$_id.entry_type',
            total: '$total',
            count: '$count',
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        source: '$_id',
        entries: 1,
      },
    },
    { $sort: { source: 1 } },
  ])

  // Compute overall totals (scoped the same way)
  const totals = await Cashbook.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$entry_type',
        total: { $sum: '$amount' },
      },
    },
  ])

  const totalIncome = totals.find((t) => t._id === 'income')?.total ?? 0
  const totalExpense = totals.find((t) => t._id === 'expense')?.total ?? 0

  return {
    fiscal_year: fiscal_year ?? 'all',
    total_income: totalIncome,
    total_expense: totalExpense,
    net_balance: totalIncome - totalExpense,
    by_source: result,
  }
}
