import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { ZodError } from 'zod'
import { AppError, ValidationError } from './errors'

interface DuplicateKeyError {
  code: number
  keyPattern?: Record<string, unknown>
}

function isDuplicateKeyError(error: unknown): error is DuplicateKeyError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 11000
  )
}

/** Names the conflicting field without echoing the value back to the caller. */
function duplicateKeyMessage(error: DuplicateKeyError): string {
  const field = Object.keys(error.keyPattern ?? {})[0]
  return field
    ? `A record with this ${field.replace(/_/g, ' ')} already exists`
    : 'Resource already exists'
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  errors?: unknown
  pagination?: PaginationMeta
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export function successResponse<T>(
  data: T,
  message = 'Success',
  statusCode = 200,
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, message, data }, { status: statusCode })
}

export function createdResponse<T>(data: T, message = 'Created successfully') {
  return successResponse(data, message, 201)
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  message = 'Success',
): NextResponse<ApiResponse<T[]>> {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
    { status: 200 },
  )
}

export function errorResponse(error: unknown): NextResponse<ApiResponse> {
  // JSON parse error (malformed request body)
  if (error instanceof SyntaxError) {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON in request body' },
      { status: 400 },
    )
  }

  // Zod validation error
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        message: 'Validation failed',
        errors: error.flatten().fieldErrors,
      },
      { status: 422 },
    )
  }

  // Known operational errors
  if (error instanceof AppError) {
    const body: ApiResponse = {
      success: false,
      message: error.message,
    }
    if (error instanceof ValidationError && error.details) {
      body.errors = error.details
    }
    return NextResponse.json(body, { status: error.statusCode })
  }

  // Malformed ObjectId in a route param or filter.
  // Mongoose throws CastError, which is a client mistake, not a server fault —
  // without this it fell through to the 500 branch below.
  if (error instanceof mongoose.Error.CastError) {
    return NextResponse.json(
      {
        success: false,
        message: error.path === '_id' ? 'Invalid ID format' : `Invalid value for '${error.path}'`,
      },
      { status: 400 },
    )
  }

  // Schema-level validation that Zod did not catch (enum, required, min/max).
  if (error instanceof mongoose.Error.ValidationError) {
    const fieldErrors: Record<string, string[]> = {}
    for (const [field, detail] of Object.entries(error.errors)) {
      fieldErrors[field] = [detail.message]
    }
    return NextResponse.json(
      { success: false, message: 'Validation failed', errors: fieldErrors },
      { status: 422 },
    )
  }

  // Unique index violation — a conflict, not a crash.
  if (isDuplicateKeyError(error)) {
    return NextResponse.json(
      { success: false, message: duplicateKeyMessage(error) },
      { status: 409 },
    )
  }

  // Unknown errors — don't leak internals
  console.error('[Unhandled error]', error)
  return NextResponse.json(
    { success: false, message: 'An unexpected error occurred' },
    { status: 500 },
  )
}
