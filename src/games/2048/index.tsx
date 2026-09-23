import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { createBoard, createSession, gameReducer, gameStatus, SIZE, type Direction, type Rolls } from './engine';
import { loadSession, saveSession } from './storage';
import styles from './Game.module.css';

const keys: Record<string, Direction> = {
  ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left',
  w: 'up', d: 'right', s: 'down', a: 'left',
};
const controls: { direction: Direction; label: string; key: string }[] = [
  { direction: 'up', label: '向上移动', key: '↑' },
  { direction: 'left', label: '向左移动', key: '←' },
  { direction: 'down', label: '向下移动', key: '↓' },
  { direction: 'right', label: '向右移动', key: '→' },
];
const roll = (): Rolls => [Math.random(), Math.random()];
const newBoard = () => createBoard(roll(), roll());

export default function NumberStack() {
  const [session, dispatch] = useReducer(gameReducer, undefined, () => loadSession(() => createSession(newBoard())));
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [saved, setSaved] = useState(true);
  const [help, setHelp] = useState(false);
  const gesture = useRef<{ x: number; y: number; id: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { current, best, previous, gain } = session;
  const status = gameStatus(current);
  const blocked = confirmRestart || status !== 'playing';
  const largest = Math.max(...current.board);

  useEffect(() => { boardRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => { setSaved(saveSession(session)); }, [session]);
  useEffect(() => {
    if (blocked) panelRef.current?.querySelector('button')?.focus({ preventScroll: true });
  }, [blocked, status, confirmRestart]);

  const move = useCallback((direction: Direction) => {
    if (!blocked) dispatch({ type: 'move', direction, rolls: roll() });
  }, [blocked]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing
        || (target instanceof HTMLElement && (target.isContentEditable
          || target.closest('input, textarea, select, [contenteditable="true"]')))) return;
      if (event.key === 'Escape' && confirmRestart) {
        setConfirmRestart(false);
        boardRef.current?.focus();
        return;
      }
      const direction = keys[event.key] ?? keys[event.key.toLowerCase()];
      if (!direction || blocked) return;
      event.preventDefault();
      if (!event.repeat) move(direction);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [move, blocked, confirmRestart]);

  function focusBoard() { boardRef.current?.focus({ preventScroll: true }); }
  function restart() {
    dispatch({ type: 'restart', board: newBoard() });
    setConfirmRestart(false);
    focusBoard();
  }
  function undo() {
    dispatch({ type: 'undo' });
    setConfirmRestart(false);
    focusBoard();
  }

  return <main id="main-content" className={styles.game}>
    <section className={styles.puzzle} aria-label="2048 游戏">
      <div className={styles.topline}>
        <h1><strong>2048<span className={styles.dot} aria-hidden="true">.</span></strong></h1>
        <div className={styles.scores}>
          <div><span>本局得分</span><strong aria-label="本局得分">{current.score}</strong>{gain > 0 && <b key={current.moves} className={styles.gain}>+{gain}</b>}</div>
          <div><span>最高纪录</span><strong aria-label="最高纪录">{best}</strong></div>
        </div>
      </div>
      <div className={styles.subline}><span>相同数字，相遇翻倍。</span><span>第 <b>{current.moves}</b> 步</span></div>
      <div className={styles.boardFrame}>
        <div ref={boardRef} className={styles.board} role="grid" aria-label="2048 棋盘" aria-describedby="board-help"
          aria-rowcount={SIZE} aria-colcount={SIZE} tabIndex={blocked ? -1 : 0}
          onPointerDown={(event) => {
            if (blocked || event.button !== 0) return;
            gesture.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
            event.currentTarget.setPointerCapture?.(event.pointerId);
            focusBoard();
          }}
          onPointerUp={(event) => {
            const start = gesture.current;
            gesture.current = null;
            if (!start || start.id !== event.pointerId || blocked) return;
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            if (Math.max(Math.abs(dx), Math.abs(dy)) >= 24) move(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up');
          }}
          onPointerCancel={() => { gesture.current = null; }}
          onLostPointerCapture={() => { gesture.current = null; }}>
          {Array.from({ length: SIZE }, (_, row) => <div role="row" className={styles.row} key={row}>
            {current.board.slice(row * SIZE, (row + 1) * SIZE).map((value, column) => <div role="gridcell"
              aria-label={`第 ${row + 1} 行第 ${column + 1} 列：${value || '空'}`} className={styles.cell} key={column}>
              {value > 0 && <span key={`${row}-${column}-${value}`} className={`${styles.tile} ${value >= 1024 ? styles.largeNumber : ''}`}
                data-value={value <= 2048 ? value : 'super'}>{value}</span>}
            </div>)}
          </div>)}
        </div>
        {blocked && <div ref={panelRef} className={styles.overlay} role="region" aria-labelledby="result-title">
          <span className={styles.resultNumber} aria-hidden="true">{confirmRestart ? '↻' : status === 'won' ? '2048' : largest}</span>
          <h2 id="result-title">{confirmRestart ? '准备好重新开始了吗？' : status === 'won' ? '叠出来了，2048！' : '这一次，先到这里'}</h2>
          <p>{confirmRestart ? '当前棋盘会重置，最高纪录会保留。' : status === 'won' ? '继续挑战，看看下一个数字。' : `${current.moves} 步 · ${current.score} 分`}</p>
          <div className={styles.resultActions}>{confirmRestart ? <>
            <button className={styles.primary} onClick={restart}>开始新一局</button>
            <button onClick={() => { setConfirmRestart(false); focusBoard(); }}>继续本局</button>
          </> : <>
            <button className={styles.primary} onClick={status === 'won' ? () => { dispatch({ type: 'continue' }); focusBoard(); } : restart}>{status === 'won' ? '继续挑战' : '再来一局'}</button>
            {previous && <button onClick={undo}>撤销上一步</button>}
          </>}</div>
        </div>}
      </div>
      <div className={styles.toolbar}>
        <button disabled={!previous || confirmRestart} onClick={undo}><span aria-hidden="true">↶</span> 撤销一步</button>
        <button disabled={confirmRestart} onClick={() => setConfirmRestart(true)}><span aria-hidden="true">↻</span> 重新开始</button>
        <button className={styles.helpButton} aria-expanded={help} aria-controls="number-help" onClick={() => setHelp(!help)}>操作说明</button>
      </div>
      <div className={styles.bottomline}>
        <p id="board-help">方向键 / WASD / 在棋盘上拖动</p>
        <div className={styles.directionPad} role="group" aria-label="方向控制">{controls.map(({ direction, label, key }) => <button
          key={direction} aria-label={label} disabled={blocked} onClick={() => move(direction)}>{key}</button>)}</div>
      </div>
      {help && <div className={styles.help} id="number-help">向同一方向移动所有方块，相同数字相碰就会合并。合出 2048 后可以继续挑战；棋盘无空位且无法合并时结束。每局可撤销上一步。</div>}
      <div className={styles.target}><span>最大方块 <b>{largest}</b></span><meter min={0} max={11} value={Math.min(11, Math.log2(largest))} aria-label="合成 2048 的进度" /><span>2048</span></div>
      <p className={styles.save} role="status">{saved ? '已自动保存' : '此浏览器无法保存进度，本局仍可正常游玩。'}</p>
      <span className={styles.srOnly} aria-live="polite" aria-atomic="true">第 {current.moves} 步，得分 {current.score}，最大方块 {largest}。{status === 'won' ? '已合成 2048！' : status === 'lost' ? '游戏结束。' : ''}</span>
    </section>
  </main>;
}
