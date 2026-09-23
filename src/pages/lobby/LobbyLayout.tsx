import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import styles from './LobbyLayout.module.css';

export function LobbyLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  return <div className={styles.layout}>
    <a className={styles.skipLink} href="#main-content">跳转到主要内容</a>
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
  </div>;
}
