import { useState } from 'react';
import { Link } from 'react-router-dom';
import { categories, gamePath, type Game } from '../catalog/model';
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
  const category = categories.find(({ id }) => id === game.category)!;
  return <article className={styles.card} aria-label={game.name}>
    <div className={styles.cover}>
      <GameCover game={game} />
      {playable && <Link to={gamePath(game)} target="_blank" rel="noopener noreferrer" className={styles.coverLink} aria-label={`进入${game.name}`} />}
    </div>
    <div className={styles.content}>
      <div className={styles.titleRow}><h3>{game.name}</h3><span className={styles.category}>{category.shortLabel}</span></div>
      <p>{game.description}</p>
    </div>
  </article>;
}
