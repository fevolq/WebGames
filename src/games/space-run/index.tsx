import { useEffect, useState } from 'react';
import { useAutoPause, useGameInterval, useGameKeys, useOverlayFocus } from '../_shared/input';
import { createGame, FINISH, score, steer, tick } from './engine';
import { readBest, writeBest } from './record';
import styles from './Game.module.css';

export default function SpaceRun() {
  const [game, setGame] = useState(createGame);
  const [best, setBest] = useState(readBest);
  const [saved, setSaved] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const overlay = useOverlayFocus(game.status !== 'running' || confirm);
  const points = score(game);
  const pause = () => setGame((current) => current.status === 'running' ? { ...current, status: 'paused' } : current);
  const start = () => setGame((current) => ({ ...current, status: 'running' }));
  const restart = () => { setGame({ ...createGame(), status: 'running' }); setConfirm(false); };
  useAutoPause(pause);
  useGameInterval(() => { const rolls = [Math.random(), Math.random()] as const; setGame((current) => tick(current, .05, rolls)); }, game.status === 'running' && !confirm ? 50 : null);
  useEffect(() => { if (game.status === 'won' || game.status === 'lost') setBest((value) => Math.max(value, points)); }, [game.status, points]);
  // Save a newly achieved best immediately, including runs left before the finish.
  useEffect(() => { if (points > best) { setBest(points); setSaved(writeBest(points)); } }, [points, best]);
  useGameKeys((key, repeat) => {
    if (confirm) return false;
    const lower = key.toLowerCase();
    if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(key) || ['a', 'd'].includes(lower)) {
      if (game.status !== 'running') return false;
      if (!repeat) setGame((current) => steer(current, key === 'ArrowLeft' || lower === 'a' ? -1 : 1));
      return true;
    }
    if ((key === ' ' || lower === 'p') && !repeat && ['running', 'paused'].includes(game.status)) { if (game.status === 'running') pause(); else start(); return true; }
    return false;
  });
  const title = confirm ? '重新出发吗？' : game.status === 'ready' ? '下一站，星辰之间' : game.status === 'paused' ? '飞船已进入悬停' : game.status === 'won' ? '航程完成，欢迎返航！' : '飞船需要休整一下';
  return <main id="main-content" className={styles.universe}>
    <div className={styles.planet} aria-hidden="true" />
    <div className={styles.identity}><h1>星际穿梭</h1><span>STAR / RUN</span></div>
    <div className={styles.score}><span>FLIGHT SCORE</span><strong aria-label="本局得分">{String(points).padStart(5,'0')}</strong></div>
    <div className={styles.shield}><span>SHIELD</span><strong aria-label="剩余护盾">{[0,1,2].map(index => <i key={index} data-active={index < game.lives} />)}<span className={styles.srOnly}>{game.lives}</span></strong></div>
    <section className={styles.flight} aria-label="星际穿梭游戏">
      <svg className={styles.flightScene} viewBox="0 0 900 800" role="img" aria-label={`星际航道，第 ${game.lane + 1} 航道，剩余 ${game.lives} 点护盾`}
        onPointerDown={event => {
          if (game.status !== 'running' || confirm || event.button !== 0) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const lane = Math.max(0, Math.min(2, Math.floor((event.clientX - rect.left) / rect.width * 3)));
          setGame(current => steer(current, lane - current.lane));
        }}>
        <defs><linearGradient id="lane-glow" x2="0" y2="1"><stop stopColor="#76d3df" stopOpacity="0" /><stop offset="1" stopColor="#76d3df" stopOpacity=".13" /></linearGradient><radialGradient id="ship-light"><stop stopColor="#91efff" stopOpacity=".4" /><stop offset="1" stopColor="#91efff" stopOpacity="0" /></radialGradient></defs>
        {Array.from({length:65},(_,index) => <g key={index} opacity={.15 + index % 4 * .13}><circle cx={(index * 137 + 29) % 900} cy={(index * 91 + game.elapsed * (index % 3 + 1) * 20) % 800} r={index % 5 === 0 ? 2 : 1} fill="#bfe5fa" />{game.status === 'running' && index % 5 === 0 && <path d={`M${(index * 137 + 29) % 900} ${(index * 91 + game.elapsed * (index % 3 + 1) * 20) % 800}v-12`} stroke="#a2dfff" />}</g>)}
        <rect x={game.lane * 300} y="70" width="300" height="670" fill="url(#lane-glow)" className={styles.activeLane} />
        <path d="M300 70V740M600 70V740" stroke="#99d7ed" strokeOpacity=".14" strokeDasharray="3 20" />
        {[0,1,2].map(lane => <g key={lane} opacity={game.lane === lane ? .6 : .18}><path d={`M${lane * 300 + 90} 737h120`} stroke="#a0e6ef" strokeWidth="2" /><text x={lane * 300 + 150} y="768" textAnchor="middle" fill="#a0e6ef" fontSize="12" letterSpacing="4" fontFamily="monospace">0{lane + 1}</text></g>)}
        {game.entities.map(entity => <g key={entity.id} transform={`translate(${150 + entity.lane * 300},${entity.y * 8})`}>
          {entity.kind === 'star' ? <g><circle r="44" fill="url(#ship-light)" /><path d="m0-23 6 16 18 7-18 6-6 18-6-18-18-6 18-7Z" fill="#ffdc97" /><circle r="6" fill="#fff8d8" /></g> : <g transform={`rotate(${entity.id * 37 + game.elapsed * 20})`}><path d="M-28-12-9-35 22-26 35-1 25 27-10 33-34 10Z" fill="#6f7389" stroke="#a0a1b4" strokeWidth="2" /><path d="m-9-35 6 26 25-17M-3-9-10 33M-3-9l38 8" fill="none" stroke="#858ca5" /><circle cx="-15" cy="1" r="7" fill="#525d74" /><circle cx="14" cy="12" r="5" fill="#525d74" /></g>}
        </g>)}
        <g className={styles.ship} transform={`translate(${150 + game.lane * 300},672)`} opacity={game.invulnerable > 0 ? .6 : 1}>
          <ellipse cy="28" rx="70" ry="87" fill="url(#ship-light)" />
          {game.status === 'running' && <><path d="M-12 25 0 79 12 25" fill="#6be5ff" opacity=".65" /><path d="M-6 25 0 60 6 25" fill="#efffff" /></>}
          {game.invulnerable > 0 && <circle r="55" fill="#80dfff0b" stroke="#a0ecff" strokeWidth="2" strokeDasharray="12 4" />}
          <path d="M0-47-18-2-47 30-13 21 0 34 13 21 47 30 18-2Z" fill="#cbdbe6" stroke="#f4fbff" strokeWidth="1.2" />
          <path d="M0-47 0 34-13 21-18-2Z" fill="#eaf5fa" /><path d="M0-23-8 3 0 12 8 3Z" fill="#548caa" /><path d="M-34 22-17 7-13 21M34 22 17 7 13 21" fill="#eea485" />
        </g>
      </svg>
      {(game.status !== 'running' || confirm) && <div ref={overlay} className={styles.transmission} role="region" aria-label={title}>
        <span className={styles.signal}>{game.status === 'won' ? 'MISSION COMPLETE' : game.status === 'lost' ? 'SIGNAL LOST' : 'FLIGHT CONTROL'}</span>
        <h2>{title}</h2><p>{confirm ? '本次航程会重置，最高纪录会保留。' : game.status === 'ready' ? '穿越三条星际航道，在 60 秒内带回星光。' : game.status === 'paused' ? '飞船已停稳。准备好了，再继续。' : `航行 ${Math.floor(game.elapsed)} 秒 · 收集 ${game.stars} 颗星星 · ${points} 分`}</p>
        {game.status === 'ready' && <div className={styles.instructions}><span>← → / A D 换道</span><span>点击航道直接移动</span><span>星星 +50 · 护盾 ×3</span></div>}
        <button className={styles.launch} onClick={confirm || ['won','lost'].includes(game.status) ? restart : start}>{confirm ? '重新启航' : game.status === 'ready' ? '开始航行' : game.status === 'paused' ? '继续航行' : '再飞一次'} <span aria-hidden="true">↗</span></button>
        {confirm && <button className={styles.cancel} onClick={() => setConfirm(false)}>取消重开</button>}
      </div>}
    </section>
    <div className={styles.cockpit}>
      <div className={styles.progress}><progress max={FINISH} value={game.elapsed} aria-label="航程进度" /></div>
      <div className={styles.time}><strong>{String(Math.ceil(FINISH - game.elapsed)).padStart(2,'0')}<small> s</small></strong><span>距离航程结束</span></div>
      <div className={styles.controls}><button aria-label="向左切换航道" disabled={game.status !== 'running' || confirm} onClick={() => setGame(current => steer(current,-1))}>←</button><button disabled={confirm || !['running','paused'].includes(game.status)} onClick={game.status === 'running' ? pause : start}>{game.status === 'paused' ? '继续航行' : '暂停航行'}</button><button aria-label="向右切换航道" disabled={game.status !== 'running' || confirm} onClick={() => setGame(current => steer(current,1))}>→</button><button disabled={confirm} onClick={() => { pause(); setConfirm(true); }}>重新开始</button></div>
      <div className={styles.record}><span>最高纪录</span><strong aria-label="最高纪录">{best}</strong><small>{saved ? '已自动保存' : '浏览器无法保存最高纪录，本次航程仍可继续。'}</small></div>
    </div>
    <span className={styles.srOnly} role="status">{game.status === 'lost' ? '护盾耗尽，游戏结束' : game.status === 'won' ? '航程完成' : ''}</span>
  </main>;
}
