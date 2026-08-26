import { it, expect, afterAll, beforeEach } from 'vitest'
import { describeWithDb, stopTestDb, clearTestDb } from '../helpers/db'
import { makeActor } from '../helpers/actors'
import * as AuthService from '@/services/auth.service'
import * as CitizenService from '@/services/citizen.service'
import User from '@/models/User'

const secretary = makeActor('secretary')

let counter = 0
const registerCitizenDto = () => {
  counter += 1
  return {
    name: `Citizen ${counter}`,
    email: `citizen${counter}@example.com`,
    password: 'Passw0rd!',
    mobile: `0170000${String(counter).padStart(4, '0')}`,
    citizen_data: {
      name_bn: 'নাগরিক',
      name_en: `Citizen ${counter}`,
      father_name_bn: 'পিতা',
      father_name_en: 'Father',
      mother_name_bn: 'মাতা',
      mother_name_en: 'Mother',
      date_of_birth: '1990-01-15',
      gender: 'male',
      mobile: `0170000${String(counter).padStart(4, '0')}`,
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
    },
  }
}

afterAll(stopTestDb)
beforeEach(clearTestDb)

describeWithDb('citizen self-registration and approval', () => {
  it('blocks login with "pending approval" before the secretary approves', async () => {
    const dto = registerCitizenDto()
    await AuthService.register(dto)

    await expect(AuthService.login({ email: dto.email, password: dto.password })).rejects.toThrow(
      'Your account is pending approval',
    )
  })

  it('lets the citizen log in once the secretary approves', async () => {
    const dto = registerCitizenDto()
    const { citizen } = await AuthService.register(dto)
    expect(citizen).not.toBeNull()

    await CitizenService.approveCitizen(String(citizen!._id), secretary)

    const result = await AuthService.login({ email: dto.email, password: dto.password })
    expect(result.user.email).toBe(dto.email)

    const user = await User.findOne({ email: dto.email })
    expect(user?.status).toBe('active')
  })

  it('blocks login with "deactivated" once the secretary rejects', async () => {
    const dto = registerCitizenDto()
    const { citizen } = await AuthService.register(dto)

    await CitizenService.rejectCitizen(String(citizen!._id), {}, secretary)

    await expect(AuthService.login({ email: dto.email, password: dto.password })).rejects.toThrow(
      'Your account has been deactivated',
    )
  })

  it('refuses to approve a citizen that is not pending', async () => {
    const dto = registerCitizenDto()
    const { citizen } = await AuthService.register(dto)
    await CitizenService.approveCitizen(String(citizen!._id), secretary)

    await expect(CitizenService.approveCitizen(String(citizen!._id), secretary)).rejects.toThrow(
      'Citizen is not in pending status',
    )
  })
})
