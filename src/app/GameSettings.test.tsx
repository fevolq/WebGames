// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameSettings } from './GameSettings';

afterEach(cleanup);

describe('floating game settings', () => {
  it('opens from the keyboard, focuses return navigation and closes with Escape', async () => {
    const user = userEvent.setup();
    render(<BrowserRouter><GameSettings /></BrowserRouter>);
    const trigger = screen.getByRole('button', { name: '游戏设置' });
    expect(screen.queryByRole('navigation', { name: '游戏设置菜单' })).not.toBeInTheDocument();
    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: '返回游戏大厅' })).toHaveFocus();
    expect(screen.getByRole('link', { name: '返回游戏大厅' })).toHaveAttribute('href', '/');
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('navigation', { name: '游戏设置菜单' })).not.toBeInTheDocument();
  });

  it('keeps menu keys away from game handlers and dismisses on an outside click', () => {
    const onGameKey = vi.fn();
    window.addEventListener('keydown', onGameKey);
    try {
      render(<BrowserRouter><button>游戏内操作</button><GameSettings /></BrowserRouter>);
      fireEvent.click(screen.getByRole('button', { name: '游戏设置' }));
      const link = screen.getByRole('link', { name: '返回游戏大厅' });
      fireEvent.keyDown(link, { key: 'ArrowLeft' });
      fireEvent.keyDown(link, { key: 'p' });
      expect(onGameKey).not.toHaveBeenCalled();
      fireEvent.pointerDown(screen.getByRole('button', { name: '游戏内操作' }));
      expect(screen.queryByRole('navigation', { name: '游戏设置菜单' })).not.toBeInTheDocument();
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      expect(onGameKey).toHaveBeenCalledOnce();
    } finally { window.removeEventListener('keydown', onGameKey); }
  });

  it('closes when focus leaves and removes its portal on unmount', async () => {
    const user = userEvent.setup();
    const view = render(<BrowserRouter><button>游戏内操作</button><GameSettings /></BrowserRouter>);
    await user.click(screen.getByRole('button', { name: '游戏设置' }));
    await user.click(screen.getByRole('button', { name: '游戏内操作' }));
    expect(screen.queryByRole('navigation', { name: '游戏设置菜单' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '游戏设置' }));
    view.unmount();
    expect(screen.queryByRole('button', { name: '游戏设置' })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '游戏设置菜单' })).not.toBeInTheDocument();
  });
});
