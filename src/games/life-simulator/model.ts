export const attributes = [
  { id: 'body', name: '体魄', cost: 1, description: '抵御病痛，也有力气走更远的路。' },
  { id: 'charm', name: '魅力', cost: 1, description: '与人相识、表达和相互理解的起点。' },
  { id: 'spirit', name: '心性', cost: 1, description: '面对漫长等待、压力和诱惑的定力。' },
  { id: 'mind', name: '悟性', cost: 2, description: '学习知识、手艺与功法的能力。' },
  { id: 'family', name: '家境', cost: 2, description: '出生时的资源，不等同于一生的财富。' },
  { id: 'luck', name: '气运', cost: 3, description: '让偶然的机会更容易向你靠近。' },
] as const;
export type Attribute = typeof attributes[number]['id'];
export type Stats = Record<Attribute, number>;
export type WorldId = 'modern' | 'ancient' | 'cultivation';
export type Relation = 'family' | 'friend' | 'mentor';
export type Route = 'home' | 'study' | 'venture';
export interface Effect {
  stats?: Partial<Stats>;
  health?: number;
  wealth?: number;
  peace?: number;
  links?: Partial<Record<Relation, number>>;
  flags?: string[];
  route?: Route;
  path?: string;
  lifespan?: number;
}
export type Prose = string | ((life: Life) => string);
export interface Outcome { text: Prose; effect?: Effect }
export interface Choice {
  id: string;
  label: string;
  hint: string;
  outcome: Outcome;
  requirement?: { stat: Attribute; min: number };
  risk?: { stat: Attribute; difficulty: number; success: Outcome; failure: Outcome };
}
export interface StoryEvent { id: string; age: number; title: string; text: Prose; choices: Choice[]; final?: boolean; kind?: 'main' | 'side' | 'incident' | 'life' }
export type Chapter = StoryEvent | ((life: Life) => StoryEvent);
export interface JournalEntry {
  eventId: string;
  age: number;
  title: string;
  story: string;
  choiceId: string;
  choice: string;
  result: string;
  changes: string[];
  kind?: StoryEvent['kind'];
}
export interface Life {
  version: 1 | 2;
  id: string;
  name: string;
  world: WorldId;
  initial: Stats;
  stats: Stats;
  health: number;
  wealth: number;
  peace: number;
  links: Record<Relation, number>;
  flags: string[];
  route: Route;
  seed: number;
  birthSeed: number;
  origin: number;
  cursor: number;
  phase: 'event' | 'result' | 'ended';
  journal: JournalEntry[];
  path?: string;
  journey?: { eventId: string; age: number; endAge: number; offers?: string[] };
}
export interface World {
  id: WorldId;
  name: string;
  subtitle: string;
  description: string;
  place: string;
  routes: Record<Route, string>;
  relations: Record<Relation, { name: string; role: string }>;
  origins: string[];
  chapters: Chapter[];
}
export interface Ending { title: string; subtitle: string; paragraphs: string[]; keepsake: string }
export const prose = (text: Prose, life: Life) => typeof text === 'function' ? text(life) : text;
export const has = (life: Life, flag: string) => life.flags.includes(flag);
export const outcome = (text: Prose, effect?: Effect): Outcome => ({ text, effect });
export const choice = (id: string, label: string, hint: string, text: Prose, effect?: Effect): Choice => ({ id, label, hint, outcome: outcome(text, effect) });
export const event = (id: string, age: number, title: string, text: Prose, choices: Choice[]): StoryEvent => ({ id, age, title, text, choices });
