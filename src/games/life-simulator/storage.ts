import { advance, choose, createLegacyLife, createLife, currentEvent, endingFor, presets, validStats, worlds } from './engine';
import { MAX_LIFE_EVENTS } from './journey';
import type { Life, Stats, WorldId } from './model';

export const STORAGE_KEY = 'life-simulator:save:v1';
export interface Draft { name: string; world: WorldId; stats: Stats }
export interface GameSave { draft: Draft; active: Life | null; shelf: Life[] }
export const freshSave = (): GameSave => ({ draft: { name: '知遥', world: 'modern', stats: { ...presets[0].stats } }, active: null, shelf: [] });
interface Recipe { storyVersion?: 1 | 2; id: string; name: string; world: WorldId; initial: Stats; seed: number; steps: { event: string; choice: string }[]; phase: Life['phase'] }
function recipe(life: Life): Recipe {
  return { storyVersion: life.version, id: life.id, name: life.name, world: life.world, initial: life.initial, seed: life.birthSeed,
    steps: life.journal.map(entry => ({ event: entry.eventId, choice: entry.choiceId })), phase: life.phase };
}
function validName(name: unknown): name is string { return typeof name === 'string' && name.length <= 12 && !/[\u0000-\u001f]/.test(name); }
function restore(value: unknown): Life | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Recipe;
  const storyVersion = input.storyVersion === undefined ? 1 : input.storyVersion;
  if (storyVersion !== 1 && storyVersion !== 2) return null;
  if (!worlds.some(world => world.id === input.world) || !validStats(input.initial) || !validName(input.name)
    || typeof input.id !== 'string' || input.id.length > 100 || !input.id.length
    || !Number.isInteger(input.seed) || input.seed < 0 || input.seed > 0xffffffff
    || !Array.isArray(input.steps) || input.steps.length > (storyVersion === 1 ? 40 : MAX_LIFE_EVENTS) || !['event', 'result', 'ended'].includes(input.phase)) return null;
  let life = (storyVersion === 1 ? createLegacyLife : createLife)(input.world, input.name, input.initial, input.seed, input.id);
  for (const [index, step] of input.steps.entries()) {
    if (!step || life.phase !== 'event' || currentEvent(life).id !== step.event) return null;
    const next = choose(life, step.choice);
    if (next === life) return null;
    life = next;
    if (index < input.steps.length - 1 || input.phase !== 'result') life = advance(life);
  }
  return life.phase === input.phase ? life : null;
}
export function encode(save: GameSave) {
  return JSON.stringify({ version: 1, draft: save.draft, active: save.active ? recipe(save.active) : null, shelf: save.shelf.slice(0, 12).map(recipe) });
}
export function decode(raw: string | null): GameSave | null {
  if (raw === null || raw.length > 300_000) return null;
  try {
    const data = JSON.parse(raw);
    if (data?.version !== 1 || !data.draft || !validName(data.draft.name) || !validStats(data.draft.stats)
      || !worlds.some(world => world.id === data.draft.world) || !Array.isArray(data.shelf) || data.shelf.length > 12) return null;
    const active = data.active === null ? null : restore(data.active);
    if (data.active !== null && !active) return null;
    // An independently damaged old record should not discard a valid current life.
    const shelf: Life[] = [];
    for (const item of data.shelf) {
      const life = restore(item);
      if (life?.phase === 'ended' && !shelf.some(entry => entry.id === life.id)) shelf.push(life);
    }
    return { draft: data.draft, active, shelf };
  } catch { return null; }
}
export function load(): { save: GameSave; warning: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { save: freshSave(), warning: '' };
    const save = decode(raw);
    return save ? { save, warning: '' } : { save: freshSave(), warning: '这份本地存档无法读取，可以重新开始一段人生。' };
  } catch { return { save: freshSave(), warning: '浏览器暂不允许保存。仍可游玩，关闭页面后进度可能丢失。' }; }
}
export function persist(save: GameSave) {
  try { localStorage.setItem(STORAGE_KEY, encode(save)); return true; } catch { return false; }
}
export function updateLife(save: GameSave, life: Life): GameSave {
  return { ...save, active: life, shelf: life.phase === 'ended' ? [life, ...save.shelf.filter(entry => entry.id !== life.id)].slice(0, 12) : save.shelf };
}
export function lifeText(life: Life) {
  return `${life.name}的一生 · ${worlds.find(world => world.id === life.world)!.name}\n\n${life.journal.map(entry => `${entry.age} 岁｜${entry.title}\n${entry.story}\n\n选择：${entry.choice}\n${entry.result}`).join('\n\n——\n\n')}`;
}
export function exportText(life: Life) {
  if (life.phase !== 'ended') return lifeText(life);
  const ending = endingFor(life);
  return `${ending.title}\n${ending.subtitle}\n\n${ending.paragraphs.join('\n\n')}\n\n留下的旧物：${ending.keepsake}\n\n—— 人生手记 ——\n\n${lifeText(life)}`;
}
