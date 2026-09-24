import { describe, expect, it } from 'vitest';
import { advance, BASE_STATS, choiceAvailable, choose, createLegacyLife, createLife, currentEvent, endingFor, presets, successChance, worlds, worldForLife } from './engine';
import { availableEvents, candidateWeight, eventPools, MAX_LIFE_EVENTS } from './journey';
import { has, prose, type Life, type Stats, type WorldId } from './model';
import { randomStream } from './random';
import { decode, encode, freshSave, updateLife } from './storage';
import { origins } from './stories/origins';
import { paths } from './stories/paths';
import { sideArcs } from './stories/sideStories';

function run(world: WorldId, seed: number, decide?: (life: Life) => string, stats: Stats = presets[0].stats) {
  let life = createLife(world, '行舟', stats, seed, `test-${world}-${seed}`);
  let guard = 0;
  const random = randomStream(seed ^ 0x87125);
  while (life.phase !== 'ended' && guard++ < MAX_LIFE_EVENTS) {
    const scene = currentEvent(life);
    const options = scene.choices.filter(option => choiceAvailable(life, option));
    const id = decide?.(life) ?? options[Math.floor(random.next() * options.length)].id;
    life = advance(choose(life, id));
  }
  return life;
}
function atEvent(life: Life, id: string, age: number): Life {
  return { ...life, phase: 'event', journey: { ...life.journey!, eventId: id, age } };
}

