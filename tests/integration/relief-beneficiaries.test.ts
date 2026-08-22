import { it, expect, afterAll, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import { describeWithDb, stopTestDb, clearTestDb } from '../helpers/db'
import { makeActor } from '../helpers/actors'
import ReliefProgram from '@/models/ReliefProgram'
import ReliefList from '@/models/ReliefList'
import ReliefBeneficiary from '@/models/ReliefBeneficiary'
import Citizen from '@/models/Citizen'
import * as ReliefService from '@/services/relief.service'

const secretary = makeActor('secretary')

async function seed() {
  const [citizen] = await Citizen.create([
    {
      name_bn: 'রহিম',
      name_en: 'Rahim',
      father_name_bn: 'করিম',
      father_name_en: 'Karim',
      mother_name_bn: 'আমেনা',
      mother_name_en: 'Amena',
      date_of_birth: new Date('1990-01-15'),
      gender: 'male',
      mobile: '01711111111',
      ward_no: 1,
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
      status: 'approved',
      created_by: new mongoose.Types.ObjectId(secretary.sub),
    },
  ])

  const [program] = await ReliefProgram.create([
    {
      name: 'Winter Relief',
      fiscal_year: '2025-2026',
      created_by: new mongoose.Types.ObjectId(secretary.sub),
    },
  ])

  const [list] = await ReliefList.create([
    {
      program_id: program._id,
      list_name: 'Ward 1',
      created_by: new mongoose.Types.ObjectId(secretary.sub),
    },
  ])

  return { citizen, program, list }
}

afterAll(stopTestDb)
beforeEach(clearTestDb)

describeWithDb('relief beneficiary removal', () => {
  it('lets a removed citizen be added back to the same list', async () => {
    const { citizen, list } = await seed()
    const listId = String(list._id)
    const payload = { citizen_id: String(citizen._id), ward_no: 1 }

    const first = await ReliefService.addBeneficiary(listId, payload, secretary)
    await ReliefService.removeBeneficiary(String(first._id), secretary)

    // Previously impossible: the service's duplicate check skipped removed
    // rows but the unique index counted them, so this threw E11000 and the
    // citizen was locked out of the programme permanently.
    const second = await ReliefService.addBeneficiary(listId, payload, secretary)
    expect(String(second.citizen_id)).toBe(String(citizen._id))
  })

  it('still rejects a duplicate while the beneficiary is active', async () => {
    const { citizen, list } = await seed()
    const listId = String(list._id)
    const payload = { citizen_id: String(citizen._id), ward_no: 1 }

    await ReliefService.addBeneficiary(listId, payload, secretary)

    await expect(ReliefService.addBeneficiary(listId, payload, secretary)).rejects.toThrow(
      /already a beneficiary/i,
    )
  })

  it('stamps deleted_at rather than a boolean flag', async () => {
    const { citizen, list } = await seed()
    const created = await ReliefService.addBeneficiary(
      String(list._id),
      { citizen_id: String(citizen._id), ward_no: 1 },
      secretary,
    )

    await ReliefService.removeBeneficiary(String(created._id), secretary)

    const raw = await ReliefBeneficiary.findById(created._id)
      .setOptions({ withDeleted: true })
      .lean()
    expect(raw?.deleted_at).toBeInstanceOf(Date)
  })

  it('keeps removed beneficiaries visible in the list view', async () => {
    const { citizen, list } = await seed()
    const listId = String(list._id)
    const created = await ReliefService.addBeneficiary(
      listId,
      { citizen_id: String(citizen._id), ward_no: 1 },
      secretary,
    )
    await ReliefService.removeBeneficiary(String(created._id), secretary)

    // The officer-facing listing shows removed rows greyed out, so it opts
    // into withDeleted while everything else stays filtered.
    const result = await ReliefService.listBeneficiaries(listId, {}, secretary)
    expect(result.total).toBe(1)
    expect(result.beneficiaries[0].deleted).toBe(true)
  })
})
