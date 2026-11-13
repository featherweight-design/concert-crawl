import 'react';

declare module 'react' {
  // CSP Embedded Enforcement: the policy an iframe's document must accept.
  // React passes it through as the `csp` attribute; @types/react lacks it.
  // Used by Inspect's Page frame (components/admin/inspect/InspectFetched).
  interface IframeHTMLAttributes<T> extends HTMLAttributes<T> {
    csp?: string | undefined;
  }
}
