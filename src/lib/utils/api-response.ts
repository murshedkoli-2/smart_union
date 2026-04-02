import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { AppError, ValidationError } from './errors'

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

  // Unknown errors — don't leak internals
  console.error('[Unhandled error]', error)
  return NextResponse.json(
    { success: false, message: 'An unexpected error occurred' },
    { status: 500 },
  )
}
