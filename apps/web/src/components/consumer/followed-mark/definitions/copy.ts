// Reviewed through copy-review. Wording is the #750 addendum-8 §6 board's
// (06-following/follow-*); the line is set uppercase by the component, so the
// strings here stay sentence case.
export const FOLLOWED_COPY = {
  line: {
    one: (name: string) => `You follow ${name}`,
    two: (first: string, second: string) => `You follow ${first} & ${second}`,
    many: (count: number) => `You follow ${count} acts on this bill`,
  },
} as const;
