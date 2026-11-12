import type { ReactNode } from 'react';
import { Search, type LucideIcon } from 'lucide-react';
import { StateMessage } from './StateMessage';

/**
 * A title, one line and one action (plan decision 2). Pages without a drawn
 * empty state follow the nearest one: no results for lists, all clear for
 * queues.
 */
export const EmptyState = ({
  title,
  body,
  action,
  icon = Search,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) => (
  <StateMessage
    testId="empty-state"
    role="status"
    icon={icon}
    tone="var(--signal)"
    title={title}
    body={body}
    actions={action}
  />
);
