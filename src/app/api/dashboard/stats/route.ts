import { NextResponse } from 'next/server'
import { withDb } from '@/middleware/with-db'
import { authenticate } from '@/middleware/authenticate'
import { authorize } from '@/middleware/authorize'
import { successResponse } from '@/lib/utils/api-response'
import User from '@/models/User'
import Citizen from '@/models/Citizen'
import Certificate from '@/models/Certificate'
import Tax from '@/models/Tax'
import AuditLog from '@/models/AuditLog'
import ReliefProgram from '@/models/ReliefProgram'
import type { AuthenticatedRequest, RouteContext } from '@/types/api.types'
import { getCurrentFiscalYear } from '@/lib/utils/serial-generator'

async function handler(req: AuthenticatedRequest, _ctx: RouteContext): Promise<NextResponse> {
  const fiscalYear = getCurrentFiscalYear()

  if (req.user.role === 'citizen') {
    const citizenDoc = await Citizen.findOne({ user_id: req.user.sub }).lean()
    
    if (!citizenDoc) {
      return successResponse({
        is_citizen: true,
        fiscal_year: fiscalYear,
        certificates: { total: 0, pending: 0, approved: 0 },
        tax: { total: 0, paid: 0, unpaid: 0 },
        applications: { pending: 0 },
      })
    }

    const [
      totalCertificates,
      pendingCertificates,
      approvedCertificates,
      totalTax,
      paidTax,
    ] = await Promise.all([
      Certificate.countDocuments({ citizen_id: citizenDoc._id }),
      Certificate.countDocuments({ citizen_id: citizenDoc._id, status: 'pending' }),
      Certificate.countDocuments({ citizen_id: citizenDoc._id, status: { $in: ['approved', 'locked'] } }),
      Tax.countDocuments({ citizen_id: citizenDoc._id, fiscal_year: fiscalYear }),
      Tax.countDocuments({ citizen_id: citizenDoc._id, fiscal_year: fiscalYear, status: 'paid' }),
    ])

    return successResponse({
      is_citizen: true,
      fiscal_year: fiscalYear,
      citizen_status: citizenDoc.status,
      certificates: {
        total: totalCertificates,
        pending: pendingCertificates,
        approved: approvedCertificates,
      },
      tax: { total: totalTax, paid: paidTax, unpaid: totalTax - paidTax },
    })
  }

  const [
    totalUsers,
    pendingUsers,
    totalAdmins,
    totalCitizens,
    pendingCitizens,
    approvedCitizens,
    totalCertificates,
    pendingCertificates,
    approvedCertificates,
    totalTax,
    paidTax,
    activeReliefPrograms,
    recentLogs,
  ] = await Promise.all([
    User.countDocuments({ role: { $ne: 'citizen' } }),
    User.countDocuments({ status: 'pending', role: { $ne: 'citizen' } }),
    User.countDocuments({ role: 'entrepreneur' }),
    Citizen.countDocuments({}),
    Citizen.countDocuments({ status: 'pending' }),
    Citizen.countDocuments({ status: 'approved' }),
    Certificate.countDocuments({}),
    Certificate.countDocuments({ status: 'pending' }),
    Certificate.countDocuments({ status: { $in: ['approved', 'locked'] } }),
    Tax.countDocuments({ fiscal_year: fiscalYear }),
    Tax.countDocuments({ fiscal_year: fiscalYear, status: 'paid' }),
    ReliefProgram.countDocuments({ is_active: true }),
    AuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('user_id', 'name role')
      .lean(),
  ])

  return successResponse({
    fiscal_year: fiscalYear,
    users: { total: totalUsers, pending: pendingUsers, admins: totalAdmins },
    citizens: { total: totalCitizens, pending: pendingCitizens, approved: approvedCitizens },
    certificates: {
      total: totalCertificates,
      pending: pendingCertificates,
      approved: approvedCertificates,
    },
    tax: { total: totalTax, paid: paidTax, unpaid: totalTax - paidTax },
    relief: { active_programs: activeReliefPrograms },
    recent_activity: recentLogs,
  })
}

export const GET = withDb(
  authenticate(authorize(['secretary', 'entrepreneur', 'citizen'])(handler)),
)
