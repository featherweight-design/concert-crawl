import { Copy, LogOut, Printer, RotateCcw, Tag, Users, X } from 'lucide-react';

/** The drawn icon per invite-code and person menu item (`07/code-row-menu`). */
export const MENU_ICONS = {
  signOut: LogOut,
  copy: Copy,
  poster: Printer,
  joined: Users,
  edit: Tag,
  // The drawn X (`07/code-row-menu`), not the forbidden-circle Ban.
  revoke: X,
  reactivate: RotateCcw,
  // `A3/12/person-menu-d`: See their Submitted prices draws the price tag.
  prices: Tag,
} as const;
