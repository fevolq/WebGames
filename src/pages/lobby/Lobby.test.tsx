// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { App, StatusPage } from '../../app/App';
import { games } from '../../catalog/games';
import { GameCard } from '../../components/GameCard';
// Preload the real module so the first assertion does not time Vite's cold transform.
// Dynamic production chunks are verified independently by the deployment checks.
import './Lobby';
import '../../games/2048';
import '../../games/snake';
import '../../games/block-drop';
import '../../games/space-run';
import '../../games/minesweeper';
import '../../games/reversi';

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  localStorage.clear();
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((media: string) => ({
    media, matches: false, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })));
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function openLobby(url = '/') {
  window.history.replaceState({}, '', url);
  const view = render(<BrowserRouter><App /></BrowserRouter>);
  await screen.findByRole('heading', { name: '发现你的下一份快乐' });
  return view;
}

describe('lobby interactions', () => {
  it.each(['loading', 'error'] as const)('keeps game %s states independent of the lobby layout', (kind) => {
    render(<BrowserRouter><StatusPage kind={kind} /></BrowserRouter>);
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '游戏设置' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', String(kind === 'loading'));
    if (kind === 'error') expect(screen.getByRole('button', { name: '重新加载' })).toBeVisible();
  });

  it.each(games)('opens $name in a new tab and supports direct game entry', async (game) => {
    const user = userEvent.setup();
    const view = await openLobby('/?source=bookmark');
    const link = screen.getByRole('link', { name: `进入${game.name}` });
    expect(link).toHaveAttribute('href', `/${game.slug}`);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await user.click(link);
    expect(window.location.pathname).toBe('/');
    expect(window.location.search).toBe('?source=bookmark');
    expect(screen.getByRole('heading', { name: '发现你的下一份快乐' })).toBeVisible();

    // jsdom cannot open tabs; verify the destination with a fresh app mount.
    view.unmount();
    window.history.replaceState({}, '', `/${game.slug}`);
    render(<BrowserRouter><App /></BrowserRouter>);
    expect(await screen.findByRole('heading', { name: new RegExp(game.name), level: 1 })).toBeVisible();
    expect(window.location.pathname).toBe(`/${game.slug}`);
    if (game.slug === '2048') expect(screen.getByRole('grid', { name: '2048 棋盘' })).toBeVisible();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '返回游戏大厅' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '游戏设置' }));
    await user.click(screen.getByRole('link', { name: '返回游戏大厅' }));
    await screen.findByRole('heading', { name: '发现你的下一份快乐' });
    expect(window.location.pathname).toBe('/');
    expect(screen.queryByRole('button', { name: '游戏设置' })).not.toBeInTheDocument();
  });

  it('combines typing and category clicks, displays empty results, and clears filters', async () => {
    const user = userEvent.setup();
    await openLobby('/?source=bookmark');
    await user.type(screen.getByRole('textbox', { name: '搜索游戏' }), '2048');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: '轻松休闲' }));
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.getByRole('heading', { name: '还没找到这款游戏' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '全部游戏' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('textbox', { name: '搜索游戏' })).toHaveValue('2048');
    await user.click(screen.getByRole('button', { name: '清除筛选' }));
    expect(screen.getAllByRole('article')).toHaveLength(games.length);
    expect(window.location.search).toBe('?source=bookmark');
  });

  it('keeps the literal all search term in the input and URL', async () => {
    const user = userEvent.setup();
    await openLobby();
    await user.type(screen.getByRole('textbox', { name: '搜索游戏' }), 'all');
    expect(screen.getByRole('textbox', { name: '搜索游戏' })).toHaveValue('all');
    expect(new URLSearchParams(window.location.search).get('q')).toBe('all');
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });

  it('restores shared filters when the application remounts at the same URL', async () => {
    const view = await openLobby('/?category=puzzle&q=2048');
    expect(screen.getByRole('button', { name: '益智烧脑' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    view.unmount();
    render(<BrowserRouter><App /></BrowserRouter>);
    await screen.findByRole('heading', { name: '发现你的下一份快乐' });
    expect(screen.getByRole('textbox', { name: '搜索游戏' })).toHaveValue('2048');
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  it('restores filters with browser history after navigating to the lobby home', async () => {
    const user = userEvent.setup();
    await openLobby('/?category=puzzle&q=2048');
    await user.click(screen.getByRole('link', { name: '游戏大厅' }));
    expect(screen.getByRole('textbox', { name: '搜索游戏' })).toHaveValue('');
    act(() => { window.history.back(); });
    await waitFor(() => expect(screen.getByRole('textbox', { name: '搜索游戏' })).toHaveValue('2048'));
    expect(screen.getByRole('button', { name: '益智烧脑' })).toHaveAttribute('aria-pressed', 'true');
    act(() => { window.history.forward(); });
    await waitFor(() => expect(screen.getByRole('textbox', { name: '搜索游戏' })).toHaveValue(''));
    expect(screen.getAllByRole('article')).toHaveLength(games.length);
  });

  it('falls back for an unknown category and a broken cover without losing the list', async () => {
    await openLobby('/?category=unknown');
    expect(screen.getByRole('button', { name: '全部游戏' })).toHaveAttribute('aria-pressed', 'true');
    const card = screen.getByRole('article', { name: games[0].name });
    fireEvent.error(within(card).getByRole('img', { name: `${games[0].name}游戏封面` }));
    expect(within(card).getByRole('img', { name: `${games[0].name}封面暂不可用` })).toBeVisible();
    expect(screen.getAllByRole('article')).toHaveLength(games.length);
  });

  it('moves focus to the catalog when browsing games', async () => {
    const user = userEvent.setup();
    await openLobby();
    await user.click(screen.getByRole('button', { name: '逛逛游戏' }));
    expect(document.getElementById('all-games')).toHaveFocus();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it.each(['coming-soon', 'maintenance'] as const)('keeps %s cards unavailable for future catalog entries', (status) => {
    const preview = { ...games[0], status };
    render(<BrowserRouter><GameCard game={preview} /><StatusPage kind="unavailable" game={preview} /></BrowserRouter>);
    expect(screen.queryByRole('link', { name: `进入${preview.name}` })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: status === 'maintenance' ? `${preview.name}正在维护` : `${preview.name}，还在准备中` })).toBeVisible();
    expect(screen.getByRole('link', { name: '返回游戏大厅' })).toHaveAttribute('href', '/');
  });
});
