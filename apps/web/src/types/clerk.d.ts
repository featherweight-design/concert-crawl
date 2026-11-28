import type { Role } from '@concert-crawl/types';

declare global {
  // Augments Clerk's session claims type with our custom JWT template fields.
  // The Clerk dashboard session token template includes:
  //   { "metadata": "{{user.public_metadata}}", "created_at": "{{user.created_at}}" }
  // `metadata` feeds the API's requireRole middleware and any JWT-based role
  // checks; `created_at` (ms epoch) and `metadata.onboardedAt` feed the proxy's
  // onboarding rule (lib/auth/onboarding-required.ts), which parses them.
  interface CustomJwtSessionClaims {
    created_at?: number;
    metadata?: {
      role?: Role;
      onboardedAt?: string;
    };
  }

  // Augments Clerk's user publicMetadata type.
  // Used by currentUser().publicMetadata in web server components and actions.
  interface UserPublicMetadata {
    role?: Role;
    /** ISO time the tour was finished or skipped; set by POST /v1/me/onboarded. */
    onboardedAt?: string;
  }
}
