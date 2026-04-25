import type { Role } from '@concert-crawl/types'

declare global {
  // Augments Clerk's session claims type with our custom JWT template fields.
  // The Clerk dashboard session token template includes:
  //   { "metadata": "{{user.public_metadata}}" }
  // Used by the API's requireRole middleware and any JWT-based role checks.
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: Role
    }
  }

  // Augments Clerk's user publicMetadata type.
  // Used by currentUser().publicMetadata in web server components and actions.
  interface UserPublicMetadata {
    role?: Role
  }
}
