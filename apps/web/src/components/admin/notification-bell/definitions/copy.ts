// Shown in the admin top bar — notification bell dropdown

export const COPY = {
  button: {
    ariaLabel: 'Notifications',
    ariaLabelWithCount: (count: number) => `Notifications, ${count} unread`,
    unreadOverflow: '9+',
  },
  panel: {
    title: 'Notifications',
    markAllRead: 'Mark all read',
    empty: 'No notifications',
    markAsRead: 'Mark as read',
    viewAction: 'View →',
  },
} as const
