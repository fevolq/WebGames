import { describe, expect, it } from 'vitest';
import { advance, allocate, BASE_STATS, BUDGET, choiceAvailable, choose, createLegacyLife as createLife, currentEvent, endingFor, presets, randomStats, spent, successChance, worlds } from './engine';
import { attributes, prose, type Life, type WorldId } from './model';

function random(seed: number) { let value = seed; return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; }; }
function play(world: WorldId, decide: (life: Life) => string, seed = 42) {
  let life = createLife(world, '知遥', presets[0].stats, seed, 'test');
  while (life.phase !== 'ended') {
    const scene = currentEvent(life);
    const available = scene.choices.filter(option => choiceAvailable(life, option));
    life = advance(choose(life, available.find(option => option.id === decide(life))?.id ?? available[0].id));
  }
  return life;
}

describe('birth allocation', () => {
  it('charges different prices, refunds accurately and rejects overspending and limits', () => {
    const mind = allocate(BASE_STATS, 'mind', 1);
    expect(spent(mind)).toBe(2);
    expect(allocate(mind, 'mind', -1)).toEqual(BASE_STATS);
    expect(allocate(BASE_STATS, 'body', -1)).toBe(BASE_STATS);
    for (const preset of presets) {
      expect(spent(preset.stats)).toBe(BUDGET);
      expect(allocate(preset.stats, 'body', 1)).toBe(preset.stats);
    }
    const maximum = { ...BASE_STATS, body: 10 };
    expect(allocate(maximum, 'body', 1)).toBe(maximum);
  });
  it('always spends the entire random budget without exceeding any attribute cap', () => {
    for (let seed = 0; seed < 300; seed++) {
      const stats = randomStats(random(seed));
      expect(spent(stats)).toBe(BUDGET);
      expect(attributes.every(attr => stats[attr.id] >= 1 && stats[attr.id] <= 10)).toBe(true);
    }
    expect(spent(randomStats(() => 0))).toBe(BUDGET);
  });
});

describe('legacy authored life stories remain replayable', () => {
  it.each(worlds)('$name starts at birth and all sampled routes reach coherent endings', world => {
    const visited = new Set<string>();
    const titles = new Set<string>();
    for (let seed = 0; seed < 120; seed++) {
      const rand = random(seed * 12347 + 2);
      let life = createLife(world.id, '行舟', randomStats(rand), seed * 9337, `life-${seed}`);
      let previousAge = -1;
      let guard = 0;
      expect(currentEvent(life).age).toBe(0);
      while (life.phase !== 'ended' && guard++ < 40) {
        const scene = currentEvent(life);
        expect(scene.age).toBeGreaterThan(previousAge);
        previousAge = scene.age;
        expect(prose(scene.text, life).length).toBeGreaterThan(30);
        const available = scene.choices.filter(option => choiceAvailable(life, option));
        expect(available.length).toBeGreaterThan(0);
        expect(new Set(scene.choices.map(option => option.id)).size).toBe(scene.choices.length);
        const selected = available[Math.floor(rand() * available.length)];
        visited.add(scene.id);
        life = choose(life, selected.id);
        expect(life.journal.at(-1)?.result.length).toBeGreaterThan(10);
        expect(choose(life, selected.id)).toBe(life);
        life = advance(life);
      }
      expect(life.phase).toBe('ended');
      expect(guard).toBeLessThan(40);
      const ending = endingFor(life);
      expect(ending.paragraphs.length).toBeGreaterThanOrEqual(3);
      expect(new Set(life.journal.map(entry => entry.eventId)).size).toBe(life.journal.length);
      expect(advance(life)).toBe(life);
      titles.add(ending.title);
    }
    expect(visited.size).toBeGreaterThanOrEqual(world.chapters.length + 4);
    expect(titles.size).toBeGreaterThanOrEqual(4);
  });
  it('makes early choices return years later and lets an adult change routes', () => {
    const life = play('modern', state => {
      const id = currentEvent(state).id;
      return ({ 'm-camera': 'shop', 'm-leave': 'college', 'm-shop36': 'inherit' } as Record<string, string>)[id] ?? '';
    });
    expect(life.journal.find(entry => entry.eventId === 'm-shop36')?.story).toContain('你十岁时拍的背影');
    expect(life.journal.some(entry => entry.eventId === 'm-study22')).toBe(true);
    expect(life.journal.some(entry => entry.eventId === 'm-home40')).toBe(true);
    expect(life.route).toBe('home');
    expect(endingFor(life).keepsake).toBe('一张父亲的背影');
  });
  it('enforces choice requirements in the engine and never rerolls a selected result', () => {
    let life = createLife('modern', '知遥', BASE_STATS, 99, 'locked');
    while (currentEvent(life).id !== 'm-offer28') life = advance(choose(life, currentEvent(life).choices[0].id));
    const option = currentEvent(life).choices.find(choice => choice.id === 'negotiate')!;
    expect(choiceAvailable(life, option)).toBe(false);
    expect(choose(life, 'negotiate')).toBe(life);
    const ready = { ...life, stats: { ...life.stats, charm: 8 } };
    expect(choose(ready, 'negotiate')).toEqual(choose(ready, 'negotiate'));
    expect(successChance({ ...ready, stats: { ...ready.stats, luck: 10 } }, option)).toBeGreaterThan(successChance(ready, option));
  });
  it('gives a mortal cultivation life a complete ending without jumping to impossible ages', () => {
    const life = play('cultivation', state => ({ 'c-foundation30': 'human', 'c-second48': 'accept' } as Record<string, string>)[currentEvent(state).id] ?? '');
    expect(life.journal.at(-1)?.age).toBe(88);
    expect(life.journal.at(-1)?.eventId).toBe('c-mortal');
    expect(endingFor(life).title).toBe('山下的一生');
    expect(life.journal.some(entry => entry.age > 88)).toBe(false);
  });
  it('uses a saved elixir to guarantee the promised second breakthrough', () => {
    let life = createLife('cultivation', '知遥', presets[0].stats, 77, 'elixir');
    while (currentEvent(life).id !== 'c-second48') {
      const scene = currentEvent(life);
      const choice = scene.id === 'c-foundation30' ? 'wait' : scene.id === 'c-secret42' ? 'keep' : scene.choices[0].id;
      life = advance(choose(life, choice));
    }
    const option = currentEvent(life).choices[0];
    expect(successChance(life, option)).toBe(1);
    expect(choose(life, option.id).flags).toContain('foundation');
  });
  it('ends an exhausted life after its consequence page and never advances past that age', () => {
    let life = createLife('modern', '知遥', BASE_STATS, 2, 'short');
    while (currentEvent(life).id !== 'm-fourteen') life = advance(choose(life, currentEvent(life).choices[0].id));
    life = choose({ ...life, health: 1 }, 'learn');
    expect(life.phase).toBe('result');
    expect(life.health).toBe(0);
    life = advance(life);
    expect(life.phase).toBe('ended');
    expect(endingFor(life).title).toBe('未写完的手记');
  });
});
