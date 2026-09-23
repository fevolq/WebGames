import type { CSSProperties } from 'react';

const paths = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  gamepad: <><path d="M7 7h10c2 0 3 2 3.5 4l1 6c.4 2-2 3-3.5 1l-2-2H8l-2 2c-1.5 2-4 1-3.5-1l1-6C4 9 5 7 7 7Z" /><path d="M6 11h5M8.5 8.5v5M16 10h.1M18 13h.1" /></>,
  puzzle: <path d="M4 4h6c-1-3 5-3 4 0h6v6c3-1 3 5 0 4v6h-6c1-3-5-3-4 0H4v-6c3 1 3-5 0-4Z" />,
  coffee: <><path d="M4 8h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5ZM17 9h2a3 3 0 0 1 0 6h-2M7 3v2M12 3v2" /></>,
  bolt: <path d="m13 2-9 12h7l-1 8 10-13h-7Z" />,
  flag: <><path d="M5 22V3c4-3 8 3 14 0v11c-6 3-10-3-14 0" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  arrowDown: <path d="M12 4v16m-6-6 6 6 6-6" />,
  monitor: <><rect x="3" y="3" width="18" height="13" rx="2" /><path d="M8 21h8M12 16v5" /></>,
  keyboard: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M6 9h.1M10 9h.1M14 9h.1M18 9h.1M6 12h.1M10 12h.1M14 12h.1M18 12h.1M7 16h10" /></>,
  mouse: <><rect x="6" y="2" width="12" height="20" rx="6" /><path d="M12 2v7" /></>,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  heart: <path d="M20 4c-3-2-6 0-8 2-2-2-5-4-8-2-6 5 1 12 8 17 7-5 14-12 8-17Z" />,
  back: <path d="M20 12H4m6-6-6 6 6 6" />,
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 20, className, style }: {
  name: IconName; size?: number; className?: string; style?: CSSProperties;
}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    className={className} style={style}>{paths[name]}</svg>;
}
