// Shown on the admin users list page

export const COPY = {
  page: {
    title: 'Users',
    subtitle: (total: number) => `${total} total · manage role assignments`,
  },
} as const
