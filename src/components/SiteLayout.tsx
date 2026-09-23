import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Modal } from '@arco-design/web-react';
import { Icon } from './Icon';
import { games } from '../catalog/games';
import styles from './SiteLayout.module.css';

export function SiteLayout({ children }: { children: ReactNode }) {
  const [aboutOpen, setAboutOpen] = useState(false);
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
          <button onClick={() => setAboutOpen(true)}>关于游间<sup>↗</sup></button>
        </nav>
        <span className={styles.desktopNote}><Icon name="monitor" size={17} />为电脑上的休息时间而生</span>
      </div>
    </header>
    {children}
    <footer className={styles.footer}>
      <div><span className={styles.footerBrand}>游间 <span>PLAYROOM</span></span><span className={styles.separator}>/</span>小小的游戏，大大的好心情。</div>
      <span>Made for a little break <Icon name="heart" size={14} /></span>
    </footer>
    <Modal title="欢迎来到游间" visible={aboutOpen} onCancel={() => setAboutOpen(false)}
      footer={null} style={{ width: 440 }} unmountOnExit>
      <div className={styles.about}>
        <span className={styles.aboutMark}><Icon name="gamepad" size={34} /></span>
        <p>这里是一个留给小游戏和好奇心的角落。忙碌之余，给自己一点轻松的时间。</p>
        <p>{games.some((game) => game.status === 'available')
          ? '选择一款已开放的游戏，直接在电脑浏览器中体验。标注「演示」或「即将上线」的内容暂未开放。'
          : '目前开放的是游戏大厅预览，具体游戏尚未上线。未来的游戏可以直接在电脑浏览器中体验。'}</p>
      </div>
    </Modal>
  </>;
}
