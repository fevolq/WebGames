// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { advance, choose, createLegacyLife as createLife, currentEvent, presets } from './engine';
import { decode, encode, freshSave, load, persist, STORAGE_KEY, updateLife } from './storage';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('independent life saves', () => {
  it('restores pending choices and already resolved consequences without rerolling', () => {
    let life = createLife('cultivation', '知遥', presets[0].stats, 50, 'replay');
    while (currentEvent(life).id !== 'c-foundation30') life = advance(choose(life, currentEvent(life).choices[0].id));
    expect(decode(encode(updateLife(freshSave(), life)))?.active).toEqual(life);
    life = choose(life, 'break');
    expect(decode(encode(updateLife(freshSave(), life)))?.active).toEqual(life);
  });
  it('keeps completed lives when starting over, deduplicates them, and preserves other games', () => {
    let life = createLife('modern', '知遥', presets[0].stats, 5, 'archive');
    while (life.phase !== 'ended') life = advance(choose(life, currentEvent(life).choices[0].id));
    const save = updateLife(updateLife(freshSave(), life), life);
    expect(save.shelf).toHaveLength(1);
    localStorage.setItem('2048:v1', 'other-game');
    expect(persist({ ...save, active: null })).toBe(true);
    expect(load().save.shelf[0]).toEqual(life);
    expect(load().save.active).toBeNull();
    expect(localStorage.getItem('2048:v1')).toBe('other-game');
  });
  it('rejects invalid budgets, impossible histories and invalid phases', () => {
    const save = updateLife(freshSave(), choose(createLife('modern', '知遥', presets[0].stats, 5, 'bad'), 'arrive'));
    for (const corrupt of [
      (data: any) => { data.active.initial.mind = 100; },
      (data: any) => { data.active.steps[0].choice = 'nonexistent'; },
      (data: any) => { data.active.steps[0].event = 'm-last'; },
      (data: any) => { data.active.phase = 'ended'; },
      (data: any) => { data.active.seed = -1; },
    ]) {
      const value = JSON.parse(encode(save)); corrupt(value); expect(decode(JSON.stringify(value))).toBeNull();
    }
    localStorage.setItem(STORAGE_KEY, '{broken');
    expect(load().warning).toContain('无法读取');
    expect(load().save.active).toBeNull();
  });
  it('handles unavailable storage without interrupting gameplay', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
    expect(load().warning).toContain('暂不允许保存');
    expect(persist(freshSave())).toBe(false);
  });
});
