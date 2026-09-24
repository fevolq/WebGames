import { attributes, has, prose, type Attribute, type Choice, type Effect, type Ending, type Life, type Relation, type Stats, type WorldId } from './model';
import { modern } from './stories/modern';
import { ancient } from './stories/ancient';
import { cultivation } from './stories/cultivation';
import { journeyEnding, journeyEvent, nextJourneyEvent, startJourney } from './journey';
import { randomStream } from './random';
import { journeyRelations, originFor } from './stories/origins';
import { pathFor } from './stories/paths';

export const worlds = [modern, ancient, cultivation];
export const BUDGET = 30;
export const BASE_STATS: Stats = { body: 1, charm: 1, spirit: 1, mind: 1, family: 1, luck: 1 };
export const presets: { name: string; description: string; stats: Stats }[] = [
  { name: '慢慢生长', description: '身心与学习兼顾', stats: { body: 6, charm: 3, spirit: 5, mind: 6, family: 4, luck: 2 } },
  { name: '心向远方', description: '聪慧，愿意与人相识', stats: { body: 3, charm: 6, spirit: 4, mind: 8, family: 1, luck: 3 } },
  { name: '顺风开局', description: '资源充裕，也有些好运', stats: { body: 3, charm: 3, spirit: 3, mind: 2, family: 6, luck: 5 } },
];
export const worldFor = (id: WorldId) => worlds.find(world => world.id === id)!;
export const worldForLife = (life: Life) => life.version === 2
  ? { ...worldFor(life.world), place: originFor(life).place, relations: journeyRelations(life) }
  : worldFor(life.world);
export const directionFor = (life: Life) => life.version === 2 ? pathFor(life)?.name ?? '日常与身边的人' : worldFor(life.world).routes[life.route];
export const spent = (stats: Stats) => attributes.reduce((sum, stat) => sum + (stats[stat.id] - 1) * stat.cost, 0);
export const validStats = (value: unknown): value is Stats => !!value && typeof value === 'object'
  && attributes.every(({ id }) => { const v = (value as Stats)[id]; return Number.isInteger(v) && v >= 1 && v <= 10; })
  && spent(value as Stats) <= BUDGET;
