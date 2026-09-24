import type { Attribute, Life, StoryEvent } from '../model';

export interface EventCandidate {
  scene: StoryEvent;
  minAge: number;
  maxAge?: number;
  affinity?: Attribute;
  weight?: number;
  fortune?: -1 | 1;
  eligible?: (life: Life) => boolean;
}
export const seen = (life: Life, id: string) => life.journal.some(entry => entry.eventId === id);
export const yearsSince = (life: Life, id: string, age: number) => age - (life.journal.find(entry => entry.eventId === id)?.age ?? age);