describe('varied, reproducible lives', () => {
  it.each(worlds)('$name has varied origins and state-linked events, with complete bounded lives', world => {
    const originsSeen = new Set<number>(), timelines = new Set<string>(), kinds = new Set<string>(), directions = new Set<string>();
    let closures = 0, accidents = 0;
    for (let seed = 0; seed < 100; seed++) {
      let life = createLife(world.id, '行舟', presets[seed % 3].stats, seed, `sample-${seed}`);
      originsSeen.add(life.origin);
      expect(life.version).toBe(2);
      expect(currentEvent(life).age).toBe(0);
      expect(worldForLife(life).place).toBe(origins[world.id][life.origin].place);
      const random = randomStream(seed ^ 0x87812);
      let age = -1;
      for (let step = 0; step < MAX_LIFE_EVENTS && life.phase !== 'ended'; step++) {
        const scene = currentEvent(life);
        expect(scene.age).toBeGreaterThan(age);
        expect(scene.age).toBeLessThanOrEqual(life.journey!.endAge);
        expect(prose(scene.text, life).length).toBeGreaterThan(25);
        expect(life.journal.some(entry => entry.eventId === scene.id)).toBe(false);
        expect(new Set(scene.choices.map(option => option.id)).size).toBe(scene.choices.length);
        const available = scene.choices.filter(option => choiceAvailable(life, option));
        expect(available.length).toBeGreaterThan(0);
        kinds.add(scene.kind!);
        age = scene.age;
        const selected = available[Math.floor(random.next() * available.length)];
        const result = choose(life, selected.id);
        expect(choose(result, selected.id)).toBe(result);
        expect(currentEvent(result).id).toBe(scene.id);
        expect(result.journal.at(-1)?.result.length).toBeGreaterThan(10);
        life = advance(result);
      }
      expect(life.phase).toBe('ended');
      expect(life.journal.length).toBeLessThanOrEqual(MAX_LIFE_EVENTS);
      expect(advance(life)).toBe(life);
      expect(endingFor(life).paragraphs.length).toBeGreaterThanOrEqual(4);
      if (life.path) directions.add(life.path);
      closures += life.flags.filter(flag => flag.endsWith(':done') && sideArcs.some(arc => `${arc.id}:done` === flag)).length;
      accidents += life.journal.filter(entry => entry.kind === 'incident').length;
      timelines.add(life.journal.map(entry => entry.eventId).join('|'));
      if (seed < 4) expect(decode(encode(updateLife(freshSave(), life)))?.active).toEqual(life);
    }
    expect(originsSeen.size).toBe(6);
    expect(timelines.size).toBeGreaterThan(90);
    expect(directions.size).toBe(6);
    expect(kinds).toEqual(new Set(['life', 'main', 'side', 'incident']));
    expect(closures).toBeGreaterThan(5);
    expect(accidents).toBeGreaterThan(100);
  }, 30000);

  it('uses current attributes, interests, relationships and needs without making accidents deterministic', () => {
    const base = createLife('modern', '小满', BASE_STATS, 44, 'weights');
    const main = eventPools.modern.find(item => item.scene.id === 'modern-research-0')!;
    const incident = eventPools.modern.find(item => item.scene.id === 'modern-incident-award')!;
    const skilled = { ...base, stats: { ...base.stats, mind: 15 } };
    expect(candidateWeight(skilled, main)).toBeGreaterThan(candidateWeight(base, main) * 3);
    expect(candidateWeight(skilled, incident) / candidateWeight(base, incident)).toBeLessThan(1.4);
    expect(candidateWeight({ ...base, flags: ['interest:mind'] }, main)).toBeGreaterThan(candidateWeight(base, main));
    const side = eventPools.modern.find(item => item.scene.id === 'modern-library-start')!;
    expect(candidateWeight({ ...base, links: { ...base.links, friend: 90 } }, side)).toBeGreaterThan(candidateWeight(base, side));
    const rest = eventPools.modern.find(item => item.scene.id === 'modern-day-rest')!;
    expect(candidateWeight({ ...base, health: 10 }, rest)).toBeGreaterThan(candidateWeight(base, rest));
    const option = main.scene.choices[0];
    expect(successChance(skilled, option)).toBeGreaterThan(successChance(base, option));
    expect(successChance({ ...skilled, stats: { ...skilled.stats, luck: 20 } }, option)).toBeLessThan(1);
    const fortunate = { ...skilled, stats: { ...skilled.stats, luck: 20 } };
    const bad = eventPools.modern.find(item => item.scene.id === 'modern-incident-fraud')!;
    expect(candidateWeight(fortunate, bad)).toBeLessThan(candidateWeight(base, bad));
    expect(availableEvents(fortunate, 30).some(item => item.scene.id === bad.scene.id)).toBe(true);
    for (const item of eventPools.modern.filter(item => item.scene.kind === 'incident')) {
      expect(candidateWeight(fortunate, item)).toBeGreaterThanOrEqual(0.8);
      expect(candidateWeight(fortunate, item)).toBeLessThanOrEqual(1.25);
    }
  });

  it('draws different career opportunities for different current skills with the same birth seeds', () => {
    let scholarly = 0, physical = 0;
    for (let seed = 0; seed < 150; seed++) {
      let base = createLife('modern', '小满', BASE_STATS, seed, `offer-${seed}`);
      base = choose(base, 'arrive');
      base = { ...base, journey: { ...base.journey!, eventId: 'modern-child-books', age: 15 } };
      for (const type of ['mind', 'body'] as const) {
        const life = advance({ ...base, stats: { ...base.stats, [type]: 18 } });
        const included = life.journey!.offers!.includes('modern-research');
        if (type === 'mind' && included) scholarly++;
        if (type === 'body' && included) physical++;
      }
    }
    expect(scholarly).toBeGreaterThan(physical + 25);
  });

  it.each(sideArcs)('$id has gated, delayed, branching follow-ups and a keepsake in the ending', arc => {
    let life = createLife(arc.world, '小满', BASE_STATS, 3, arc.id);
    expect(availableEvents(life, 50).some(item => item.scene.id === `${arc.id}-turn`)).toBe(false);
    life = choose(atEvent(life, `${arc.id}-start`, arc.minAge), 'accept');
    expect(availableEvents(life, arc.minAge + 1).some(item => item.scene.id === `${arc.id}-turn`)).toBe(false);
    expect(availableEvents(life, arc.minAge + 5).some(item => item.scene.id === `${arc.id}-turn`)).toBe(true);
    life = choose(atEvent(life, `${arc.id}-turn`, arc.minAge + 5), 'continue');
    life = choose(atEvent(life, `${arc.id}-close`, arc.minAge + 10), 'remember');
    expect(has(life, `${arc.id}:done`)).toBe(true);
    expect(life.journal.at(-1)?.result).toBe(has(life, `${arc.id}:good`) ? arc.close[2] : arc.close[3]);
    expect(endingFor(life).keepsake).toBe(arc.keepsake);
    expect(availableEvents(life, arc.minAge + 12).some(item => item.scene.id.startsWith(arc.id))).toBe(false);
    const declined = choose(atEvent(createLife(arc.world, '小满', BASE_STATS, 4), `${arc.id}-start`, arc.minAge), 'pass');
    expect(availableEvents(declined, 50).some(item => item.scene.id === `${arc.id}-turn`)).toBe(false);
  });

  it('allows a new direction without resetting past side stories or repeating career stages', () => {
    let life = createLife('modern', '小满', BASE_STATS, 3);
    life = { ...life, path: 'modern-craft', route: 'home', flags: ['chosen-route', 'modern-letter:started'] };
    life = { ...atEvent(life, 'modern-change', 35), journey: { ...life.journey!, eventId: 'modern-change', age: 35, offers: ['modern-research', 'modern-arts', 'modern-service'] } };
    life = choose(life, 'modern-research');
    expect(life.path).toBe('modern-research');
    expect(life.flags).toContain('modern-letter:started');
    expect(availableEvents(life, 40).some(item => item.scene.id === 'modern-research-0')).toBe(true);
    expect(availableEvents(life, 40).some(item => item.scene.id === 'modern-craft-0')).toBe(false);
  });

  it('freezes pending events, choices and consequences across replay and rejects tampering', () => {
    let life = createLife('cultivation', '小满', presets[1].stats, 129, 'stable');
    const random = randomStream(884);
    for (let step = 0; step < 65 && life.phase !== 'ended'; step++) {
      const pending = decode(encode(updateLife(freshSave(), life)))!.active!;
      expect(pending).toEqual(life);
      expect(currentEvent(pending).id).toBe(currentEvent(life).id);
      expect(currentEvent(pending).choices.map(item => item.id)).toEqual(currentEvent(life).choices.map(item => item.id));
      const options = currentEvent(life).choices;
      life = choose(life, options[Math.floor(random.next() * options.length)].id);
      expect(decode(encode(updateLife(freshSave(), life)))?.active).toEqual(life);
      life = advance(life);
    }
    const raw = JSON.parse(encode(updateLife(freshSave(), life)));
    raw.active.steps[1].event = 'modern-incident-grant';
    expect(decode(JSON.stringify(raw))).toBeNull();
    raw.active.storyVersion = 999;
    expect(decode(JSON.stringify(raw))).toBeNull();
  });

  it('keeps original saves without a story version and can mix old and new archived lives', () => {
    let old = createLegacyLife('ancient', '故人', presets[0].stats, 25, 'old');
    while (old.phase !== 'ended') old = advance(choose(old, currentEvent(old).choices[0].id));
    const save = { ...freshSave(), active: run('modern', 50), shelf: [old] };
    const raw = JSON.parse(encode(save));
    delete raw.shelf[0].storyVersion;
    expect(decode(JSON.stringify(raw))).toEqual(save);
    expect(endingFor(decode(JSON.stringify(raw))!.shelf[0])).toEqual(endingFor(old));
  });

  it('keeps mortal lives within their lifespan and only extends it after a successful breakthrough', () => {
    const mortal = run('cultivation', 16, life => currentEvent(life).choices.find(item => ['human', 'accept', 'stay'].includes(item.id))?.id ?? currentEvent(life).choices[0].id);
    expect(mortal.phase).toBe('ended');
    expect(mortal.journal.every(entry => entry.age <= mortal.journey!.endAge)).toBe(true);
    if (!has(mortal, 'foundation')) expect(mortal.journal.at(-1)!.age).toBeLessThanOrEqual(95);
    let success = false, failure = false;
    for (let seed = 0; seed < 50; seed++) {
      const before = atEvent(createLife('cultivation', '小满', presets[0].stats, seed), 'cultivation-foundation', 30);
      const after = choose(before, 'break');
      const won = has(after, 'foundation');
      expect(after.journey!.endAge).toBe(before.journey!.endAge + (won ? 100 : 0));
      if (won) success = true; else failure = true;
    }
    expect(success && failure).toBe(true);
  });

  it('shows the final consequence of a fatal accident before ending at that age', () => {
    const before = atEvent({ ...createLife('modern', '小满', BASE_STATS, 2), health: 3 }, 'modern-incident-injury', 22);
    const result = choose(before, 'respond');
    expect(result.phase).toBe('result');
    expect(result.health).toBe(0);
    const end = advance(result);
    expect(end.phase).toBe('ended');
    expect(end.journey!.age).toBe(22);
    expect(endingFor(end).title).toBe('未写完的手记');
  });

  it('has unique authored content and every route has three stages plus safe options', () => {
    const all = Object.values(eventPools).flat();
    expect(new Set(all.map(item => item.scene.id)).size).toBe(all.length);
    expect(all.length).toBeGreaterThanOrEqual(160);
    for (const path of paths) {
      const stages = eventPools[path.world].filter(item => /^\d$/.test(item.scene.id.slice(path.id.length + 1)) && item.scene.id.startsWith(`${path.id}-`));
      expect(stages).toHaveLength(3);
      for (const stage of stages) expect(stage.scene.choices.some(item => !item.risk && !item.requirement)).toBe(true);
    }
  });

  it('keeps childhood activities age-appropriate and does not treat distant friends as immortal', () => {
    for (const world of worlds) {
      for (let seed = 0; seed < 15; seed++) {
        const child = advance(choose(createLife(world.id, '小满', BASE_STATS, seed), 'arrive'));
        expect(currentEvent(child).age).toBeGreaterThanOrEqual(3);
        expect(currentEvent(child).age).toBeLessThanOrEqual(4);
        expect(currentEvent(child).id).toContain('-child-');
      }
    }
    const elder = atEvent(createLife('cultivation', '小满', BASE_STATS, 44), 'cultivation-quiet-30', 150);
    expect(worldForLife(elder).relations.friend.role).toBe('延续下来的故交');
    expect(worldForLife(elder).relations.mentor.role).toBe('师承与后人');
  });
});
