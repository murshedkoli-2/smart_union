import mongoose from 'mongoose'
import SystemSettings from '@/models/SystemSettings'
import { ValidationError } from '@/lib/utils/errors'
import { createAuditLog } from './audit-log.service'
import { maskSecret, isMaskedSecret } from '@/lib/utils/mask-secret'
import type { JwtAccessPayload } from '@/types/auth.types'

interface AiStudioConfig {
  gemini_api_key: string
  enabled: boolean
}

/**
 * Pure merge rule for the AI Studio config sub-document: an omitted field
 * keeps its current value, a resubmitted mask is ignored (the admin didn't
 * change it), anything else — including an explicit empty string, which
 * clears the key — replaces it.
 */
export function resolveAiStudioUpdate(
  current: AiStudioConfig,
  incoming: Partial<AiStudioConfig> | undefined,
): AiStudioConfig {
  if (!incoming) return current

  let gemini_api_key = current.gemini_api_key
  if (incoming.gemini_api_key !== undefined && !isMaskedSecret(incoming.gemini_api_key)) {
    gemini_api_key = incoming.gemini_api_key
  }

  const enabled = incoming.enabled !== undefined ? Boolean(incoming.enabled) : current.enabled

  return { gemini_api_key, enabled }
}

const DEFAULT_AI_STUDIO: AiStudioConfig = { gemini_api_key: '', enabled: false }

/** Raw, unmasked config for server-to-server use only — never expose via a route. */
export async function getAiStudioConfig(): Promise<AiStudioConfig> {
  const settings = await SystemSettings.findOne({ key: 'default' }).lean()
  return (settings as unknown as { ai_studio?: AiStudioConfig })?.ai_studio ?? DEFAULT_AI_STUDIO
}

function normalizeMembers(value: unknown) {
  if (!Array.isArray(value)) return []

  return value
    .map((member) => {
      const item = member as Record<string, unknown>
      return {
        name_bn: String(item.name_bn ?? item.name ?? '').trim(),
        name_en: String(item.name_en ?? item.name ?? '').trim(),
        designation_bn: String(item.designation_bn ?? item.designation ?? '').trim(),
        designation_en: String(item.designation_en ?? item.designation ?? '').trim(),
        mobile: String(item.mobile ?? '').trim(),
      }
    })
    .filter((member) => member.name_bn && member.name_en && member.designation_bn && member.designation_en)
}

/** Settings are union-wide and readable by any authenticated role. */
export async function getSystemSettings() {
  const settings = await SystemSettings.findOne({ key: 'default' }).lean()

  if (settings) {
    const legacySettings = settings as unknown as Record<string, unknown>

    return {
      ...settings,
      union_name_bn: String(legacySettings.union_name_bn ?? legacySettings.union_name ?? 'ইউনিয়ন পরিষদ'),
      union_name_en: String(legacySettings.union_name_en ?? legacySettings.union_name ?? 'Union Parishad'),
      chairman_name_bn: String(legacySettings.chairman_name_bn ?? legacySettings.chairman_name ?? ''),
      chairman_name_en: String(legacySettings.chairman_name_en ?? legacySettings.chairman_name ?? ''),
      address_bn: String(legacySettings.address_bn ?? legacySettings.address ?? ''),
      address_en: String(legacySettings.address_en ?? legacySettings.address ?? ''),
      members: normalizeMembers(legacySettings.members),
      ai_studio: (() => {
        const aiStudio = (legacySettings.ai_studio as AiStudioConfig | undefined) ?? DEFAULT_AI_STUDIO
        return { gemini_api_key: maskSecret(aiStudio.gemini_api_key), enabled: aiStudio.enabled }
      })(),
    }
  }

  return {
    key: 'default',
    union_name_bn: 'ইউনিয়ন পরিষদ',
    union_name_en: 'Union Parishad',
    chairman_name_bn: '',
    chairman_name_en: '',
    union_logo: null,
    address_bn: '',
    address_en: '',
    members: [],
    ai_studio: { gemini_api_key: '', enabled: false },
  }
}

export async function updateSystemSettings(dto: unknown, actor: JwtAccessPayload) {
  const body = dto as Record<string, unknown>

  if (!String(body.union_name_bn ?? body.union_name ?? '').trim()) {
    throw new ValidationError('Bangla union name is required')
  }

  if (!String(body.union_name_en ?? body.union_name ?? '').trim()) {
    throw new ValidationError('English union name is required')
  }

  const previous = await SystemSettings.findOne({ key: 'default' }).lean()
  const previousAiStudio = (previous as unknown as { ai_studio?: AiStudioConfig })?.ai_studio ?? DEFAULT_AI_STUDIO
  const nextAiStudio = resolveAiStudioUpdate(
    previousAiStudio,
    body.ai_studio as Partial<AiStudioConfig> | undefined,
  )

  const payload = {
    key: 'default',
    union_name_bn: String(body.union_name_bn ?? body.union_name ?? '').trim(),
    union_name_en: String(body.union_name_en ?? body.union_name ?? '').trim(),
    chairman_name_bn: String(body.chairman_name_bn ?? body.chairman_name ?? '').trim(),
    chairman_name_en: String(body.chairman_name_en ?? body.chairman_name ?? '').trim(),
    union_logo: String(body.union_logo ?? '').trim() || null,
    address_bn: String(body.address_bn ?? body.address ?? '').trim(),
    address_en: String(body.address_en ?? body.address ?? '').trim(),
    members: normalizeMembers(body.members),
    ai_studio: nextAiStudio,
    updated_by: new mongoose.Types.ObjectId(actor.sub),
  }

  const settings = await SystemSettings.findOneAndUpdate(
    { key: 'default' },
    payload,
    { upsert: true, returnDocument: 'after' },
  )

  if (!settings) {
    throw new ValidationError('Failed to save system settings')
  }

  await createAuditLog({
    user_id: actor.sub,
    user_role: actor.role,
    action: 'system_settings.update',
    target_model: 'SystemSettings',
    target_id: settings._id as mongoose.Types.ObjectId,
    changes: { before: previous, after: settings.toObject() },
    status: 'success',
  })

  const settingsObj = settings.toObject() as unknown as Record<string, unknown>
  const savedAiStudio = settingsObj.ai_studio as AiStudioConfig
  settingsObj.ai_studio = { gemini_api_key: maskSecret(savedAiStudio.gemini_api_key), enabled: savedAiStudio.enabled }

  return settingsObj
}
