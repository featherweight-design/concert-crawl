import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ROLE_HIERARCHY, isRole } from '@concert-crawl/types'
import type { Role, AuthUser } from '@concert-crawl/types'

// Returns the current Clerk user mapped to our AuthUser shape.
// Redirects to /sign-in if unauthenticated.
export async function getCurrentUser(): Promise<AuthUser> {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  const rawRole = user.publicMetadata['role']
  const role: Role = isRole(rawRole) ? rawRole : 'user'

  return {
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress ?? '',
    role,
    firstName: user.firstName,
    lastName: user.lastName,
  }
}

// Asserts the current user has at least the given role.
// Redirects to / if insufficient permissions.
export async function requireRole(minimumRole: Role): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (ROLE_HIERARCHY.indexOf(user.role) < ROLE_HIERARCHY.indexOf(minimumRole)) {
    redirect('/')
  }

  return user
}

// Returns the raw Clerk auth object (userId, sessionId, etc.)
// Use in Server Actions and Route Handlers.
export { auth }
