// The thin accent bar the My shows route fallbacks have always shown at the top
// of the viewport while a navigation resolves. Kept as it was, only shared.

export const NavProgress = () => (
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      height: 2,
      background: 'var(--accent)',
      animation: 'navProgress 3s ease-out forwards',
      zIndex: 9999,
    }}
  />
);
