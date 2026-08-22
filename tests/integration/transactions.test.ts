import { it, expect, afterAll, beforeEach, vi } from 'vitest'
import mongoose from 'mongoose'
import { describeWithDb, stopTestDb, clearTestDb } from '../helpers/db'
import Payment from '@/models/Payment'
import Cashbook from '@/models/Cashbook'
import User from '@/models/User'
import Citizen from '@/models/Citizen'
import * as PaymentService from '@/services/payment.service'
import * as AuthService from '@/services/auth.service'
import { makeActor } from '../helpers/actors'

const actor = makeActor('secretary')

const paymentDto = () => ({
  payment_type: 'certificate',
  source_type: 'certificate_bn',
  reference_id: new mongoose.Types.ObjectId().toString(),
  amount: 100,
  paid_by_citizen: new mongoose.Types.ObjectId().toString(),
})

afterAll(stopTestDb)
beforeEach(async () => {
  vi.restoreAllMocks()
  await clearTestDb()
})

describeWithDb('collectPayment atomicity', () => {
  it('writes the payment and its cashbook entry together', async () => {
    await PaymentService.collectPayment(paymentDto(), actor)

    expect(await Payment.countDocuments({})).toBe(1)
    expect(await Cashbook.countDocuments({})).toBe(1)
  })

  it('rolls the payment back when the cashbook write fails', async () => {
    // The exact split-write bug this transaction exists to prevent: a receipt
    // banked with no matching ledger line, which nobody notices until a manual
    // reconciliation.
    vi.spyOn(Cashbook, 'create').mockRejectedValueOnce(new Error('ledger write failed') as never)

    await expect(PaymentService.collectPayment(paymentDto(), actor)).rejects.toThrow(
      'ledger write failed',
    )

    expect(await Payment.countDocuments({})).toBe(0)
    expect(await Cashbook.countDocuments({})).toBe(0)
  })

  it('keeps the books balanced across many payments', async () => {
    for (let i = 0; i < 5; i++) {
      await PaymentService.collectPayment(paymentDto(), actor)
    }

    const payments = await Payment.find({}).lean()
    const entries = await Cashbook.find({}).lean()

    expect(payments).toHaveLength(5)
    expect(entries).toHaveLength(5)

    const paymentTotal = payments.reduce((sum, p) => sum + p.amount, 0)
    const ledgerTotal = entries.reduce((sum, e) => sum + e.amount, 0)
    expect(ledgerTotal).toBe(paymentTotal)
  })

  it('issues a unique receipt number per payment', async () => {
    await PaymentService.collectPayment(paymentDto(), actor)
    await PaymentService.collectPayment(paymentDto(), actor)

    const receipts = (await Payment.find({}).lean()).map((p) => p.receipt_no)
    expect(new Set(receipts).size).toBe(2)
  })
})

describeWithDb('register atomicity', () => {
  const registration = {
    name: 'New Citizen',
    email: 'new.citizen@example.com',
    password: 'Str0ngPass',
    citizen_data: {
      name_bn: 'নতুন',
      name_en: 'New Citizen',
      father_name_bn: 'পিতা',
      father_name_en: 'Father',
      mother_name_bn: 'মাতা',
      mother_name_en: 'Mother',
      date_of_birth: '1995-06-01',
      gender: 'female' as const,
      mobile: '01755555555',
      address: {
        village_bn: 'গ্রাম',
        village_en: 'Village',
        post_office_bn: 'ডাকঘর',
        post_office_en: 'Post Office',
        thana_bn: 'থানা',
        thana_en: 'Thana',
        district_bn: 'জেলা',
        district_en: 'District',
        ward_no: 2,
      },
    },
  }

  it('creates the account and citizen profile together', async () => {
    await AuthService.register(registration)

    expect(await User.countDocuments({})).toBe(1)
    expect(await Citizen.countDocuments({})).toBe(1)
  })

  it('leaves no orphan account when the citizen record fails', async () => {
    // Otherwise the citizen can sign in but has no profile to act on, and
    // cannot register again because the email is already taken.
    vi.spyOn(Citizen, 'create').mockRejectedValueOnce(new Error('duplicate NID') as never)

    await expect(AuthService.register(registration)).rejects.toThrow('duplicate NID')

    expect(await User.countDocuments({})).toBe(0)
    expect(await Citizen.countDocuments({})).toBe(0)
  })

  it('self-registration lands as pending with the citizen role', async () => {
    const result = await AuthService.register(registration)
    expect(result.user.status).toBe('pending')
    expect(result.user.role).toBe('citizen')
  })

  it('never returns the password hash', async () => {
    const result = await AuthService.register(registration)
    expect(result.user.password).toBeUndefined()
    expect(result.user.refresh_token).toBeUndefined()
  })
})
