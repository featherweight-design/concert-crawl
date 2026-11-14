'use client';

// The route error boundary for every page in the app shell (addendum-2 §18,
// board 18-error-page/error-in-app-m). Living at (main) means the boundary
// renders inside MainLayout, so the app header and bottom nav stay; an error
// the layout itself throws still reaches the bare (protected)/error.tsx.
//
// Desktop is not drawn. It follows §18's own rule, "The error, the Tell us
// card and the error ID are the same as the standalone page.": the standalone
// page's desktop layout, under the app header.
import { InAppError } from '@/components/standalone-error/InAppError';

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <InAppError error={error} reset={reset} logLabel="[app error]" />;
}
