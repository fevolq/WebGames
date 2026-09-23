import { useEffect, useRef, useState } from 'react';
import { useOverlayFocus } from '../_shared/input';
import { chooseMove, counts, finished, flips, initial, legalMoves, play, undo, type Session } from './engine';
import { load, save } from './storage';
import styles from './Game.module.css';

export default function Reversi() {
  const [session, setSession] = useState<Session>(() => load(() => ({ current: initial(), history: [], mode: 'computer' })));
  const [saved, setSaved] = useState(true);
  const [pending, setPending] = useState<Session['mode'] | null>(null);
  const [showHints, setShowHints] = useState(true);
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState(19);
  const grid = useRef<HTMLDivElement>(null);
  const overlay = useOverlayFocus(pending !== null);
  const { current, mode, history } = session;
  const total = counts(current.board);
  const over = finished(current.board);
  const computer = !over && mode === 'computer' && current.turn === 2;
  const legal = legalMoves(current.board, current.turn);
  useEffect(() => { setSaved(save(session)); }, [session]);
  useEffect(() => {
    if (!computer || pending) return;
    const timer = window.setTimeout(() => {
      const index = chooseMove(current);
      if (index !== null) setSession((previous) => previous.current === current ? play(previous, index) : previous);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [computer, current, pending]);
  function move(index: number) { if (!computer && !over && !pending) setSession((previous) => play(previous, index)); }
  function requestNew(nextMode: Session['mode']) {
    if (history.length && !over) setPending(nextMode);
    else { setSession({ current: initial(), history: [], mode: nextMode }); setFocused(19); }
  }
  const message = over ? total.black === total.white ? '势均力敌，这一局平局。' : `${total.black > total.white ? '黑方' : '白方'}获胜！${total.black} : ${total.white}`
    : computer ? '白方正在思考…' : `轮到${current.turn === 1 ? '黑方' : '白方'}落子${mode === 'computer' ? '（你）' : ''}`;
  const preview = showHints && hovered !== null && !computer && !over && !pending ? flips(current.board, hovered, current.turn) : [];
  const log = [...history, current].flatMap((position,index) => position.last === null ? [] : [{ number:index, cell:position.last, player:position.board[position.last] }]).slice(-6);
  return <main id="main-content" className={styles.room}>
    <div className={styles.match}>
      <section className={styles.table} aria-label="黑白棋游戏">
        <div className={styles.title}><h1>黑白棋</h1><span>REVERSI</span><p>一子落下，局势翻转。</p></div>
        <div className={styles.columns} aria-hidden="true">{'ABCDEFGH'.split('').map(letter => <span key={letter}>{letter}</span>)}</div>
        <div className={styles.boardWrap}><div className={styles.rows} aria-hidden="true">{Array.from({length:8},(_,index) => <span key={index}>{index+1}</span>)}</div><div className={styles.board}>
      <div ref={grid} onMouseLeave={() => setHovered(null)} role="grid" aria-label="黑白棋棋盘" aria-rowcount={8} aria-colcount={8} className={styles.grid} onKeyDown={(event) => {
        const offsets: Record<string, number> = { ArrowUp: -8, ArrowDown: 8, ArrowLeft: -1, ArrowRight: 1 };
        if (!(event.key in offsets)) return;
        event.preventDefault();
        const x = focused % 8;
        if ((event.key === 'ArrowLeft' && x === 0) || (event.key === 'ArrowRight' && x === 7)) return;
        const next = focused + offsets[event.key];
        if (next >= 0 && next < 64) { setFocused(next); grid.current?.querySelector<HTMLButtonElement>(`[data-cell="${next}"]`)?.focus(); }
      }}>
        {Array.from({ length: 8 }, (_, row) => <div role="row" className={styles.row} key={row}>{current.board.slice(row * 8, row * 8 + 8).map((value, column) => {
          const index = row * 8 + column;
          const playable = legal.includes(index) && !computer && !over && !pending;
          return <div role="gridcell" key={index}><button data-cell={index} data-preview={preview.includes(index)} onMouseEnter={() => setHovered(index)} className={styles.cell} tabIndex={focused === index ? 0 : -1}
            aria-label={`${String.fromCharCode(65 + column)}${row + 1}，${value === 1 ? '黑子' : value === 2 ? '白子' : playable ? '可落子' : '空格'}`}
            aria-disabled={!playable} onFocus={() => { setFocused(index); setHovered(index); }} onClick={() => move(index)}>
            {value > 0 ? <span className={value === 1 ? styles.black : styles.white} data-last={current.last === index} /> : playable && showHints ? <span className={styles.hint} /> : null}
          </button></div>;
        })}</div>)}
      </div>
          {pending && <div ref={overlay} className={styles.overlay} role="region" aria-label="开始新的对弈？"><span className={styles.overlayDiscs} aria-hidden="true">● ○</span><h2>开始新的对弈？</h2><p>当前棋局会重置，双方回到开局位置。</p><div className={styles.actions}><button className={styles.primary} onClick={() => { setSession({current:initial(),history:[],mode:pending}); setPending(null); setFocused(19); setHovered(null); }}>开始新一局</button><button onClick={() => setPending(null)}>继续本局</button></div></div>}
        </div></div>
        <div className={styles.boardFooter}><span>{preview.length ? `此处可以翻转 ${preview.length} 枚棋子` : '夹住对方棋子，即可将其翻转。'}</span><label><input type="checkbox" checked={showHints} onChange={event => setShowHints(event.target.checked)} />落点提示</label></div>
      </section>
      <aside className={styles.notebook}>
        <div className={styles.mode} role="group" aria-label="对弈模式"><button aria-pressed={mode === 'computer'} disabled={pending !== null} onClick={() => { if (mode !== 'computer') requestNew('computer'); }}>人机对弈</button><button aria-pressed={mode === 'local'} disabled={pending !== null} onClick={() => { if (mode !== 'local') requestNew('local'); }}>同屏双人</button></div>
        <div className={styles.players}><div data-active={!over && current.turn === 1}><span className={styles.black} /><small>{mode === 'computer' ? '你 · 黑方' : '黑方'}</small><strong aria-label="黑方棋子">{total.black}</strong></div><b>:</b><div data-active={!over && current.turn === 2}><span className={styles.white} /><small>{mode === 'computer' ? '电脑 · 白方' : '白方'}</small><strong aria-label="白方棋子">{total.white}</strong></div></div>
        <div className={styles.balance} aria-label={`黑方 ${total.black} 子，白方 ${total.white} 子`}><i style={{width:`${total.black / (total.black + total.white) * 100}%`}} /></div>
        <p className={styles.status} role="status">{message}</p>
        <p className={styles.pass}>{current.passed ? `${current.passed === 1 ? '黑方' : '白方'}无合法落点，已自动跳过。` : over ? '棋局已保留，可以回看。' : '无合法落点时自动跳过。'}</p>
        <div className={styles.journal}><div><span>最近落子</span><small>共 <b aria-label="已落子">{current.board.filter(Boolean).length - 4}</b> 手</small></div>
          {log.length ? <ol start={log[0].number}>{log.map(entry => <li key={entry.number}><span>{String(entry.number).padStart(2,'0')}</span><i data-player={entry.player} /><strong>{String.fromCharCode(65+entry.cell%8)}{Math.floor(entry.cell/8)+1}</strong><small>{entry.player === 1 ? '黑方' : '白方'}</small></li>)}</ol> : <p>黑方先行。<br />你的第一手，会落在哪里？</p>}
        </div>
        <div className={styles.actions}><button disabled={!history.length || pending !== null} onClick={() => { setSession(previous => undo(previous)); setHovered(null); }}>悔棋一步</button><button disabled={pending !== null} onClick={() => requestNew(mode)}>重新开始</button></div>
        <details className={styles.rules}><summary>对弈规则</summary><p>落子需要在横、竖或斜线上夹住对方棋子。双方都无法落子时，棋子多的一方获胜。方向键移动焦点，回车落子。人机模式悔棋会撤销完整一轮。</p></details>
        <p className={styles.save}>{saved ? '棋局与悔棋记录已保存' : '浏览器无法保存棋局，本局仍可正常对弈。'}</p>
      </aside>
    </div>
  </main>;
}
