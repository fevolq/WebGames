// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LifeSimulator from './index';
import { decode, STORAGE_KEY } from './storage';

beforeEach(() => {
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const saved = () => decode(localStorage.getItem(STORAGE_KEY))!;

describe('life simulator interaction', () => {
  it('restores a prepared birth profile and enters the chosen world directly with the keyboard', async () => {
    const user = userEvent.setup();
    const view = render(<LifeSimulator />);
    await user.click(screen.getByRole('button', { name: '重置' }));
    await user.click(screen.getByRole('button', { name: '提升气运' }));
    expect(screen.getByLabelText('气运数值')).toHaveTextContent('2');
    expect(saved().draft.stats.luck).toBe(2);
    await user.click(screen.getByRole('button', { name: '提升悟性' }));
    await user.click(screen.getByRole('button', { name: '降低气运' }));
    await user.clear(screen.getByRole('textbox', { name: '如何称呼这一世的你' }));
    await user.type(screen.getByRole('textbox'), '小满');
    view.unmount();
    render(<LifeSimulator />);
    expect(screen.getByRole('textbox')).toHaveValue('小满');
    expect(screen.getByLabelText('悟性数值')).toHaveTextContent('2');
    expect(screen.queryByRole('button', { name: '开启这一生' })).not.toBeInTheDocument();
    expect(saved().active).toBeNull();
    const preparedStats = saved().draft.stats;
    screen.getByRole('button', { name: '进入古代人生' }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { name: /^生于/ })).toHaveFocus();
    expect(saved().active?.name).toBe('小满');
    expect(saved().active?.world).toBe('ancient');
    expect(saved().draft.world).toBe('ancient');
    expect(saved().active?.initial).toEqual(preparedStats);
    expect(saved().active?.cursor).toBe(0);
    expect(screen.getByRole('group', { name: '人生选择' })).toBeVisible();
  });
  it.each(['现代', '古代', '修仙'] as const)('plays %s from birth through a complete ending and restores its archive', world => {
    const view = render(<LifeSimulator />);
    fireEvent.click(screen.getByRole('button', { name: `进入${world}人生` }));
    expect(saved().active?.world).toBe(({ 现代: 'modern', 古代: 'ancient', 修仙: 'cultivation' })[world]);
    let pages = 0;
    while (saved().active?.phase !== 'ended' && pages++ < 100) {
      const buttons = within(screen.getByRole('group', { name: '人生选择' })).getAllByRole('button');
      fireEvent.click(buttons.find(button => !(button as HTMLButtonElement).disabled)!);
      expect(saved().active?.phase).toBe('result');
      fireEvent.click(screen.getByRole('button', { name: /往后走一页|回望这一生/ }));
    }
    expect(pages).toBeLessThan(100);
    expect(screen.getByRole('button', { name: '导出生平' })).toBeVisible();
    const completed = saved().active;
    fireEvent.click(screen.getByRole('button', { name: '导出生平' }));
    const exported = screen.getByRole('textbox', { name: '生平全文' }) as HTMLTextAreaElement;
    expect(exported.value).toContain(completed!.journal[0].result);
    expect(exported.value).toContain('留下的旧物');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '关闭' }));
    expect(saved().shelf).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '再启一生' }));
    expect(screen.getByRole('button', { name: '进入现代人生' })).toBeVisible();
    view.unmount();
    render(<LifeSimulator />);
    fireEvent.click(screen.getByRole('button', { name: '往世录 1' }));
    fireEvent.click(screen.getByRole('button', { name: /知遥的一生/ }));
    expect(saved().active).toBeNull();
    expect(screen.getByRole('button', { name: '翻阅人生手记' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '翻阅人生手记' }));
    expect(screen.getByText(completed!.journal[0].title)).toBeVisible();
  }, 30000);
  it('restores a resolved consequence and requires confirmation to discard an unfinished life', async () => {
    const user = userEvent.setup();
    const view = render(<LifeSimulator />);
    await user.click(screen.getByRole('button', { name: '进入现代人生' }));
    await user.click(within(screen.getByRole('group', { name: '人生选择' })).getByRole('button'));
    const resolved = saved().active;
    view.unmount();
    render(<LifeSimulator />);
    expect(screen.queryByRole('group', { name: '人生选择' })).not.toBeInTheDocument();
    expect(saved().active).toEqual(resolved);
    await user.click(screen.getByRole('button', { name: '重新开始' }));
    const modal = screen.getByRole('dialog');
    await user.click(within(modal).getByRole('button', { name: '继续现在的人生' }));
    expect(saved().active).toEqual(resolved);
    await user.click(screen.getByRole('button', { name: '重新开始' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '重新开始' }));
    expect(saved().active).toBeNull();
    expect(screen.getByRole('button', { name: '进入现代人生' })).toBeVisible();
  });
  it('remains playable when saving is blocked and leaves other games untouched', () => {
    localStorage.setItem('snake:best:v1', '100');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    render(<LifeSimulator />);
    expect(screen.getByText(/浏览器暂时无法保存/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '进入现代人生' }));
    fireEvent.click(within(screen.getByRole('group', { name: '人生选择' })).getByRole('button'));
    expect(screen.getByRole('button', { name: '往后走一页' })).toBeVisible();
    expect(localStorage.getItem('snake:best:v1')).toBe('100');
  });
});
