import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useAutoPause, useGameInterval, useGameKeys, useOverlayFocus } from '../_shared/input';
import { createGame, DIFFICULTIES, flag, reveal } from './engine';
import { load, save } from './storage';
import styles from './Game.module.css';

export default function Minesweeper() {
  const [game, setGame] = useState(() => load(createGame));
  const [paused, setPaused] = useState(() => game.status === 'playing');
  const [pending, setPending] = useState<{ size: number; mines: number } | null>(null);
  const [flagMode, setFlagMode] = useState(false);
  const [saved, setSaved] = useState(true);
  const [hovered, setHovered] = useState(-1);
  const [focused, setFocused] = useState(0);
  const grid = useRef<HTMLDivElement>(null);
  const finished = game.status === 'won' || game.status === 'lost';
  const blocked = paused || pending !== null;
  const overlay = useOverlayFocus(blocked);
  useEffect(() => { setSaved(save(game)); }, [game]);
  useAutoPause(() => { if (game.status === 'playing') setPaused(true); });
  useGameInterval(() => setGame((current) => ({ ...current, elapsed: current.elapsed + 1 })), game.status === 'playing' && !blocked ? 1000 : null);
  function open(index: number) {
    if (blocked || finished) return;
    const seed = Math.floor(Math.random() * 4294967296);
    setGame((current) => flagMode ? flag(current, index) : reveal(current, index, seed));
  }
  function requestNew(size: number, mines: number) {
    if (game.status === 'ready' || finished) { setGame(createGame(size, mines)); setPaused(false); setFocused(0); setFlagMode(false); }
    else { setPaused(true); setPending({ size, mines }); }
  }
  function restart() { if (pending) { setGame(createGame(pending.size, pending.mines)); setPending(null); setPaused(false); setFocused(0); setFlagMode(false); } }
  useGameKeys((key, repeat) => {
    if (key.toLowerCase() !== 'p' || repeat || game.status !== 'playing' || pending) return false;
    setPaused(value => !value);
    return true;
  });
  const remaining = game.mines - game.flagged.filter(Boolean).length;
  return <main id="main-content" className={styles.desk}>
    <div className={styles.workbench}>
      <aside className={styles.instruments}>
        <span className={styles.eyebrow}>MINE SURVEY</span><h1>扫雷<span>每一步，都有线索。</span></h1>
        <div className={styles.counter}><span>待标记地雷</span><strong aria-label="剩余标旗">{String(remaining).padStart(2,'0')}</strong><i aria-hidden="true">⚑</i></div>
        <div className={styles.timer}><span>任务用时</span><strong aria-label="用时">{String(Math.floor(game.elapsed / 60)).padStart(2,'0')}:{String(game.elapsed % 60).padStart(2,'0')}</strong></div>
        <fieldset className={styles.difficulty}><legend>任务规模</legend>{DIFFICULTIES.map(({name,size,mines}) => <button key={size} aria-pressed={game.size === size} onClick={() => requestNew(size,mines)}><span>{name} {size}×{size}</span><small>{mines} 雷</small></button>)}</fieldset>
        <button className={styles.flagToggle} aria-pressed={flagMode} disabled={finished || blocked} onClick={() => setFlagMode(!flagMode)}><span aria-hidden="true">⚑</span>{flagMode ? '切回翻格' : '标旗模式'}<i /></button>
        <div className={styles.actions}><button disabled={game.status !== 'playing' || pending !== null} onClick={() => setPaused(!paused)}>{paused ? '继续游戏' : '暂停游戏'}</button><button disabled={pending !== null} onClick={() => requestNew(game.size,game.mines)}>重新开始</button></div>
        <p className={styles.legend}>左键翻格 · 右键 / F 标旗<br />P 暂停 · 方向键移动焦点<br />悬停数字，查看相邻格</p>
      </aside>
      <section className={styles.map} aria-label="扫雷游戏">
        <div className={styles.mapCaption}><span>安全区域勘测</span><span>{game.size} × {game.size} / {game.mines} MINES</span></div>
        <div className={styles.columns} style={{'--size':game.size} as CSSProperties} aria-hidden="true">{Array.from({length:game.size},(_,index) => <span key={index}>{String.fromCharCode(65+index)}</span>)}</div>
        <div className={styles.mapBody}>
          <div className={styles.coordinates} aria-hidden="true">{Array.from({length:game.size},(_,index) => <span key={index}>{String(index+1).padStart(2,'0')}</span>)}</div>
          <div className={styles.board}>
      <div className={styles.grid} ref={grid} onMouseLeave={() => setHovered(-1)} role="grid" aria-label="扫雷棋盘" aria-rowcount={game.size} aria-colcount={game.size} style={{ '--size': game.size } as CSSProperties} onKeyDown={(event) => {
        if (blocked || finished) return;
        const offsets: Record<string, number> = { ArrowUp: -game.size, ArrowDown: game.size, ArrowLeft: -1, ArrowRight: 1 };
        if (event.key in offsets) {
          event.preventDefault();
          const x = focused % game.size;
          if ((event.key === 'ArrowLeft' && x === 0) || (event.key === 'ArrowRight' && x === game.size - 1)) return;
          const next = focused + offsets[event.key];
          if (next >= 0 && next < game.size * game.size) { setFocused(next); grid.current?.querySelector<HTMLButtonElement>(`[data-cell="${next}"]`)?.focus(); }
        } else if (event.key.toLowerCase() === 'f') { event.preventDefault(); setGame((current) => flag(current, focused)); }
      }}>
        {Array.from({ length: game.size }, (_, row) => <div role="row" className={styles.row} key={row}>{game.board.slice(row * game.size, (row + 1) * game.size).map((value, column) => {
          const index = row * game.size + column;
          const revealed = game.revealed[index];
          const mine = finished && value === -1;
          const wrong = finished && game.flagged[index] && value !== -1;
          const text = mine ? '✹' : wrong ? '×' : game.flagged[index] ? '⚑' : revealed && value > 0 ? value : '';
          const label = mine ? '地雷' : wrong ? '错误标旗' : game.flagged[index] ? '已标旗' : revealed ? value === 0 ? '空地' : `${value} 颗相邻地雷` : '未翻开';
          return <div role="gridcell" key={index}><button data-cell={index} data-near={hovered >= 0 && game.revealed[hovered] && Math.abs(Math.floor(index / game.size) - Math.floor(hovered / game.size)) <= 1 && Math.abs(index % game.size - hovered % game.size) <= 1} onMouseEnter={() => setHovered(index)} data-value={revealed ? value : undefined} data-open={revealed || mine} data-exploded={game.exploded === index} className={styles.cell}
            tabIndex={focused === index ? 0 : -1} disabled={blocked || finished} aria-label={`第 ${row + 1} 行第 ${column + 1} 列，${label}`} onFocus={() => { setFocused(index); setHovered(index); }} onClick={() => open(index)}
            onContextMenu={(event) => { event.preventDefault(); if (!blocked && !finished) setGame((current) => flag(current, index)); }}>{text}</button></div>;
        })}</div>)}
      </div>
            {blocked && <div ref={overlay} className={styles.overlay} role="region" aria-label={pending ? '开始新的扫雷任务？' : '任务暂停，线索还在'}>
              <span aria-hidden="true" className={styles.pauseMark}>Ⅱ</span><h2>{pending ? '开始新的扫雷任务？' : '任务暂停，线索还在'}</h2><p>{pending ? '当前棋盘会被新的任务替换。' : '棋盘已遮挡，计时暂停。准备好了再继续。'}</p>
              <button className={styles.primary} onClick={pending ? restart : () => setPaused(false)}>{pending ? '开始新一局' : '继续游戏'}</button>{pending && <button onClick={() => setPending(null)}>取消重开</button>}
            </div>}
          </div>
        </div>
        <div className={styles.completion}><span>已确认安全格 <strong aria-label="安全格">{game.revealed.filter((value,index) => value && game.board[index] !== -1).length} / {game.size * game.size - game.mines}</strong></span><progress max={game.size * game.size - game.mines} value={game.revealed.filter((value,index) => value && game.board[index] !== -1).length} aria-label="安全区域进度" /></div>
        <p className={styles.status} role="status">{game.status === 'won' ? `排查完成！所有安全格已找到，用时 ${game.elapsed} 秒。` : game.status === 'lost' ? '触雷了。已展示全部地雷，可以重新开始。' : game.status === 'ready' ? '从任意一格开始，首击及周围区域保证安全。' : flagMode ? '标旗模式：点击格子插旗或取消旗帜。' : '数字是周围八格的雷数。标旗足够后，点击数字快速展开。'}</p>
        <p className={styles.save}>{saved ? '当前任务已自动保存' : '浏览器无法保存进度，本局仍可正常游玩。'}</p>
      </section>
    </div>
  </main>;
}
