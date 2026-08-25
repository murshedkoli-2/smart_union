/** The dashboard stats payload, as GET /api/dashboard/stats returns it. */

export interface DashboardActivity {
  _id: string
  action: string
  target_model: string
  status: string
  createdAt: string
  user_id: { name: string; role: string } | null
}

export interface DashboardStats {
  fiscal_year: string
  /** True when the signed-in user is a citizen, which is a different screen. */
  is_citizen?: boolean
  /** Absent when the citizen has not created their profile yet. */
  citizen_status?: string
  users?: { total: number; pending: number; admins: number }
  citizens?: { total: number; pending: number; approved: number }
  certificates: { total: number; pending: number; approved: number }
  tax: { total: number; paid: number; unpaid: number }
  relief?: { active_programs: number }
  recent_activity?: DashboardActivity[]
}
