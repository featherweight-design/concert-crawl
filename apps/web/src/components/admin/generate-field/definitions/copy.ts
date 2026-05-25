// Shown on admin venue detail forms — AI field generation button

export const COPY = {
  idle: {
    generateButton: 'Generate with AI',
  },
  loading: {
    label: 'Generating…',
    estimatedTime: '~3–5s',
    cancel: 'Cancel',
  },
  review: {
    suggestedLabel: 'suggested',
    llmBadge: 'llm',
    sourcesPrefix: 'SOURCES: ',
    accept: 'Accept',
    regenerate: 'Regenerate',
    discard: 'Discard',
  },
  accepted: {
    label: 'generated · accepted',
  },
  error: {
    fallback: 'Generation failed',
    retry: 'retry',
  },
} as const
