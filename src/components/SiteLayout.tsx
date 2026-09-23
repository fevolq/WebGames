import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from './Icon';
import styles from './SiteLayout.module.css';

export function SiteLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  return <>
    <a className="skip-link" href="#main-content">跳转到主要内容</a>
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link to="/" className={styles.brand} aria-label="游间 PLAYROOM 首页">
          <span className={styles.brandMark}><Icon name="gamepad" size={27} /></span>
          <span className={styles.brandName}>游间<span>PLAYROOM</span></span>
        </Link>
        <nav className={styles.nav} aria-label="主导航">
          <Link to="/" className={location.pathname === '/' ? styles.active : undefined}
            aria-current={location.pathname === '/' ? 'page' : undefined}>游戏大厅</Link>
        </nav>
      </div>
    </header>
    {children}
    <footer className={styles.footer}>小小的游戏，大大的好心情。</footer>
  </>;
}
