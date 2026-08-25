'use client'

/**
 * The new-application form: subject fields, applicant lookup, member list.
 *
 * Applicant selection is a search-as-you-type against approved citizens, so
 * the form owns both the query text and the chosen citizen; they are not the
 * same thing, and conflating them is how "selected" silently became "whatever
 * was typed last".
 */
import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { apiCall } from '@/lib/utils/api-client'
import {
  emptyHeir,
  memberKeyFor,
  type Heir,
  type WarishApplicationKind,
} from '@/types/warish.types'

export interface CitizenOption {
  _id: string
  name_bn: string
  name_en: string
  nid?: string
}

export interface WarishCreateFormState {
  application_type: WarishApplicationKind
  deceased_name_bn: string
  deceased_name_en: string
  deceased_father_name_bn: string
  deceased_father_name_en: string
  deceased_mother_name_bn: string
  deceased_mother_name_en: string
  date_of_death: string
  applicant_citizen_id: string
  heirs: Heir[]
  family_members: Heir[]
}

const blankForm = (kind: WarishApplicationKind): WarishCreateFormState => ({
  application_type: kind,
  deceased_name_bn: '',
  deceased_name_en: '',
  deceased_father_name_bn: '',
  deceased_father_name_en: '',
  deceased_mother_name_bn: '',
  deceased_mother_name_en: '',
  date_of_death: '',
  applicant_citizen_id: '',
  heirs: [emptyHeir()],
  family_members: [emptyHeir()],
})

/** Below this, a search would return most of the register. */
const MIN_SEARCH_LENGTH = 2

export function useWarishCreateForm(onCreated: () => void) {
  const [open, setOpen] = useState(false)
  const [isPreview, setIsPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<WarishCreateFormState>(() => blankForm('warish'))

  const [citizenSearch, setCitizenSearch] = useState('')
  const [citizenResults, setCitizenResults] = useState<CitizenOption[]>([])
  const [selectedCitizen, setSelectedCitizen] = useState<CitizenOption | null>(null)
  const [showCitizenDropdown, setShowCitizenDropdown] = useState(false)

  const openFor = useCallback((kind: WarishApplicationKind) => {
    setForm(blankForm(kind))
    setSelectedCitizen(null)
    setCitizenSearch('')
    setCitizenResults([])
    setShowCitizenDropdown(false)
    setIsPreview(false)
    setOpen(true)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    setIsPreview(false)
  }, [])

  const setField = useCallback(
    <K extends keyof WarishCreateFormState>(field: K, value: WarishCreateFormState[K]) => {
      setForm((current) => ({ ...current, [field]: value }))
    },
    [],
  )

  const searchCitizens = useCallback(async (query: string) => {
    setCitizenSearch(query)
    setShowCitizenDropdown(true)

    if (query.length < MIN_SEARCH_LENGTH) {
      setCitizenResults([])
      return
    }

    try {
      const res = await apiCall(
        `/api/citizens?search=${encodeURIComponent(query)}&status=approved&limit=10`,
      )
      if (res.ok) {
        const body = await res.json()
        setCitizenResults(body.data?.citizens ?? [])
      }
    } catch {
      // A failed lookup leaves the previous results; the field stays usable.
    }
  }, [])

  const selectCitizen = useCallback((citizen: CitizenOption) => {
    setSelectedCitizen(citizen)
    setForm((current) => ({ ...current, applicant_citizen_id: citizen._id }))
    setCitizenSearch(`${citizen.name_bn} (${citizen.name_en})`)
    setShowCitizenDropdown(false)
  }, [])

  const memberKey = memberKeyFor(form.application_type)
  const members = form[memberKey]

  const updateMember = useCallback(
    (index: number, field: keyof Heir, value: string) => {
      setForm((current) => {
        const key = memberKeyFor(current.application_type)
        const next = [...current[key]]
        next[index] = { ...next[index], [field]: value }
        return { ...current, [key]: next }
      })
    },
    [],
  )

  const addMember = useCallback(() => {
    setForm((current) => {
      const key = memberKeyFor(current.application_type)
      return { ...current, [key]: [...current[key], emptyHeir()] }
    })
  }, [])

  const removeMember = useCallback((index: number) => {
    setForm((current) => {
      const key = memberKeyFor(current.application_type)
      return { ...current, [key]: current[key].filter((_, i) => i !== index) }
    })
  }, [])

  const submit = useCallback(
    async (status: 'draft' | 'pending') => {
      setSaving(true)
      const key = memberKeyFor(form.application_type)
      const res = await apiCall('/api/warish', {
        method: 'POST',
        body: JSON.stringify({ ...form, status, [key]: form[key].map((m) => ({ ...m })) }),
      })
      setSaving(false)

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.message ?? 'Failed to create application.')
        return
      }

      toast.success(
        `${form.application_type === 'family_certificate' ? 'Family certificate' : 'Warish application'} created.`,
      )
      close()
      setSelectedCitizen(null)
      setCitizenSearch('')
      onCreated()
    },
    [form, close, onCreated],
  )

  return {
    open,
    openFor,
    close,
    isPreview,
    setIsPreview,
    saving,
    form,
    setField,
    isFamily: form.application_type === 'family_certificate',
    members,
    updateMember,
    addMember,
    removeMember,
    citizenSearch,
    citizenResults,
    selectedCitizen,
    showCitizenDropdown,
    setShowCitizenDropdown,
    searchCitizens,
    selectCitizen,
    submit,
  }
}
