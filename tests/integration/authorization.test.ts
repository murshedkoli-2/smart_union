import { it, expect, afterAll, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import { describeWithDb, stopTestDb, clearTestDb } from '../helpers/db'
import Payment from '@/models/Payment'
import * as PaymentService from '@/services/payment.service'
import { makeActor } from '../helpers/actors'

const entrepreneurA = makeActor('entrepreneur', ['payment.view'])

const entrepreneurB = makeActor('entrepreneur', ['payment.view'])

const secretary = makeActor('secretary')

const paymentDto = () => ({
  payment_type: 'certificate',
  source_type: 'certificate_bn',
  reference_id: new mongoose.Types.ObjectId().toString(),
  amount: 50,
  paid_by_citizen: new mongoose.Types.ObjectId().toString(),
})

afterAll(stopTestDb)
beforeEach(clearTestDb)

describeWithDb('payment listing scope', () => {
  beforeEach(async () => {
    await PaymentService.collectPayment(paymentDto(), entrepreneurA)
    await PaymentService.collectPayment(paymentDto(), entrepreneurB)
    expect(await Payment.countDocuments({})).toBe(2)
  })

  it('shows an entrepreneur only their own collections', async () => {
    const result = await PaymentService.listPayments({}, entrepreneurA)
    expect(result.total).toBe(1)
    expect(String(result.payments[0].collected_by._id)).toBe(entrepreneurA.sub)
  })

  it('ignores a collected_by filter naming someone else', async () => {
    // The IDOR: passing another collector's id used to bypass own-records
    // scoping entirely and return their payment history.
    const result = await PaymentService.listPayments(
      { collected_by: entrepreneurB.sub },
      entrepreneurA,
    )

    expect(result.total).toBe(1)
    expect(String(result.payments[0].collected_by._id)).toBe(entrepreneurA.sub)
  })

  it('lets a secretary see every collection', async () => {
    const result = await PaymentService.listPayments({}, secretary)
    expect(result.total).toBe(2)
  })

  it('lets a secretary filter by a specific collector', async () => {
    const result = await PaymentService.listPayments(
      { collected_by: entrepreneurB.sub },
      secretary,
    )
    expect(result.total).toBe(1)
    expect(String(result.payments[0].collected_by._id)).toBe(entrepreneurB.sub)
  })
})
