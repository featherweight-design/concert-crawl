import type { PricedModelId } from './cost.js';

// The model each crawler LLM caller sends, in one place so the call and the
// cost it records read the same constant and can't drift. `satisfies` makes an
// id without rates in MODEL_RATES a compile error. Kept out of the extractor
// module so tests that mock it still see these.

/** The cascade's extraction step and the artist adjudicator. */
export const LLM_EXTRACTION_MODEL =
  'claude-haiku-4-5-20251001' satisfies PricedModelId;

/** The genre tagger. */
export const GENRE_TAG_MODEL =
  'claude-haiku-4-5-20251001' satisfies PricedModelId;
