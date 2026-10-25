const ZOOM_GESTURES = ['gesturestart', 'gesturechange', 'gestureend'];

export function installTouchGuards(doc = document, win = window) {
  const cancelGesture = event => event.preventDefault();
  const cancelPinch = event => {
    if (event.touches?.length > 1) event.preventDefault();
  };
  const cancelModifierZoom = event => {
    if ((event.ctrlKey || event.metaKey) && event.cancelable) event.preventDefault();
  };

  for (const type of ZOOM_GESTURES) doc.addEventListener(type, cancelGesture, { passive: false });
  doc.addEventListener('touchstart', cancelPinch, { passive: false });
  doc.addEventListener('touchmove', cancelPinch, { passive: false });
  win.addEventListener('wheel', cancelModifierZoom, { passive: false });

  let queued = false;
  const restorePageOrigin = () => {
    if (queued) return;
    queued = true;
    const apply = () => {
      queued = false;
      if (win.scrollX || win.scrollY) win.scrollTo(0, 0);
    };
    if (win.requestAnimationFrame) win.requestAnimationFrame(apply);
    else apply();
  };
  const visualViewport = win.visualViewport;
  visualViewport?.addEventListener('resize', restorePageOrigin, { passive: true });
  visualViewport?.addEventListener('scroll', restorePageOrigin, { passive: true });
  restorePageOrigin();

  return () => {
    for (const type of ZOOM_GESTURES) doc.removeEventListener(type, cancelGesture);
    doc.removeEventListener('touchstart', cancelPinch);
    doc.removeEventListener('touchmove', cancelPinch);
    win.removeEventListener('wheel', cancelModifierZoom);
    visualViewport?.removeEventListener('resize', restorePageOrigin);
    visualViewport?.removeEventListener('scroll', restorePageOrigin);
  };
}
