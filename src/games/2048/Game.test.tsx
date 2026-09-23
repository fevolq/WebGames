// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import NumberStack from './index';
import { createSession } from './engine';
import { decodeSession, STORAGE_KEY } from './storage';

function seed(values = [2, 2, ...Array<number>(14).fill(0)]) {
  const session = createSession(values, 100);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...session }));
  return session;
}
function openGame() { return render(<BrowserRouter><NumberStack /></BrowserRouter>); }
const saved = () => decodeSession(localStorage.getItem(STORAGE_KEY))!;

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(Math, 'random').mockReturnValue(0);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('playable 2048', () => {
  it('restores progress from the former storage key and saves it under the real game name', () => {
    const initial = createSession([4, 8, ...Array<number>(14).fill(0)], 128);
    initial.current.score = 24;
    initial.current.moves = 7;
    initial.previous = createSession([4, 4, 4, ...Array<number>(13).fill(0)]).current;
    localStorage.setItem('game_a:2048:v1', JSON.stringify({ version: 1, ...initial }));
    openGame();
    expect(saved()).toEqual(initial);
    expect(screen.getByLabelText('本局得分')).toHaveTextContent('24');
    expect(screen.getByRole('button', { name: '撤销一步' })).toBeEnabled();
  });

  it('prefers current progress over the old save and does not revive an old game after save corruption', () => {
    const current = seed();
    localStorage.setItem('game_a:2048:v1', JSON.stringify({
      version: 1, ...createSession([64, 64, ...Array<number>(14).fill(0)], 1024),
    }));
    const view = openGame();
    expect(saved()).toEqual(current);
    view.unmount();
    localStorage.setItem(STORAGE_KEY, 'corrupted');
    openGame();
    expect(saved().current.board.filter(Boolean)).toEqual([2, 2]);
    expect(saved().best).toBe(0);
  });

  it('plays with the keyboard and mouse, supports undo, and restores a saved game', async () => {
    const user = userEvent.setup();
    const initial = seed();
    const view = openGame();
    expect(screen.getByRole('grid', { name: '2048 棋盘' })).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByLabelText('本局得分')).toHaveTextContent('4');
    expect(saved().current.moves).toBe(1);
    await user.click(screen.getByRole('button', { name: '撤销一步' }));
    expect(saved().current).toEqual(initial.current);
    expect(screen.getByRole('button', { name: '撤销一步' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '向下移动' }));
    expect(saved().current.moves).toBe(1);
    const snapshot = saved();
    view.unmount();
    openGame();
    expect(saved()).toEqual(snapshot);
    expect(screen.getByRole('gridcell', { name: '第 4 行第 1 列：2' })).toBeVisible();
  });

  it('supports WASD but ignores held keys, browser shortcuts and editable fields', () => {
    seed();
    openGame();
    fireEvent.keyDown(window, { key: 'a', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'a', repeat: true });
    const input = document.createElement('input');
    document.body.append(input);
    fireEvent.keyDown(input, { key: 'a' });
    input.remove();
    expect(saved().current.moves).toBe(0);
    fireEvent.keyDown(window, { key: 'A' });
    expect(saved().current.score).toBe(4);
  });

  it('moves by dragging, ignores small or cancelled gestures, and blocks dragging during confirmation', () => {
    seed();
    openGame();
    const board = screen.getByRole('grid', { name: '2048 棋盘' });
    const down = () => fireEvent.pointerDown(board, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    down();
    fireEvent.pointerUp(board, { pointerId: 1, clientX: 95, clientY: 100 });
    expect(saved().current.moves).toBe(0);
    down();
    fireEvent.pointerCancel(board, { pointerId: 1 });
    fireEvent.pointerUp(board, { pointerId: 1, clientX: 10, clientY: 100 });
    expect(saved().current.moves).toBe(0);
    down();
    fireEvent.pointerUp(board, { pointerId: 1, clientX: 10, clientY: 100 });
    expect(saved().current.score).toBe(4);
    expect(saved().current.moves).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: '重新开始' }));
    down();
    fireEvent.pointerUp(board, { pointerId: 1, clientX: 100, clientY: 200 });
    expect(saved().current.moves).toBe(1);
  });

  it('confirms a restart, blocks moves until dismissed, and keeps the best score', async () => {
    const user = userEvent.setup();
    seed();
    openGame();
    await user.keyboard('{ArrowLeft}');
    await user.click(screen.getByRole('button', { name: '重新开始' }));
    expect(screen.getByRole('button', { name: '开始新一局' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(saved().current.moves).toBe(1);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('button', { name: '开始新一局' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重新开始' }));
    await user.click(screen.getByRole('button', { name: '开始新一局' }));
    expect(saved().current.moves).toBe(0);
    expect(saved().current.score).toBe(0);
    expect(saved().best).toBe(100);
    expect(screen.getByRole('grid', { name: '2048 棋盘' })).toHaveFocus();
  });

  it('celebrates 2048 and resumes play after continuing', async () => {
    const user = userEvent.setup();
    seed([1024, 1024, ...Array<number>(14).fill(0)]);
    openGame();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('heading', { name: '叠出来了，2048！' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '继续挑战' }));
    await user.keyboard('{ArrowDown}');
    expect(saved().current.continued).toBe(true);
    expect(saved().current.moves).toBe(2);
    expect(screen.queryByRole('heading', { name: '叠出来了，2048！' })).not.toBeInTheDocument();
  });

  it('shows game over for a restored full board and starts a fresh game', async () => {
    const user = userEvent.setup();
    seed([2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2]);
    openGame();
    expect(screen.getByRole('heading', { name: '这一次，先到这里' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '再来一局' }));
    expect(saved().current.board.filter(Boolean)).toHaveLength(2);
    expect(screen.queryByRole('heading', { name: '这一次，先到这里' })).not.toBeInTheDocument();
  });

  it('remains playable when storage is unavailable and removes keyboard listeners on unmount', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
    const view = openGame();
    expect(screen.getByRole('status')).toHaveTextContent('此浏览器无法保存进度');
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByLabelText('本局得分')).toHaveTextContent('4');
    view.unmount();
    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