export function allocate(stats: Stats, id: Attribute, delta: -1 | 1): Stats {
  const next = { ...stats, [id]: stats[id] + delta };
  return validStats(next) ? next : stats;
}
export function randomStats(random: () => number = Math.random): Stats {
  const stats = { ...BASE_STATS };
  while (spent(stats) < BUDGET) {
    const remaining = BUDGET - spent(stats);
    const eligible = attributes.filter(stat => stats[stat.id] < 10 && stat.cost <= remaining
      && (remaining === stat.cost || attributes.some(other => stats[other.id] + (other.id === stat.id ? 1 : 0) < 10 && other.cost <= remaining - stat.cost)));
    if (!eligible.length) break;
    const stat = eligible[Math.min(eligible.length - 1, Math.max(0, Math.floor(random() * eligible.length)))];
    stats[stat.id]++;
  }
  return stats;
}
export const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
export function createLegacyLife(world: WorldId, name: string, stats: Stats, seed: number, id = `${Date.now()}-${seed}`): Life {
  if (!validStats(stats) || !worlds.some(entry => entry.id === world)) throw new Error('Invalid life configuration');
  const normalized = seed >>> 0;
  return {
    version: 1, id, world, name: name.trim().slice(0, 12) || '无名', initial: { ...stats }, stats: { ...stats },
    health: 55 + stats.body * 4, wealth: 12 + stats.family * 7, peace: 45 + stats.spirit * 3,
    links: { family: 52 + stats.charm * 2, friend: 25, mentor: 10 }, flags: [], route: 'home',
    seed: normalized, birthSeed: normalized, origin: normalized % 3, cursor: 0, phase: 'event', journal: [],
  };
}
export function createLife(world: WorldId, name: string, stats: Stats, seed: number, id = `${Date.now()}-${seed}`): Life {
  return startJourney(createLegacyLife(world, name, stats, seed, id));
}
export function currentEvent(life: Life) {
  if (life.version === 2) return journeyEvent(life);
  const chapter = worldFor(life.world).chapters[life.cursor];
  if (!chapter) throw new Error('Missing life chapter');
  return typeof chapter === 'function' ? chapter(life) : chapter;
}
export const choiceAvailable = (life: Life, choice: Choice) => !choice.requirement || life.stats[choice.requirement.stat] >= choice.requirement.min;
export function successChance(life: Life, choice: Choice) {
  if (!choice.risk) return 1;
  if (life.version === 2) return clamp(0.34 + life.stats[choice.risk.stat] * 0.045 + life.stats.luck * 0.008 - choice.risk.difficulty * 0.02 + (life.peace - 50) * 0.001 - (life.health < 30 ? 0.08 : 0), 0.12, 0.9);
  if (currentEvent(life).id === 'c-second48' && choice.id === 'retry' && has(life, 'elixir')) return 1;
  return clamp(0.42 + life.stats[choice.risk.stat] * 0.05 + life.stats.luck * 0.025 - choice.risk.difficulty * 0.035, 0.15, 0.92);
}
function apply(life: Life, effect: Effect): { life: Life; changes: string[] } {
  const next: Life = { ...life, stats: { ...life.stats }, links: { ...life.links }, flags: [...life.flags] };
  const changes: string[] = [];
  const record = (label: string, before: number, after: number) => { if (before !== after) changes.push(`${label} ${after > before ? '+' : ''}${after - before}`); };
  for (const stat of attributes) {
    next.stats[stat.id] = clamp(life.stats[stat.id] + (effect.stats?.[stat.id] ?? 0), 1, 20);
    record(stat.name, life.stats[stat.id], next.stats[stat.id]);
  }
  for (const [key, name] of [['health', '健康'], ['wealth', '生计'], ['peace', '心境']] as const) {
    next[key] = clamp(life[key] + (effect[key] ?? 0));
    record(name, life[key], next[key]);
  }
  for (const key of ['family', 'friend', 'mentor'] as Relation[]) {
    next.links[key] = clamp(life.links[key] + (effect.links?.[key] ?? 0));
    record(worldForLife(life).relations[key].name, life.links[key], next.links[key]);
  }
  next.flags = [...new Set([...next.flags, ...(effect.flags ?? [])])];
  if (effect.route) { next.route = effect.route; next.flags = [...new Set([...next.flags, 'chosen-route'])]; }
  if (effect.path) next.path = effect.path;
  if (effect.lifespan && life.journey) {
    next.journey = { ...life.journey, endAge: life.journey.endAge + effect.lifespan };
    changes.push(`寿元 +${effect.lifespan} 年`);
  }
  if (effect.path ? effect.path !== life.path : effect.route && effect.route !== life.route) changes.push(`走向：${directionFor(next)}`);
  return { life: next, changes };
}
export function choose(life: Life, choiceId: string): Life {
  if (life.phase !== 'event') return life;
  const scene = currentEvent(life);
  const choice = scene.choices.find(item => item.id === choiceId);
  if (!choice || !choiceAvailable(life, choice)) return life;
  const random = randomStream(life.seed);
  const draw = life.version === 2 ? random.next() : ((Math.imul(life.seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const seed = life.version === 2 ? random.seed : (Math.imul(life.seed, 1664525) + 1013904223) >>> 0;
  const result = choice.risk ? (draw < successChance(life, choice) ? choice.risk.success : choice.risk.failure) : choice.outcome;
  const { life: next, changes } = apply(life, result.effect ?? {});
  const hardship = next.wealth === 0 && (result.effect?.wealth ?? 0) < 0;
  const resultText = life.version === 2 && next.health <= 0
    ? `你选择了“${choice.label}”。但这一次，已经虚弱的身体没能承受接下来的损耗。身边的人尽力照料，仍没能让你走过这一关。\n\n人生停在了这一页，先前的相遇与选择并没有因此消失。`
    : prose(result.text, life) + (hardship ? '\n\n积蓄已经见底。接下来的日子，你需要缩减开支，也学着接受别人的帮助。' : '');
  return { ...next, seed, phase: 'result', journal: [...life.journal, {
    eventId: scene.id, age: scene.age, title: scene.title, story: prose(scene.text, life), choiceId,
    choice: choice.label, result: resultText, changes, ...(scene.kind ? { kind: scene.kind } : {}),
  }] };
}
export const isLastPage = (life: Life) => life.health <= 0 || !!currentEvent(life).final || (life.version === 1 && life.cursor === worldFor(life.world).chapters.length - 1);
export function advance(life: Life): Life {
  if (life.phase !== 'result') return life;
  return isLastPage(life) ? { ...life, phase: 'ended' } : life.version === 2 ? nextJourneyEvent(life) : { ...life, cursor: life.cursor + 1, phase: 'event' };
}
export function ageLabel(life: Life) { return `${life.journal.at(-1)?.age ?? 0} 岁`; }
export function chapterLabel(age: number, world: WorldId) {
  if (age === 0) return '初见人间';
  if (age < 7) return '最初的记忆';
  if (age < 18) return '年少时光';
  if (world === 'cultivation') return age < 50 ? '问道之初' : age < 100 ? '故人山河' : '漫长岁月';
  return age < 35 ? '初入世间' : age < 60 ? '人生半途' : '岁月回声';
}
export function endingFor(life: Life): Ending {
  if (life.version === 2) return journeyEnding(life);
  const paragraphs: string[] = [];
  let title: string;
  let subtitle: string;
  if (life.health === 0) {
    title = '未写完的手记'; subtitle = '生命停在了这一页，已经走过的路仍然算数。';
    paragraphs.push('身体没能再陪你走下去。许多事情还没有做完，但与你相遇的人，会记得那些具体的帮助、争执和相处。人生的长短，并不能替这些日子下结论。');
  } else if (life.world === 'modern') {
    if (life.route === 'home') { title = has(life, 'community') || has(life, 'lamp') ? '街巷长明' : '窗边有晴天'; subtitle = '把日子过稳，也把身边的人看清。'; }
    else if (life.route === 'study') { title = has(life, 'integrity') ? '纸页之外的回答' : has(life, 'research') ? '微光有迹' : '远方的一盏灯'; subtitle = '曾经向远方求一个答案，后来也留下自己的回答。'; }
    else { title = has(life, 'true-film') || has(life, 'documentary') ? '被看见的普通人' : '一路有风'; subtitle = '你试着为世界留下画面，也让世界改变了自己。'; }
    paragraphs.push(life.route === 'home' ? '你的名字没有出现在很多地方，却被一些具体的人记住。修好的东西、认真做过的事，以及肯花时间听完的一句话，慢慢组成一种可靠的生活。' : life.route === 'study' ? '你曾在陌生城市里寻找位置，也在知识和工作里投入许多年。有些成果被看见，有些没有。你明白，那些耐心解决问题的日子本身也是真的。' : '你的行李里装过器材、合同和很多次重新开始的打算。并非每个作品都有人看见，但你确实留下了一些本来会被匆匆略过的生活。');
    if (has(life, 'photo-home')) paragraphs.push('十岁那年拍下的父亲背影，最终又回到了你的手中。小时候你只想交一份作业，后来才发现，自己已经替未来保存了一次相见。');
    if (has(life, 'shop-closed')) paragraphs.push('修理铺后来关了。你陪家人走出的那次旅行，并没有否定几十年的辛劳，只是替他们打开了另一扇门。');
    if (has(life, 'teach')) paragraphs.push('那个向你问路的年轻人，走了一条和你不一样的路。你仍愿意听他的近况。你留下的经验，终于没有变成另一个人的枷锁。');
  } else if (life.world === 'ancient') {
    if (has(life, 'library') || has(life, 'teacher')) { title = '一灯传一灯'; subtitle = '书页不会自己走路，是你把它交到了更多人手中。'; }
    else if (life.route === 'home') { title = has(life, 'clinic') || has(life, 'healer') ? '药香留人间' : '故园有归人'; subtitle = '有限的一双手，也曾替别人撑过一段日子。'; }
    else if (life.route === 'study') { title = has(life, 'just-office') ? '无名碑上的名字' : '书卷伴平生'; subtitle = '功名有高低，认真做过的事情有自己的分量。'; }
    else { title = has(life, 'own-boat') ? '一船灯火' : '山河行客'; subtitle = '你走过远路，也学会在该靠岸的时候停下来。'; }
    paragraphs.push(life.route === 'home' ? '你把许多时间留在了乡里。人们记得的不是一个响亮称号，而是夜里有人敲门时，里面真的会传来脚步声。' : life.route === 'study' ? '你见过文章之外的人间，也知道许多事情不会因为道理写得漂亮就自行变好。你做成的事有限，它们却确实改变过一些人的日子。' : '沿河的城镇留下了你的足迹。你遇到过损失与争执，也得到过同行的照料。到后来，一段好好结束的同行，比占尽每次便宜更让你安心。');
    if (has(life, 'apothecary')) paragraphs.push('七岁那场雨里，你追还了一只钱袋。那时不知道失主是谁，也不知道一件小事会在往后打开怎样的门。');
    if (has(life, 'flood-help') || has(life, 'flood-supplies')) paragraphs.push('临河那场大水，后来只剩碑上的几行字。你记得的却是湿透的鞋、传递过的粮袋，以及一户户重新亮起的灯。');
  } else {
    title = has(life, 'ascended') ? '天门之外，仍是初见' : has(life, 'guardian') ? '此地即吾乡' : !has(life, 'foundation') ? '山下的一生' : has(life, 'students') || has(life, 'true-book') ? '道在后来人' : '长路有归处';
    subtitle = has(life, 'ascended') ? '这一卷人间已经写完，新的天地尚待认识。' : '修行给了你另一种时间，如何生活仍由自己决定。';
    paragraphs.push(has(life, 'ascended') ? '你跨过天门，并没有带走所有答案。身后的人间也不会停下等你。你带着那些具体的相遇，重新成为一个需要学习的人。' : has(life, 'guardian') ? '当新的天地打开，你选择留在此地。这不是没能离开，而是在看清代价之后，仍愿意照看自己身处的人间。' : !has(life, 'foundation') ? '你没有筑基。灵气曾经过你的经脉，饭菜的香气也曾经过你的窗。有限的岁月里，你认识过人、做成过事，也经历过属于自己的远行。' : '你比许多人活得更久，却仍要学习告别。到后来，你不再把所有相遇当成修行之外的耽搁，它们就是这条路的一部分。');
    if (has(life, 'sea')) paragraphs.push('小禾在海边站了一下午。那天没有突破，没有秘宝，却成为你此后很长时间都能清楚想起的一天。');
    else if (has(life, 'missed-sea')) paragraphs.push('你没能陪小禾看海。他仍然去了，拥有了一个不依赖你的愿望。这件事让你明白，故人从来不只活在你的故事里。');
    if (has(life, 'saved-traveler')) paragraphs.push('秘境里那位被救的修士，后来也救过别人。你没收到每一次回报，善意却已经走得比自己更远。');
  }
  paragraphs.push(life.links.friend >= 65 ? '那段从年少开始的友情，经过分别与变化，仍留下可以说真话的空间。你们并不总在一起，却曾认真地看见彼此。' : life.links.friend < 30 ? '有些朋友后来失去了联系。这不是谁的一生因此作废，只是你偶尔仍会想起，曾经并肩走过的那一段路。' : '你与故人的关系有亲近，也有沉默。并非每一段距离都得到弥补，但已经发生的相遇仍然真实。');
  paragraphs.push(life.peace >= 70 ? '回看这一生，你并不觉得每一步都正确。但有一些选择，即使重来，你依然愿意这样做。' : life.peace >= 40 ? '你仍有遗憾，也有舍不得改写的日子。它们放在一起，才是完整的你。' : '许多未能说出口的话留了下来。你的一生并不因此只有遗憾，那些真心付出过的时刻，也同样属于你。');
  const keepsake = life.world === 'modern' ? has(life, 'photo-home') ? '一张父亲的背影' : has(life, 'radio') ? '一张旧收音机电路图' : '一盒没有日期的照片'
    : life.world === 'ancient' ? has(life, 'book') || has(life, 'library') ? '一本有两代批注的旧书' : has(life, 'own-boat') ? '一枚磨亮的船钥匙' : '一盏渡口的旧灯'
      : has(life, 'sea') || has(life, 'shell') ? '一枚海边的贝壳' : has(life, 'herbs') ? '一张有草木香的辨药图' : '一封从故乡寄来的信';
  return { title, subtitle, paragraphs, keepsake };
}
