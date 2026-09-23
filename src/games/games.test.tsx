// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentType } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Snake from './snake';
import BlockDrop from './block-drop';
import SpaceRun from './space-run';
import Minesweeper from './minesweeper';
import Reversi from './reversi';

const open = (Game: ComponentType) => render(<BrowserRouter><Game /></BrowserRouter>);
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const read = (key: string) => JSON.parse(localStorage.getItem(key)!);

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.spyOn(window, 'setInterval');
  vi.spyOn(window, 'clearInterval');
  vi.spyOn(window, 'setTimeout');
  vi.spyOn(window, 'clearTimeout');
  vi.spyOn(Math, 'random').mockReturnValue(0);
});
afterEach(() => {
  cleanup();
  try {
    // Check game-owned timers; jsdom/Arco can still have short focus/UI timeouts.
    for (const result of vi.mocked(window.setInterval).mock.results) {
      if (result.type === 'return') expect(window.clearInterval).toHaveBeenCalledWith(result.value);
    }
    vi.mocked(window.setTimeout).mock.calls.forEach((call, index) => {
      if (call[1] === 450) expect(window.clearTimeout).toHaveBeenCalledWith(vi.mocked(window.setTimeout).mock.results[index].value);
    });
  } finally { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); }
});

describe('independent game interactions', () => {
  it('selects snake speed before launch and locks the setting during a run', () => {
    open(Snake);
    click('快速');
    expect(screen.getByRole('button', { name: '快速' })).toHaveAttribute('aria-pressed', 'true');
    click('开始游戏');
    expect(window.setInterval).toHaveBeenCalledWith(expect.any(Function), 123.75);
    expect(screen.getByRole('button', { name: '慢速' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '快速' })).toBeDisabled();
  });

  it('toggles the block landing preview without changing the saved game', () => {
    open(BlockDrop);
    const before = localStorage.getItem('block-drop:save:v1');
    expect(screen.getByLabelText('落点预览')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: '落点辅助' }));
    expect(screen.queryByLabelText('落点预览')).not.toBeInTheDocument();
    expect(localStorage.getItem('block-drop:save:v1')).toBe(before);
  });

  it('switches to the clicked flight lane and ignores lane clicks while paused', () => {
    open(SpaceRun);
    click('开始航行');
    const flight = screen.getByRole('img', { name: /星际航道/ });
    vi.spyOn(flight, 'getBoundingClientRect').mockReturnValue({ x: 100, y: 0, left: 100, top: 0, right: 1000, bottom: 800, width: 900, height: 800, toJSON: () => ({}) });
    fireEvent.pointerDown(flight, { button: 0, clientX: 950 });
    expect(flight).toHaveAccessibleName(/第 3 航道/);
    fireEvent.pointerDown(flight, { button: 0, clientX: 120 });
    expect(flight).toHaveAccessibleName(/第 1 航道/);
    fireEvent.blur(window);
    fireEvent.pointerDown(flight, { button: 0, clientX: 950 });
    expect(flight).toHaveAccessibleName(/第 1 航道/);
  });

  it('highlights neighboring minefield squares and pauses its clock with P', () => {
    open(Minesweeper);
    click('第 1 行第 1 列，未翻开');
    const corner = screen.getByRole('button', { name: '第 1 行第 1 列，空地' });
    fireEvent.mouseEnter(corner);
    expect(screen.getByRole('grid').querySelectorAll('[data-near="true"]')).toHaveLength(4);
    fireEvent.keyDown(window, { key: 'p' });
    expect(screen.getByRole('heading', { name: '任务暂停，线索还在' })).toBeVisible();
    act(() => vi.advanceTimersByTime(3000));
    expect(read('minesweeper:save:v1').game.elapsed).toBe(0);
    fireEvent.keyDown(window, { key: 'P' });
    act(() => vi.advanceTimersByTime(1000));
    expect(read('minesweeper:save:v1').game.elapsed).toBe(1);
  });

  it('previews reversi flips and keeps the move journal in sync with undo', () => {
    open(Reversi);
    click('同屏双人');
    const landing = screen.getByRole('button', { name: 'D3，可落子' });
    fireEvent.mouseEnter(landing);
    expect(screen.getByText('此处可以翻转 1 枚棋子')).toBeVisible();
    expect(screen.getByRole('button', { name: 'D4，白子' })).toHaveAttribute('data-preview', 'true');
    fireEvent.click(screen.getByRole('checkbox', { name: '落点提示' }));
    expect(screen.getByRole('button', { name: 'D4，白子' })).toHaveAttribute('data-preview', 'false');
    click('D3，可落子');
    expect(screen.getByRole('list')).toHaveTextContent('D3');
    expect(screen.getByLabelText('已落子')).toHaveTextContent('1');
    click('悔棋一步');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByLabelText('已落子')).toHaveTextContent('0');
  });

  it('starts and auto-pauses snake, preserves other game saves, and removes its keyboard handler', () => {
    localStorage.setItem('2048:v1', 'another game');
    localStorage.setItem('snake:best:v1', '100');
    const view = open(Snake);
    click('开始游戏');
    act(() => vi.advanceTimersByTime(165));
    fireEvent.blur(window);
    expect(screen.getByRole('heading', { name: '歇一下，等你回来' })).toBeVisible();
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.queryByRole('heading', { name: '下次，再多吃一口' })).not.toBeInTheDocument();
    // Both the overlay and action bar expose resume; choose the overlay action.
    fireEvent.click(screen.getAllByRole('button', { name: '继续游戏' })[0]);
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByRole('heading', { name: '下次，再多吃一口' })).toBeVisible();
    expect(localStorage.getItem('2048:v1')).toBe('another game');
    expect(localStorage.getItem('snake:best:v1')).toBe('100');
    view.unmount();
    const key = new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true });
    window.dispatchEvent(key);
    expect(key.defaultPrevented).toBe(false);
  });

  it('drops blocks with the controls, persists its board and resumes a restored run from pause', () => {
    const view = open(BlockDrop);
    click('开始游戏');
    click('旋转');
    click('直接落下');
    const saved = read('block-drop:save:v1');
    expect(saved.game.board.filter(Boolean)).toHaveLength(4);
    expect(saved.game.score).toBeGreaterThan(0);
    view.unmount();
    open(BlockDrop);
    expect(screen.getByRole('heading', { name: '方块已经停下' })).toBeVisible();
    expect(read('block-drop:save:v1').game.board).toEqual(saved.game.board);
    fireEvent.click(screen.getAllByRole('button', { name: '继续游戏' })[0]);
    fireEvent.keyDown(window, { key: ' ' });
    expect(read('block-drop:save:v1').game.board.filter(Boolean)).toHaveLength(8);
    fireEvent.blur(window);
    const paused = read('block-drop:save:v1').game;
    act(() => vi.advanceTimersByTime(3000));
    expect(read('block-drop:save:v1').game).toEqual(paused);
  });

  it('steers the ship and completes the full 60-second flight', () => {
    open(SpaceRun);
    click('开始航行');
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByRole('img', { name: /第 1 航道/ })).toBeVisible();
    click('向右切换航道');
    expect(screen.getByRole('img', { name: /第 2 航道/ })).toBeVisible();
    act(() => vi.advanceTimersByTime(60050));
    expect(screen.getByRole('heading', { name: '航程完成，欢迎返航！' })).toBeVisible();
    expect(Number(localStorage.getItem('space-run:best:v1'))).toBeGreaterThanOrEqual(600);
    click('再飞一次');
    expect(screen.getByLabelText('本局得分')).toHaveTextContent('0');
  });

  it('opens a safe first square, flags by right click, pauses the timer and restores the minefield', () => {
    const view = open(Minesweeper);
    click('第 1 行第 1 列，未翻开');
    expect(read('minesweeper:save:v1').game.board[0]).toBe(0);
    act(() => vi.advanceTimersByTime(1000));
    fireEvent.contextMenu(screen.getAllByRole('button', { name: /未翻开/ })[0]);
    expect(read('minesweeper:save:v1').game.flagged.filter(Boolean)).toHaveLength(1);
    fireEvent.blur(window);
    const saved = read('minesweeper:save:v1').game;
    expect(saved.elapsed).toBe(1);
    act(() => vi.advanceTimersByTime(10000));
    expect(read('minesweeper:save:v1').game.elapsed).toBe(1);
    view.unmount();
    open(Minesweeper);
    expect(read('minesweeper:save:v1').game).toEqual(saved);
    expect(screen.getByRole('heading', { name: '任务暂停，线索还在' })).toBeVisible();
  });

  it('plays against the computer, undoes a full turn and supports local two-player games', () => {
    const view = open(Reversi);
    click('D3，可落子');
    expect(screen.getByRole('status')).toHaveTextContent('白方正在思考');
    act(() => vi.advanceTimersByTime(450));
    expect(read('reversi:save:v1').current.board.filter(Boolean)).toHaveLength(6);
    click('悔棋一步');
    expect(read('reversi:save:v1').current.board.filter(Boolean)).toHaveLength(4);
    click('同屏双人');
    click('D3，可落子');
    act(() => vi.advanceTimersByTime(1000));
    expect(read('reversi:save:v1').current.board.filter(Boolean)).toHaveLength(5);
    expect(screen.getByRole('status')).toHaveTextContent('轮到白方落子');
    const saved = read('reversi:save:v1');
    view.unmount();
    open(Reversi);
    expect(read('reversi:save:v1')).toEqual(saved);
  });

  it('cancels a pending computer move on unmount', () => {
    const view = open(Reversi);
    click('D3，可落子');
    const saved = localStorage.getItem('reversi:save:v1');
    view.unmount();
    act(() => vi.advanceTimersByTime(1000));
    expect(localStorage.getItem('reversi:save:v1')).toBe(saved);
  });

  it.each([BlockDrop, Minesweeper, Reversi])('keeps the game usable when local storage is blocked', (Game) => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Disabled'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Disabled'); });
    open(Game);
    expect(screen.getByText(/浏览器无法保存/)).toBeVisible();
  });
});
