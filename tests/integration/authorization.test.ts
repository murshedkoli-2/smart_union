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

describeWithDb('single payment scope', () => {
  it('hides another collector\'s payment behind a 404', async () => {
    const other = await PaymentService.collectPayment(paymentDto(), entrepreneurB)

    // The list filter is only half the rule: without the same check here, the
    // ids listPayments withholds were still readable one at a time.
    await expect(
      PaymentService.getPaymentById(String(other._id), entrepreneurA),
    ).rejects.toThrow('Payment not found')
  })

  it('lets an entrepreneur read their own payment', async () => {
    const own = await PaymentService.collectPayment(paymentDto(), entrepreneurA)
    const found = await PaymentService.getPaymentById(String(own._id), entrepreneurA)
    expect(String(found._id)).toBe(String(own._id))
  })

  it('lets a secretary read any payment', async () => {
    const other = await PaymentService.collectPayment(paymentDto(), entrepreneurB)
    const found = await PaymentService.getPaymentById(String(other._id), secretary)
    expect(String(found._id)).toBe(String(other._id))
  })

  it('hides another collector\'s tax receipt too', async () => {
    const other = await PaymentService.collectPayment(
      { ...paymentDto(), payment_type: 'tax', source_type: 'tax' },
      entrepreneurB,
    )

    await expect(
      PaymentService.getTaxPaymentReceiptData(String(other._id), entrepreneurA),
    ).rejects.toThrow('Payment not found')
  })
})
