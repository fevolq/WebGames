import { useRef } from 'react';
import { Input } from '@arco-design/web-react';
import { useSearchParams } from 'react-router-dom';
import { categories, filterGames, games, isCategory } from '../../catalog/games';
import { GameCard } from '../../components/GameCard';
import { Icon } from '../../components/Icon';
import styles from './Lobby.module.css';

export default function Lobby() {
  const [params, setParams] = useSearchParams();
  const rawCategory = params.get('category');
  const category = isCategory(rawCategory) ? rawCategory : 'all';
  const query = params.get('q') ?? '';
  const filtered = filterGames(games, category, query);
  const sectionRef = useRef<HTMLElement>(null);
  const hasFilters = category !== 'all' || query.trim() !== '';

  function updateFilter(key: string, value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value && value !== 'all') next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true, preventScrollReset: true });
  }

  function browseGames() {
    sectionRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    sectionRef.current?.focus({ preventScroll: true });
  }

  return <main className={styles.main} id="main-content" tabIndex={-1}>
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
            onClick={() => updateFilter('category', item.id)}>
            <Icon name={item.icon} size={16} />{item.label}
          </button>)}
        </div>
        <Input className={styles.search} value={query} onChange={(value) => updateFilter('q', value)}
          aria-label="搜索游戏" placeholder="搜索名称、标签…" allowClear maxLength={100}
          prefix={<Icon name="search" size={17} />} />
      </div>
      <div className={styles.resultLine} aria-live="polite" aria-atomic="true">
        {hasFilters && <>
          <span>找到 {filtered.length} 款游戏</span>
          <button onClick={() => setParams({}, { replace: true })}>清除筛选</button>
        </>}
      </div>
      {filtered.length > 0 ? <div className={styles.grid}>{filtered.map((game) => <GameCard key={game.slug} game={game} />)}</div>
        : <div className={styles.empty}>
          <span className={styles.emptyIcon}><Icon name={games.length === 0 ? 'gamepad' : 'search'} size={34} /></span>
          <h3>{games.length === 0 ? '好玩的，正在路上' : '还没找到这款游戏'}</h3>
          <p>{games.length === 0 ? '游戏大厅正在准备新内容，稍后再来看看吧。' : '试试其他关键词，或看看全部游戏。'}</p>
          {hasFilters && <button onClick={() => setParams({}, { replace: true })}>查看全部游戏<Icon name="arrow" size={16} /></button>}
        </div>}
      <div className={styles.endNote}><span />{hasFilters ? '慢慢挑，总有一种快乐适合你' : '更多小小的快乐，正在酝酿中'}<Icon name="gamepad" size={17} /><span /></div>
    </section>
  </main>;
}
