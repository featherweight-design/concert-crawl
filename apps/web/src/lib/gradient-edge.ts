// The gradient edge the B+ cards wear: a 1px border that fades from the
// theme's signal through its accent to the plain border colour, drawn as the
// boards do it, with a transparent border and two backgrounds (the fill on the
// padding box, the gradient on the border box). Spread it into a card's style.
//
// The countdown pill, the price cards and the "Your move" / "That night" card
// all use it, so the edge reads the same on every one of them.

export const GRADIENT_EDGE =
  'linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border))';

export const gradientEdge = (
  fill: string = 'var(--surface-1)',
): { border: string; background: string } => ({
  border: '1px solid transparent',
  background: `linear-gradient(${fill}, ${fill}) padding-box, ${GRADIENT_EDGE} border-box`,
});
