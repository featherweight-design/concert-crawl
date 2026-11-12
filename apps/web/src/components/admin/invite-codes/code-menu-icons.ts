import {
  Ban,
  Copy,
  LogOut,
  Printer,
  RotateCcw,
  Tag,
  Users,
} from 'lucide-react';

/** The drawn icon per invite-code and person menu item (`07/code-row-menu`). */
export const MENU_ICONS = {
  signOut: LogOut,
  copy: Copy,
  poster: Printer,
  joined: Users,
  edit: Tag,
  revoke: Ban,
  reactivate: RotateCcw,
} as const;
