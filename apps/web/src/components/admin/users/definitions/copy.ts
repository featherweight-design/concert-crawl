// Shown on the admin users page

export const COPY = {
  columns: {
    emailHandle: 'Email / Handle',
    role: 'Role',
    joined: 'Joined',
    assignRole: 'Assign role',
  },
  roleSelect: {
    ariaLabel: 'Assign role',
    errorFallback: 'Failed to update role',
  },
  summary: {
    userSingular: 'user',
    userPlural: 'users',
  },
  empty: 'No users found.',
  pagination: (shown: number, total: number) =>
    `Showing ${shown} of ${total}. Use the API limit/offset params for pagination.`,
} as const
