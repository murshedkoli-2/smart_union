import { errorResponse } from '@/lib/utils/api-response'
import { ForbiddenError } from '@/lib/utils/errors'
import type { AuthenticatedHandler, AuthenticatedRequest, RouteContext } from '@/types/api.types'
import type { Role } from '@/constants/roles'
import type { Permission } from '@/constants/permissions'

/**
 * Role and permission gate.
 * - Checks req.user.role is in allowed roles
 * - If permission is specified AND role is 'entrepreneur':
 *   checks req.user.permissions.includes(permission)
 * - secretary always passes all permission checks
 *
 * Usage: authorize(['secretary', 'entrepreneur'], 'citizen.create')(handler)
 */
export function authorize(
  roles: Role[],
  permission?: Permission,
): (handler: AuthenticatedHandler) => AuthenticatedHandler {
  return (handler: AuthenticatedHandler): AuthenticatedHandler => {
    return async (req: AuthenticatedRequest, ctx: RouteContext) => {
      try {
        const { role, permissions } = req.user

        // Role check
        if (!roles.includes(role)) {
          throw new ForbiddenError('You do not have permission to access this resource')
        }

        // Permission check (only admins have granular permissions; secretary bypasses)
        if (permission && role === 'entrepreneur') {
          if (!permissions.includes(permission)) {
            throw new ForbiddenError(
              `Missing required permission: ${permission}`,
            )
          }
        }

        return await handler(req, ctx)
      } catch (err) {
        return errorResponse(err)
      }
    }
  }
}
