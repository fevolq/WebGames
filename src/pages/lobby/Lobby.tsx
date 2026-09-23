import { useRef } from 'react';
import { ConfigProvider, Input } from '@arco-design/web-react';
import '@arco-design/web-react/es/Input/style/css.js';
import { games } from '../../catalog/games';
import { categories } from '../../catalog/model';
import { filterGames } from '../../catalog/search';
import { GameCard } from '../../components/GameCard';
import { Icon } from '../../components/Icon';
import { LobbyLayout } from './LobbyLayout';
import { useLobbyFilters } from './useLobbyFilters';
import styles from './Lobby.module.css';

export default function Lobby() {
  const { category, query, hasFilters, setCategory, setQuery, clearFilters } = useLobbyFilters();
  const filtered = filterGames(games, category, query);
  const sectionRef = useRef<HTMLElement>(null);

  function browseGames() {
    sectionRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    sectionRef.current?.focus({ preventScroll: true });
  }

  return <ConfigProvider><LobbyLayout><main className={styles.main} id="main-content" tabIndex={-1}>
    <section className={styles.hero} aria-labelledby="welcome-heading">
      <div className={styles.heroCopy}>
        <div className={styles.eyebrow}><span />A LITTLE BREAK, A LOT OF FUN.</div>
        <h1 id="welcome-heading">给大脑放个<span className={styles.titleAccent}>小假<svg viewBox="0 0 140 14" aria-hidden="true"><path d="M4 10Q60 0 135 6" /></svg></span>。</h1>
        <p>把忙碌暂停一下。<br />在小游戏里，找回简单的快乐。</p>
        <button className={styles.browse} onClick={browseGames}>逛逛游戏<Icon name="arrow" size={18} /></button>
      </div>
      <img className={styles.heroArt} src="/art/playroom.svg" width="660" height="380" alt="手柄、游戏卡带和数字方块组成的彩色游戏角落" />
      <span className={styles.heroStamp}>PRESS PAUSE.<br /><strong>LET'S PLAY.</strong><span>✳</span></span>
    </section>

    <section id="all-games" className={styles.catalog} ref={sectionRef} tabIndex={-1} aria-labelledby="catalog-heading">
      <div className={styles.sectionTop}>
        <div className={styles.sectionHeading}><span className={styles.headingIcon}><Icon name="grid" size={19} /></span><h2 id="catalog-heading">发现你的下一份快乐</h2><span className={styles.total}>{games.length} 款游戏</span></div>
      </div>
      <div className={styles.toolbar}>
        <div className={styles.categories} role="group" aria-label="游戏分类">
          {categories.map((item) => <button key={item.id} aria-pressed={category === item.id}
            className={category === item.id ? styles.selected : undefined}
            onClick={() => setCategory(item.id)}>
            <Icon name={item.icon} size={16} />{item.label}
          </button>)}
        </div>
        <Input className={styles.search} value={query} onChange={setQuery}
          aria-label="搜索游戏" placeholder="搜索名称、标签…" allowClear maxLength={100}
          prefix={<Icon name="search" size={17} />} />
      </div>
      <div className={styles.resultLine} aria-live="polite" aria-atomic="true">
        {hasFilters && <>
          <span>找到 {filtered.length} 款游戏</span>
          <button onClick={clearFilters}>清除筛选</button>
        </>}
      </div>
      {filtered.length > 0 ? <div className={styles.grid}>{filtered.map((game) => <GameCard key={game.slug} game={game} />)}</div>
        : <div className={styles.empty}>
          <span className={styles.emptyIcon}><Icon name={games.length === 0 ? 'gamepad' : 'search'} size={34} /></span>
          <h3>{games.length === 0 ? '好玩的，正在路上' : '还没找到这款游戏'}</h3>
          <p>{games.length === 0 ? '游戏大厅正在准备新内容，稍后再来看看吧。' : '试试其他关键词，或看看全部游戏。'}</p>
          {hasFilters && <button onClick={clearFilters}>查看全部游戏<Icon name="arrow" size={16} /></button>}
        </div>}
      <div className={styles.endNote}><span />{hasFilters ? '慢慢挑，总有一种快乐适合你' : '更多小小的快乐，正在酝酿中'}<Icon name="gamepad" size={17} /><span /></div>
    </section>
  </main></LobbyLayout></ConfigProvider>;
}
