import { describe, expect, it } from 'vitest';
import { AUTH_FLOW_COPY } from './copy';

// The footer's claim about the crawl matches the landing's and the invite's.
describe('AUTH_FLOW_COPY.foot.proof', () => {
  it('words the crawl as the landing does', () => {
    expect(AUTH_FLOW_COPY.foot.proof(21)).toBe(
      '21 venues · checked every night',
    );
  });

  it('keeps "venue" singular for one', () => {
    expect(AUTH_FLOW_COPY.foot.proof(1)).toBe('1 venue · checked every night');
  });
});
