import { useEffect, useState } from 'react';
import { useAutoPause, useGameInterval, useGameKeys, useOverlayFocus } from '../_shared/input';
import { createGame, SIZE, tick, turn, type Direction } from './engine';
import { readBest, writeBest } from './record';
import styles from './Game.module.css';

const directions: Record<string, Direction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };

export default function Snake() {
  const [game, setGame] = useState(() => createGame(Math.random()));
  const [best, setBest] = useState(readBest);
  const [saved, setSaved] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [confirm, setConfirm] = useState(false);
  const overlay = useOverlayFocus(game.status !== 'running' || confirm);
  const pause = () => setGame((current) => current.status === 'running' ? { ...current, status: 'paused' } : current);
  useAutoPause(pause);
  useGameInterval(() => { const random = Math.random(); setGame((current) => tick(current, random)); }, game.status === 'running' && !confirm ? Math.max(55, (165 - Math.floor(game.score / 50) * 12) * [1.35, 1, .75][speed]) : null);
  useEffect(() => { setBest((value) => Math.max(value, game.score)); }, [game.score]);
  useEffect(() => { setSaved(writeBest(best)); }, [best]);
  function start() { setGame((current) => ({ ...current, status: 'running' })); }
  function restart() { setGame({ ...createGame(Math.random()), status: 'running' }); setConfirm(false); }
  useGameKeys((key, repeat) => {
    if (confirm) return false;
    const direction = directions[key] ?? directions[key.toLowerCase()];
    if (direction && game.status === 'running') { if (!repeat) setGame((current) => turn(current, direction)); return true; }
    if ((key === ' ' || key.toLowerCase() === 'p') && !repeat && (game.status === 'running' || game.status === 'paused')) { if (game.status === 'running') pause(); else start(); return true; }
    return false;
  });
  const title = confirm ? '重新开始这一局？' : game.status === 'ready' ? '一起绕个弯吧' : game.status === 'paused' ? '歇一下，等你回来' : game.status === 'won' ? '整个花园都是你的！' : '下次，再多吃一口';
  return <main id="main-content" className={styles.room}>
    <div className={styles.handheld}>
      <div className={styles.brand}><h1>贪吃蛇 <span>SNAKE</span></h1><div><i data-on={game.status === 'running'} /> {game.status === 'running' ? 'PLAY' : 'STANDBY'}</div></div>
      <div className={styles.hardware}>
        <section className={styles.screenFrame} aria-label="贪吃蛇游戏">
          <div className={styles.screen}>
            <div className={styles.hud}><span>SCORE <b aria-label="本局得分">{String(game.score).padStart(4, '0')}</b></span><span>HI <b aria-label="最高纪录">{String(best).padStart(4, '0')}</b></span></div>
            <div className={styles.board}>
              <svg viewBox="0 0 400 400" role="img" aria-label={`贪吃蛇棋盘，长度 ${game.snake.length}，得分 ${game.score}`}>
                <defs><pattern id="snake-pixels" width="20" height="20" patternUnits="userSpaceOnUse"><rect x="1" y="1" width="18" height="18" fill="#293d2110" /></pattern></defs>
                <rect width="400" height="400" fill="url(#snake-pixels)" />
                {game.food !== null && <g transform={`translate(${(game.food % SIZE) * 20},${Math.floor(game.food / SIZE) * 20})`}><path d="M8 1h4v5h5v4h3v5h-4v4H4v-4H0v-5h3V6h5Z" fill="#344628" /><path d="M9 9h5v5H9Z" fill="#c1cf9f" /></g>}
                {[...game.snake].reverse().map((cell, index) => <g key={cell}><rect x={(cell % SIZE) * 20 + 1} y={Math.floor(cell / SIZE) * 20 + 1} width="18" height="18" rx="2" fill={index === game.snake.length - 1 ? '#273d20' : '#526c3c'} /><rect x={(cell % SIZE) * 20 + 4} y={Math.floor(cell / SIZE) * 20 + 4} width="12" height="12" rx="1" fill="none" stroke="#c1cf9f" strokeOpacity=".4" /></g>)}
                <g transform={`translate(${(game.snake[0] % SIZE) * 20 + 10},${Math.floor(game.snake[0] / SIZE) * 20 + 10}) rotate(${({ up: -90, right: 0, down: 90, left: 180 })[game.direction]})`}><rect x="1" y="-6" width="4" height="4" fill="#c1cf9f" /><rect x="1" y="2" width="4" height="4" fill="#c1cf9f" /></g>
              </svg>
              {(game.status !== 'running' || confirm) && <div ref={overlay} className={styles.message} role="region" aria-label={title}>
                <div className={styles.pixelSnake} aria-hidden="true">▪▪▪<br />　▪<br />▪▪▪</div>
                <h2>{title}</h2><p>{confirm ? '本局会重置，最高纪录会保留。' : game.status === 'ready' ? '吃到果实 +10 分。别撞墙，也别咬到自己。' : game.status === 'paused' ? '按 P 或点击继续。' : `SCORE ${game.score} / LENGTH ${game.snake.length}`}</p>
                <button onClick={confirm || game.status === 'lost' || game.status === 'won' ? restart : start}>{confirm ? '开始新一局' : game.status === 'ready' ? '开始游戏' : game.status === 'paused' ? '继续游戏' : '再来一局'}</button>
                {confirm && <button onClick={() => setConfirm(false)}>取消重开</button>}
              </div>}
            </div>
            <div className={styles.screenFooter}><span>LENGTH <b aria-label="蛇身长度">{game.snake.length}</b></span><span>20 × 20</span></div>
          </div>
          <p className={styles.screenLabel}>DOT MATRIX DISPLAY</p>
        </section>
        <aside className={styles.controls}>
          <span className={styles.controlLabel}>DIRECTION</span>
          <div className={styles.pad} role="group" aria-label="方向控制">{(['up','left','down','right'] as Direction[]).map(direction => <button key={direction} className={styles[direction]} aria-label={`向${({up:'上',down:'下',left:'左',right:'右'})[direction]}转弯`} disabled={game.status !== 'running' || confirm} onClick={() => setGame(current => turn(current,direction))}>{({up:'▲',down:'▼',left:'◀',right:'▶'})[direction]}</button>)}<span /></div>
          <p className={styles.keyHint}>方向键 / WASD</p>
          <div className={styles.roundButtons}>
            <div><button aria-label={game.status === 'paused' ? '继续游戏' : '暂停游戏'} disabled={confirm || !['running','paused'].includes(game.status)} onClick={game.status === 'running' ? pause : start}>Ⅱ</button><span>PAUSE · 空格 / P</span></div>
            <div><button aria-label="重新开始" disabled={confirm} onClick={() => { pause(); setConfirm(true); }}>↻</button><span>RESTART</span></div>
          </div>
          <div className={styles.speed} role="group" aria-label="游戏速度"><span>初始速度</span>{['慢速','标准','快速'].map((label,index) => <button key={label} aria-pressed={speed === index} disabled={game.status !== 'ready'} onClick={() => setSpeed(index)}>{label}</button>)}</div>
          <div className={styles.speaker} aria-hidden="true"><i /><i /><i /><i /><i /></div>
        </aside>
      </div>
      <div className={styles.bottom}><span>每吃 5 个果实，速度提升一档。</span><span>{saved ? '最高纪录已保存' : '浏览器无法保存最高纪录，本局仍可正常游玩。'}</span></div>
    </div>
    <span className={styles.srOnly} role="status">{game.status === 'lost' ? '游戏结束' : game.status === 'won' ? '游戏获胜' : game.status === 'paused' ? '游戏已暂停' : ''}</span>
  </main>;
}
