/**
 * Visible phone/desktop viewport size.
 * iOS 100vh is taller than the browser chrome; visualViewport is the real canvas.
 */

export function viewW() {
  return Math.round(window.visualViewport?.width ?? window.innerWidth);
}

export function viewH() {
  const vv = window.visualViewport;
  const visual = vv ? Math.round(vv.height + (vv.offsetTop || 0)) : 0;
  return Math.round(Math.max(
    window.innerHeight || 0,
    visual,
    document.documentElement?.clientHeight || 0,
  ));
}

export function bindViewportFill() {
  const apply = () => {
    const fill = Math.round(Math.max(
      window.innerHeight || 0,
      window.screen?.height || 0,
    ));
    document.documentElement.style.setProperty('--app-h', `${fill}px`);
  };
  apply();
  window.addEventListener('resize', apply);
  window.visualViewport?.addEventListener('resize', apply);
  window.visualViewport?.addEventListener('scroll', apply);
}
