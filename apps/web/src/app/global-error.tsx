'use client';

import { useEffect } from 'react';
import {
  StandaloneError,
  useErrorId,
} from '@/components/consumer/standalone-error';
import { STANDALONE_ERROR_COPY } from '@/components/consumer/standalone-error/definitions/copy';
import { THEME_PREPAINT_SCRIPT } from '@/components/consumer/standalone-error/lib/styles';

/**
 * The root layout itself failed, so nothing it provides is here: no Clerk,
 * no theme provider, no fonts, no globals.css. The page brings its own
 * `<html>`, theme and styles, and a retry is a full reload because there is
 * no layout left to re-render into.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const errorId = useErrorId(error);

  useEffect(() => {
    console.error('[global error]', error);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{STANDALONE_ERROR_COPY.heading}</title>
        <script dangerouslySetInnerHTML={{ __html: THEME_PREPAINT_SCRIPT }} />
      </head>
      <body style={{ margin: 0 }}>
        <StandaloneError
          errorId={errorId}
          onRetry={() => window.location.reload()}
        />
      </body>
    </html>
  );
}
