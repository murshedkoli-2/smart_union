import { it, expect, afterAll, beforeEach } from 'vitest'
import { describeWithDb, stopTestDb, clearTestDb } from '../helpers/db'
import Citizen from '@/models/Citizen'
import * as CitizenService from '@/services/citizen.service'
import { makeActor } from '../helpers/actors'

const secretary = makeActor('secretary')

function citizenFixture(overrides: Record<string, unknown> = {}) {
  return {
    name_bn: 'রহিম উদ্দিন',
    name_en: 'Rahim Uddin',
    father_name_bn: 'করিম',
    father_name_en: 'Karim',
    mother_name_bn: 'আমেনা',
    mother_name_en: 'Amena',
    date_of_birth: '1990-01-15',
    gender: 'male' as const,
    mobile: '01711111111',
    nid_no: '1234567890',
    address: {
      village_bn: 'গ্রাম',
      village_en: 'Village',
      post_office_bn: 'ডাকঘর',
      post_office_en: 'Post Office',
      thana_bn: 'থানা',
      thana_en: 'Thana',
      district_bn: 'জেলা',
      district_en: 'District',
      ward_no: 1,
    },
    ...overrides,
  }
}

afterAll(stopTestDb)
beforeEach(clearTestDb)

describeWithDb('soft delete', () => {
  it('preserves the real NID instead of mangling it', async () => {
    const created = await CitizenService.createCitizen(citizenFixture(), secretary)
    const id = String(created._id)

    await CitizenService.deleteCitizen(id, secretary)

    // Must be read with withDeleted — the query hooks hide it otherwise.
    const raw = await Citizen.findById(id).setOptions({ withDeleted: true }).lean()

    expect(raw).not.toBeNull()
    // The old implementation rewrote this to `1234567890_del_<timestamp>`.
    expect(raw!.nid_no).toBe('1234567890')
    expect(raw!.deleted_at).toBeInstanceOf(Date)
  })

  it('hides deleted citizens from the default listing', async () => {
    const a = await CitizenService.createCitizen(citizenFixture(), secretary)
    await CitizenService.createCitizen(
      citizenFixture({ mobile: '01722222222', nid_no: '9999999999', name_en: 'Second Person' }),
      secretary,
    )

    await CitizenService.deleteCitizen(String(a._id), secretary)

    // listCitizens applies no status filter by default, so before the query
    // hooks existed the deleted record was returned to every caller.
    const result = await CitizenService.listCitizens({}, secretary)

    expect(result.total).toBe(1)
    expect(result.citizens).toHaveLength(1)
    expect(result.citizens[0].nid_no).toBe('9999999999')
  })

  it('makes a deleted citizen unreachable by id', async () => {
    const created = await CitizenService.createCitizen(citizenFixture(), secretary)
    const id = String(created._id)
    await CitizenService.deleteCitizen(id, secretary)

    await expect(CitizenService.getCitizenById(id, secretary)).rejects.toThrow('Citizen not found')
  })

  it('releases the NID for reuse by a new citizen', async () => {
    const created = await CitizenService.createCitizen(citizenFixture(), secretary)
    await CitizenService.deleteCitizen(String(created._id), secretary)

    // The partial unique index excludes deleted rows, so this must succeed
    // without the old implementation's suffix rewriting.
    const replacement = await CitizenService.createCitizen(
      citizenFixture({ mobile: '01733333333' }),
      secretary,
    )
    expect(replacement.nid_no).toBe('1234567890')
  })

  it('still rejects a duplicate NID between two live citizens', async () => {
    await CitizenService.createCitizen(citizenFixture(), secretary)

    await expect(
      CitizenService.createCitizen(citizenFixture({ mobile: '01744444444' }), secretary),
    ).rejects.toMatchObject({ code: 11000 })
  })
})

describeWithDb('citizen search', () => {
  it('finds a citizen by name through the text index', async () => {
    await CitizenService.createCitizen(citizenFixture(), secretary)
    const result = await CitizenService.listCitizens({ search: 'Rahim' }, secretary)
    expect(result.total).toBe(1)
  })

  it('finds a citizen by mobile prefix', async () => {
    await CitizenService.createCitizen(citizenFixture(), secretary)
    const result = await CitizenService.listCitizens({ search: '017111' }, secretary)
    expect(result.total).toBe(1)
  })

  it('does not execute a malicious search string as a regex', async () => {
    await CitizenService.createCitizen(citizenFixture(), secretary)

    // Would match everything if compiled as a real regex.
    const result = await CitizenService.listCitizens({ search: '.*' }, secretary)
    expect(result.total).toBe(0)
  })
})
