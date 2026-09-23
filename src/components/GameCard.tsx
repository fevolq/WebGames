import { useState } from 'react';
import { Link } from 'react-router-dom';
import { categories, gamePath, type Game } from '../catalog/games';
import { Icon } from './Icon';
import styles from './GameCard.module.css';

export function GameCover({ game }: { game: Game }) {
  const [failed, setFailed] = useState(false);
  return failed
    ? <div className={styles.coverFallback} role="img" aria-label={`${game.name}封面暂不可用`}><Icon name="gamepad" size={52} /><span>{game.name}</span></div>
    : <img className={styles.coverImage} src={game.cover} alt={`${game.name}游戏封面`} width="640" height="360" loading="lazy" onError={() => setFailed(true)} />;
}

export function GameCard({ game }: { game: Game }) {
  const playable = game.status === 'available';
  const status = game.status === 'maintenance' ? '维护中' : '即将上线';
  const category = categories.find(({ id }) => id === game.category)!;
  return <article className={styles.card} aria-label={game.name}>
    <div className={styles.cover}>
      <GameCover game={game} />
      {game.featured && <span className={styles.featured}><Icon name="star" size={12} />编辑精选</span>}
      {game.demo && <span className={styles.demo}>演示</span>}
      {playable && <Link to={gamePath(game)} className={styles.coverLink} aria-label={`进入${game.name}`}><span>进入游戏<Icon name="arrow" /></span></Link>}
    </div>
    <div className={styles.content}>
      <div className={styles.titleRow}><h3>{game.name}</h3><span className={styles.category}>{category.shortLabel}</span></div>
      <p>{game.description}</p>
      <div className={styles.bottom}>
        <span className={styles.controls}><Icon name={game.controls === '鼠标' ? 'mouse' : 'keyboard'} size={15} />{game.controls}</span>
        {playable
          ? <Link to={gamePath(game)} className={styles.play}>进入游戏<Icon name="arrow" size={15} /></Link>
          : <button className={styles.unavailable} disabled><Icon name="clock" size={13} />{status}</button>}
      </div>
    </div>
  </article>;
}
