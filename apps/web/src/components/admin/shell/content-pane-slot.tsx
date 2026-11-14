'use client';

import { createContext, useContext } from 'react';

/**
 * The desktop content pane's slot: a `display: contents` element at the end
 * of the pane's scroller, so whatever is portalled into it is laid out as the
 * scroller's own last child. A bar pinned there (`position: sticky`) spans
 * the pane edge to edge and stops at its scrollbar, free of any page's width
 * cap. Null on the phone and outside the shell.
 */
export const ContentPaneSlotContext = createContext<HTMLElement | null>(null);

export const useContentPaneSlot = () => useContext(ContentPaneSlotContext);
