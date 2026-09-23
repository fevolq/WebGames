import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconSettings } from '@arco-design/web-react/icon';
import { Link } from 'react-router-dom';
import styles from './GameSettings.module.css';

// Navigation only: this floating control never reads or changes game state.
export function GameSettings() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const returnLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    returnLink.current?.focus({ preventScroll: true });
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  return createPortal(<div ref={root} className={styles.hotspot} data-open={open || undefined}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    onKeyDown={(event) => {
      // Keys used in navigation must not also steer a game listening on window.
      event.stopPropagation();
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus({ preventScroll: true });
      }
    }} onKeyUp={(event) => event.stopPropagation()}>
    <button ref={trigger} className={styles.trigger} type="button" aria-label="游戏设置"
      aria-expanded={open} aria-controls="game-settings-panel" onClick={() => setOpen((value) => !value)}>
      <IconSettings style={{ width: 21, height: 21 }} strokeWidth={3.2} />
    </button>
    {open && <nav id="game-settings-panel" className={styles.panel} aria-label="游戏设置菜单">
      <Link ref={returnLink} to="/" className={styles.action}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20 12H4m6-6-6 6 6 6" /></svg>
        返回游戏大厅
      </Link>
    </nav>}
  </div>, document.body);
}
