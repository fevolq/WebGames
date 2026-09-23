import { useEffect, useState } from 'react';
import { useAutoPause, useGameInterval, useGameKeys, useOverlayFocus } from '../_shared/input';
import { cells, createGame, descend, hardDrop, landing, level, newPiece, rotate, shift, shuffledBag, type BlockState } from './engine';
import { load, save } from './storage';
import styles from './Game.module.css';

const colors = ['transparent', '#5ee9ed', '#ffe17d', '#b887ff', '#7aefac', '#fa759e', '#7396ff', '#ffae71'];
const bag = () => shuffledBag(Math.random);
const fresh = () => createGame([...bag(), ...bag()]);

export default function BlockDrop() {
  const [state, setState] = useState(() => load(() => ({ game: fresh(), best: 0 })));
  const [saved, setSaved] = useState(true);
  const [showGhost, setShowGhost] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const { game, best } = state;
  const overlay = useOverlayFocus(game.status !== 'running' || confirm);
  function change(action: (current: BlockState) => BlockState) {
    setState((current) => { const next = action(current.game); return next === current.game ? current : { game: next, best: Math.max(current.best, next.score) }; });
  }
  const pause = () => change((current) => current.status === 'running' ? { ...current, status: 'paused' } : current);
  const start = () => change((current) => ({ ...current, status: 'running' }));
  function restart() { const game = { ...fresh(), status: 'running' as const }; setState((current) => ({ ...current, game })); setConfirm(false); }
  function drop(hard: boolean) { const next = bag(); change((current) => hard ? hardDrop(current, next) : descend(current, next, true)); }
  useEffect(() => { setSaved(save(state)); }, [state]);
  useAutoPause(pause);
  useGameInterval(() => { const next = bag(); change((current) => descend(current, next)); }, game.status === 'running' && !confirm ? Math.max(90, 780 - (level(game) - 1) * 65) : null);
  useGameKeys((key, repeat) => {
    if (confirm) return false;
    const lower = key.toLowerCase();
    if (lower === 'p' || key === 'Escape') { if (!repeat && ['running', 'paused'].includes(game.status)) { if (game.status === 'running') pause(); else start(); } return true; }
    if (game.status !== 'running') return false;
    if (key === 'ArrowLeft' || lower === 'a') change((current) => shift(current, -1));
    else if (key === 'ArrowRight' || lower === 'd') change((current) => shift(current, 1));
    else if (key === 'ArrowDown' || lower === 's') drop(false);
    else if (key === 'ArrowUp' || lower === 'w' || lower === 'x') { if (!repeat) change((current) => rotate(current)); }
    else if (lower === 'z') { if (!repeat) change((current) => rotate(current, -1)); }
    else if (key === ' ') { if (!repeat) drop(true); }
    else return false;
    return true;
  });
  const ghost = landing(game);
  const title = confirm ? '重新堆一局？' : game.status === 'ready' ? '每一块，都有好位置' : game.status === 'paused' ? '方块已经停下' : '堆得太高啦';
  return <main id="main-content" className={styles.arcade}>
    <div className={styles.machine}>
      <aside className={styles.dashboard}>
        <span className={styles.marquee}>BLOCK<br />DROP<span>▟</span></span><h1>俄罗斯方块</h1>
        <div className={styles.score}><span>SCORE / 本局得分</span><strong aria-label="本局得分">{String(game.score).padStart(6, '0')}</strong></div>
        <div className={styles.record}><span>BEST / 最高纪录</span><strong aria-label="最高纪录">{best}</strong></div>
        <div className={styles.level}><span>LEVEL</span><strong>{String(level(game)).padStart(2, '0')}</strong><div className={styles.levelTrack}><i style={{width: `${game.lines % 10 * 10}%`}} /></div><small>再消 {10 - game.lines % 10} 行升级</small></div>
        <div className={styles.lines}><span>已消行数</span><strong aria-label="已消行数">{game.lines}</strong></div>
        <label className={styles.assist}><input type="checkbox" checked={showGhost} onChange={event => setShowGhost(event.target.checked)} /> 落点辅助</label>
        <p className={styles.keys}>← → / A D 移动<br />↑ / W 旋转 · Z 反转<br />↓ / S 加速 · 空格硬降<br />P / Esc 暂停</p>
      </aside>
      <section className={styles.well} aria-label="俄罗斯方块游戏">
        <div className={styles.board}>
          <svg viewBox="0 0 200 400" role="img" aria-label={`方块棋盘，已消除 ${game.lines} 行，等级 ${level(game)}`}>
            <defs><pattern id="blocks-grid" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#101629" /><path d="M20 0H0V20" fill="none" stroke="#7c9bdf13" /></pattern></defs><rect width="200" height="400" fill="url(#blocks-grid)" />
            {game.board.map((value,index) => value > 0 && <g key={index}><rect x={index % 10 * 20 + 1} y={Math.floor(index / 10) * 20 + 1} width="18" height="18" rx="1" fill={colors[value]} /><path d={`M${index % 10 * 20 + 3} ${Math.floor(index / 10) * 20 + 17}h14v-14`} stroke="#00000030" fill="none" /></g>)}
            {showGhost && <g aria-label="落点预览">{cells(ghost).map(([x,y],index) => <rect key={index} x={x * 20 + 2} y={y * 20 + 2} width="16" height="16" rx="1" fill={colors[game.piece.kind]} fillOpacity=".07" stroke={colors[game.piece.kind]} strokeOpacity=".55" strokeDasharray="3 2" />)}</g>}
            {cells(game.piece).map(([x,y],index) => <g key={index}><rect x={x * 20 + 1} y={y * 20 + 1} width="18" height="18" rx="1" fill={colors[game.piece.kind]} /><path d={`M${x * 20 + 3} ${y * 20 + 17}V${y * 20 + 3}h14`} fill="none" stroke="#ffffff85" /></g>)}
          </svg>
          {(game.status !== 'running' || confirm) && <div ref={overlay} className={styles.overlay} role="region" aria-label={title}>
            <span className={styles.overlaySymbol} aria-hidden="true">{game.status === 'paused' ? 'Ⅱ' : '▟'}</span><h2>{title}</h2>
            <p>{confirm ? '当前棋盘会重置，最高纪录会保留。' : game.status === 'ready' ? '填满一行。消除，继续。' : game.status === 'paused' ? '准备好，接住下一块。' : `${game.lines} LINES / ${game.score} PTS`}</p>
            <button className={styles.start} onClick={confirm || game.status === 'lost' ? restart : start}>{confirm ? '开始新一局' : game.status === 'ready' ? '开始游戏' : game.status === 'paused' ? '继续游戏' : '再来一局'}</button>
            {confirm && <button className={styles.cancel} onClick={() => setConfirm(false)}>取消重开</button>}
          </div>}
        </div>
        <div className={styles.playControls}><button aria-label="方块左移" disabled={game.status !== 'running' || confirm} onClick={() => change(current => shift(current,-1))}>←</button><button disabled={game.status !== 'running' || confirm} onClick={() => change(current => rotate(current))}>旋转</button><button aria-label="方块右移" disabled={game.status !== 'running' || confirm} onClick={() => change(current => shift(current,1))}>→</button><button className={styles.drop} disabled={game.status !== 'running' || confirm} onClick={() => drop(true)}>直接落下 <span aria-hidden="true">↓</span></button></div>
      </section>
      <aside className={styles.queue}><span>NEXT</span>{game.queue.slice(0,3).map((kind,index) => <div key={index} className={styles.nextPiece}><svg viewBox="0 0 100 80" role="img" aria-label={`第 ${index + 1} 个待落方块`}>{cells({...newPiece(kind),x:0,y:0}).map(([x,y],cell) => <rect key={cell} x={x * 18 + 14} y={y * 18 + 15} width="16" height="16" rx="1" fill={colors[kind]} />)}</svg></div>)}
        <div className={styles.systemButtons}><button disabled={confirm || !['running','paused'].includes(game.status)} onClick={game.status === 'running' ? pause : start}>{game.status === 'paused' ? '继续游戏' : '暂停游戏'}</button><button disabled={confirm} onClick={() => { pause(); setConfirm(true); }}>重新开始</button></div>
        <span className={styles.endless}>10 × 20<br />ENDLESS MODE</span>
      </aside>
      <p className={styles.save}>{saved ? 'AUTO SAVE · 棋盘与纪录已保存' : '浏览器无法保存进度，本局仍可正常游玩。'}</p>
    </div>
  </main>;
}
