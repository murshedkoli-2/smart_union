import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { withRateLimit } from '@/middleware/rate-limit'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse, errorResponse } from '@/lib/utils/api-response'
import { RATE_LIMITS } from '@/lib/security/rate-limit'
import { PERMISSIONS } from '@/constants/permissions'
import { BadRequestError, BadGatewayError } from '@/lib/utils/errors'
import { getAiStudioConfig } from '@/services/system-settings.service'
import { generateTemplateDraft, AiGenerationError } from '@/lib/ai/gemini-template'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'

const TEMPLATE_TYPES = ['standard', 'custom', 'warish'] as const
const LANGUAGES = ['bn', 'en'] as const

const postHandler = async (req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> => {
  void _ctx
  const body = await req.json()

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const templateType = body.template_type
  const language = body.language

  if (!title) throw new BadRequestError('title is required')
  if (!TEMPLATE_TYPES.includes(templateType)) {
    throw new BadRequestError(`template_type must be one of: ${TEMPLATE_TYPES.join(', ')}`)
  }
  if (!LANGUAGES.includes(language)) {
    throw new BadRequestError(`language must be one of: ${LANGUAGES.join(', ')}`)
  }

  const aiConfig = await getAiStudioConfig()
  if (!aiConfig.enabled || !aiConfig.gemini_api_key) {
    throw new BadRequestError('AI Studio is not configured — set it up in Admin → AI Studio')
  }

  try {
    const draft = await generateTemplateDraft({
      title,
      templateType,
      language,
      apiKey: aiConfig.gemini_api_key,
    })
    return successResponse(draft)
  } catch (err) {
    if (err instanceof AiGenerationError) {
      throw new BadGatewayError(err.message)
    }
    throw err
  }
}

export const POST = withRateLimit('ai:generate-template', RATE_LIMITS.aiGenerate)(
  withDb(
    authenticate(
      authorize(['secretary', 'entrepreneur'], PERMISSIONS.TEMPLATE_MANAGE)((req, ctx) =>
        postHandler(req, ctx).catch(errorResponse),
      ),
    ),
  ),
)
