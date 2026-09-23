import { useEffect, useLayoutEffect, useRef } from 'react';

// Lifecycle helpers only; callers own all runtime state.
export function useGameKeys(onKey: (key: string, repeat: boolean) => boolean) {
  const callback = useRef(onKey);
  useLayoutEffect(() => { callback.current = onKey; });
  useEffect(() => {
    function handle(event: KeyboardEvent) {
      const target = event.target;
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing
        || (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select')))
        || (event.key === ' ' && target instanceof HTMLElement && target.closest('button, a'))) return;
      if (callback.current(event.key, event.repeat)) event.preventDefault();
    }
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);
}

export function useGameInterval(onTick: () => void, delay: number | null) {
  const callback = useRef(onTick);
  useLayoutEffect(() => { callback.current = onTick; });
  useEffect(() => {
    if (delay === null) return;
    const timer = window.setInterval(() => callback.current(), delay);
    return () => window.clearInterval(timer);
  }, [delay]);
}

export function useAutoPause(onPause: () => void) {
  const callback = useRef(onPause);
  useLayoutEffect(() => { callback.current = onPause; });
  useEffect(() => {
    const pause = () => callback.current();
    const visibility = () => { if (document.hidden) pause(); };
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
}

// A game supplies its own overlay markup, controls and appearance.
export function useOverlayFocus(visible: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!visible) return;
    const previous = document.activeElement;
    ref.current?.querySelector('button')?.focus({ preventScroll: true });
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true }); };
  }, [visible]);
  return ref;
}
