/** An admin user as the management screen lists them. */
export interface AdminUser {
  _id: string
  name: string
  email: string
  role: string
  permissions: string[]
  status: string
  last_login: string | null
  createdAt: string
}
