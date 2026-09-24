import { choice, has, outcome, type Ending, type Life, type StoryEvent, type WorldId } from './model';
import { randomStream, weightedPick } from './random';
import { everydayEvents } from './stories/everyday';
import { incidentEvents } from './stories/incidents';
import { journeyRelations, originFor, origins } from './stories/origins';
import { pathEvents, pathFor, paths, type LifePath } from './stories/paths';
import { sideArcs, sideEvents } from './stories/sideStories';
import { seen, type EventCandidate } from './stories/journeyTypes';

export const MAX_LIFE_EVENTS = 96;
const bounds = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const worlds: WorldId[] = ['modern', 'ancient', 'cultivation'];
const breakthrough: EventCandidate[] = [
  {
    minAge: 28, maxAge: 64, affinity: 'mind', weight: 5,
    eligible: life => !has(life, 'foundation') && !has(life, 'mortal-choice'),
    scene: { id: 'cultivation-foundation', age: 0, kind: 'main', title: '经脉前的那一道门', text: '修习渐渐遇到瓶颈。你可以尝试筑基，也可以把时间用来过好有限的日子。突破不是一个注定成功的仪式，失败需要花时间恢复。', choices: [
      { id: 'break', label: '准备妥当后尝试筑基', hint: '成功延长寿元，失败损伤健康；悟性越高越有把握', outcome: outcome(''), risk: { stat: 'mind', difficulty: 9,
        success: outcome('灵气终于稳定下来。你获得了更长的时间，也得重新学习怎样面对仍会老去的故人。', { health: 8, stats: { mind: 1 }, lifespan: 100, flags: ['foundation'] }),
        failure: outcome('经脉没能承受这次冲击。你停下来调养，并记下失误。若以后准备得更充分，还可能有一次重来的机会。', { health: -15, wealth: -8, flags: ['foundation-failed'] }),
      } },
      choice('human', '把有限的岁月留给人间', '不再追求延长寿元，也能继续当前道路', '你把突破材料交还药堂，回到熟悉的生活。决定接受有限的时间之后，眼前的日子反而清楚了一些。', { peace: 12, health: 7, flags: ['mortal-choice'] }),
    ] },
  },
  {
    minAge: 42, maxAge: 68, affinity: 'spirit', weight: 5,
    eligible: life => has(life, 'foundation-failed') && !has(life, 'foundation') && !has(life, 'mortal-choice'),
    scene: { id: 'cultivation-retry', age: 0, kind: 'main', title: '第二次准备', text: '前一次失败之后，你又积累了许多年。现在的身体、心性和生活已经不同，可以再试，也可以停止把所有时间押在这一道门上。', choices: [
      { id: 'retry', label: '按如今的准备再试一次', hint: '依靠当前心性，成功可延寿', outcome: outcome(''), risk: { stat: 'spirit', difficulty: 9,
        success: outcome('这一次你没有急着催动灵力，终于稳稳跨过了门槛。失去的年月没有回来，却成为这次判断的一部分。', { health: 6, lifespan: 100, flags: ['foundation'] }),
        failure: outcome('尝试仍没能成功。你养好伤，把往后的人生从这件唯一的大事里解放出来。', { health: -12, wealth: -5, flags: ['mortal-choice'] }),
      } },
      choice('accept', '不再尝试，继续自己的生活', '接受寿元的边界', '你把功课缩到适合身体的程度，重新留出时间给眼前的人与事。', { peace: 12, health: 6, flags: ['mortal-choice'] }),
    ] },
  },
  {
    minAge: 105, affinity: 'spirit', weight: 6,
    eligible: life => has(life, 'foundation'),
    scene: { id: 'cultivation-core', age: 0, kind: 'main', title: '更长的岁月要装下什么', text: '你已经活过许多普通人的一生。凝结金丹的机会来到面前，身旁的人却未必还能继续同行。你得决定是否再向前走。', choices: [
      { id: 'core', label: '准备结丹，承担下一段路', hint: '心性影响成功率，成功延寿一百六十年', outcome: outcome(''), risk: { stat: 'spirit', difficulty: 15,
        success: outcome('金丹渐成，你没有忘记先前的来处。时间多了，却仍需要决定把它交给什么。', { health: 8, lifespan: 160, flags: ['golden-core'] }),
        failure: outcome('你及时收住灵力，仍损伤了元气。比起再赌一次，你开始更认真地安排已经拥有的岁月。', { health: -18, wealth: -12 }),
      } },
      choice('stay', '停在这里，照看已有的人生', '继续当前修为，不再延寿', '你放下这次突破，没有放下自己的道路。余下的时间仍有许多值得完成的事。', { peace: 14, health: 8 }),
    ] },
  },
];

export const eventPools: Record<WorldId, EventCandidate[]> = Object.fromEntries(worlds.map(world => [world, [
  ...everydayEvents(world), ...pathEvents(world), ...sideEvents(world), ...incidentEvents(world), ...(world === 'cultivation' ? breakthrough : []),
]])) as Record<WorldId, EventCandidate[]>;
const eventIndex = new Map(Object.values(eventPools).flat().map(candidate => [candidate.scene.id, candidate.scene]));

export function startJourney(base: Life): Life {
  const random = randomStream(base.birthSeed);
  const origin = weightedPick(origins[base.world], item => 1 + Math.max(0, 3 - Math.abs(base.initial.family - item.means) * 0.5), () => random.next());
  const health = bounds(base.health + origin.health + Math.floor(random.next() * 9) - 4, 25, 100);
  const wealth = bounds(base.wealth + origin.wealth + Math.floor(random.next() * 13) - 6, 3, 100);
  const peace = bounds(base.peace + origin.peace + Math.floor(random.next() * 9) - 4, 15, 100);
  const endAge = 72 + Math.floor(random.next() * 21) + Math.floor(base.stats.body / 4);
  return { ...base, version: 2, origin: origins[base.world].indexOf(origin), health, wealth, peace,
    links: { family: bounds(48 + Math.floor(random.next() * 17) + base.stats.charm), friend: 18 + Math.floor(random.next() * 12), mentor: 8 + Math.floor(random.next() * 8) },
    seed: random.seed, journey: { eventId: `${base.world}-birth-${origin.id}`, age: 0, endAge },
  };
}

export function candidateWeight(life: Life, candidate: EventCandidate): number {
  const affinity = candidate.affinity;
  if (candidate.scene.kind === 'incident') {
    // Accidents remain mostly chance: ability and fortune only nudge occurrence.
    const value = affinity ? life.stats[affinity] : 5;
    const skill = bounds((value - 5) * 0.01, -0.1, 0.1) * (candidate.fortune ?? 1);
    const fortune = bounds((life.stats.luck - 5) * 0.012, -0.05, 0.12) * (candidate.fortune ?? 0);
    return (candidate.weight ?? 1) * bounds(1 + skill + fortune, 0.8, 1.25);
  }
  const fit = affinity ? 0.45 + Math.min(life.stats[affinity], 16) * 0.2 : 1;
  const interest = affinity && has(life, `interest:${affinity}`) ? 1.3 : 1;
  const birthplace = affinity === originFor(life).affinity ? 1.15 : 1;
  const relationships = candidate.scene.kind === 'side' ? 0.8 + life.links.friend / 100 : 1;
  const need = candidate.scene.kind === 'life' && ((affinity === 'body' && life.health < 40) || (affinity === 'spirit' && (life.peace < 40 || life.wealth < 25))) ? 2 : 1;
  return (candidate.weight ?? 1) * fit * interest * birthplace * relationships * need;
}
export function availableEvents(life: Life, age: number): EventCandidate[] {
  const atAge = { ...life, journey: { ...life.journey!, age } };
  return eventPools[life.world].filter(item => age >= item.minAge && age <= (item.maxAge ?? Infinity) && !seen(life, item.scene.id) && (!item.eligible || item.eligible(atAge)));
}
function offerPaths(life: Life, random: () => number): string[] {
  const remaining = paths.filter(item => item.world === life.world && item.id !== life.path);
  const offers: string[] = [];
  while (offers.length < 3 && remaining.length) {
    const selected = weightedPick(remaining, item => 0.5 + life.stats[item.stat] * 0.35 + (has(life, `interest:${item.stat}`) ? 1.5 : 0) + (originFor(life).affinity === item.stat ? 0.8 : 0), random);
    offers.push(selected.id);
    remaining.splice(remaining.indexOf(selected), 1);
  }
  return offers;
}

export function nextJourneyEvent(life: Life): Life {
  const random = randomStream(life.seed);
  const previousAge = life.journey!.age;
  const gap = previousAge === 0 ? 3 + Math.floor(random.next() * 2) : previousAge < 16 ? 2 + Math.floor(random.next() * 2) : previousAge < 60 ? 2 + Math.floor(random.next() * 3) : previousAge < 100 ? 3 + Math.floor(random.next() * 4) : 7 + Math.floor(random.next() * 12);
  const age = Math.min(previousAge + gap, life.journey!.endAge);
  let eventId: string;
  let offers: string[] | undefined;
  if (age >= life.journey!.endAge || life.cursor >= MAX_LIFE_EVENTS - 2) eventId = `${life.world}-farewell`;
  else if (age >= 16 && !has(life, 'chosen-route')) {
    eventId = `${life.world}-crossroads`;
    offers = offerPaths(life, () => random.next());
  } else if (age >= 30 && age <= 55 && !seen(life, `${life.world}-change`) && random.next() < 0.16) {
    eventId = `${life.world}-change`;
    offers = offerPaths(life, () => random.next());
  } else {
    const eligible = availableEvents(life, age);
    // Choose a category first so large pools cannot drown out ongoing story arcs.
    const kinds = (['main', 'side', 'incident', 'life'] as const).filter(kind => eligible.some(item => item.scene.kind === kind));
    if (!kinds.length) eventId = `${life.world}-quiet-${life.cursor + 1}`;
    else {
      const category = weightedPick(kinds, kind => ({ main: 4, side: 3.5, incident: 2.5, life: 3 })[kind], () => random.next());
      eventId = weightedPick(eligible.filter(item => item.scene.kind === category), item => candidateWeight(life, item), () => random.next()).scene.id;
    }
  }
  return { ...life, seed: random.seed, cursor: life.cursor + 1, phase: 'event', journey: { ...life.journey!, eventId, age, offers } };
}

function pathChoice(item: LifePath, changing: boolean) {
  return choice(item.id, `${changing ? '转向' : '尝试'}${item.name}`, item.invitation,
    `你为${item.name}重新安排了时间与开支。${item.invitation}这条路没有替你许诺结局，你要在具体的事情里，慢慢知道自己愿意怎样生活。`,
    { path: item.id, route: item.route, wealth: -3, stats: { [item.stat]: 1 }, flags: [changing ? 'changed-path' : 'first-path'] });
}
export function journeyEvent(life: Life): StoryEvent {
  const { eventId, age, offers } = life.journey!;
  const origin = originFor(life);
  if (age === 0) return {
    id: eventId, age, kind: 'life', title: `生于${origin.place}`,
    text: `${origin.text}\n\n${life.initial.family >= 7 ? '家里能为你留下一些储备与照应，但没有人能替你保证往后的一切。' : life.initial.family >= 4 ? '日子大体能维持，遇到意外仍要认真算账。照料你的人也有疲惫与盼望。' : '家里可动用的资源很少，大人们轮流照料你，也要为下一段日子奔忙。'}\n\n他们叫你“${life.name}”。${life.health < 65 ? '你比旁的孩子更需要照料，最初几年要慢慢养好身体。' : '你在细心的照料里安稳下来，开始一点点认识声音与光。'}`,
    choices: [choice('arrive', '在这个世界慢慢睁开眼', '从此处开始，往后的经历由际遇与选择共同展开', `你握住伸来的手指。${origin.household}成为你的来处，但并不会替你写定去处。`)],
  };
  if (eventId.endsWith('-crossroads') || eventId.endsWith('-change')) {
    const changing = eventId.endsWith('-change');
    return { id: eventId, age, kind: 'main', title: changing ? '生活也可以转弯' : '几扇不同的门',
      text: changing ? '一段日子走下来，你对自己的长处和代价都有了新的认识。最近出现几种去处，可以转向，也可以继续已经投入的生活。过去的相遇不会被抹去。' : '最近几次相遇带来了不同的机会。有人注意到你的本领，也有人记得你曾经的兴趣。并不是所有道路都会同时出现在眼前，你可以选一条试走，也可以先过好日常。',
      choices: [...(offers ?? []).map(id => pathChoice(paths.find(item => item.id === id)!, changing)),
        choice('stay', changing ? '继续现在的道路' : '先把身边的日子过稳', changing ? '保留已有积累' : '不急着定向，仍会遇见新的故事与转机', changing ? '你认真看过其他可能，决定继续把手里的事情做好。留下也是看清之后的一种选择。' : '你先找一份能维持生活的事情做，留时间给家人、朋友和自己。平常日子里，仍会生出新的故事。', changing ? { peace: 5 } : { route: 'home', peace: 5, wealth: 4 }),
      ],
    };
  }
  if (eventId.endsWith('-farewell')) return {
    id: eventId, age, kind: 'main', final: true, title: '把这一生慢慢放下',
    text: `${life.world === 'cultivation' && has(life, 'foundation') ? '漫长的岁月也走到了边界。' : '身体逐渐慢下来，你知道能支配的日子已经不多。'}${life.path ? `走过${pathFor(life)!.name}的年月之后，` : ''}你想起${origin.place}，也想起那些后来才出现的人。还有一些事情没有完成，它们并不会抹去已经发生的一切。`,
    choices: [
      choice('people', '把想说的话留给在意的人', '认真道别', '你把感谢、歉意和不必再承担的嘱托慢慢说完。听见的人会继续生活，你也终于允许自己停下。', { peace: 8, links: { family: 6, friend: 6 } }),
      choice('pages', '整理手记，让后来人自己读', '留下经过与未解的问题', '你没有把这一生写成总是正确的故事。做成的、错过的和仍不明白的，都有了自己的位置。', { peace: 7 }),
      choice('window', '在一个普通的日子安静告别', '不必留下一个响亮结论', '窗外仍有人赶路，屋里有人替你把水放在手边。没有宏大的最后一句，这一生也完整地发生过。', { peace: 9 }),
    ],
  };
  if (eventId.startsWith(`${life.world}-quiet-`) && age < 16) return {
    id: eventId, age, kind: 'life', title: '慢慢长大的日子',
    text: '没有大事发生的日子里，你仍在一点点长大。熟悉的小路走得更稳，能说清的问题也多了起来。大人忙着生活，你开始学会安排一小段属于自己的时间。',
    choices: [
      choice('play', '和伙伴一起到外面玩', '锻炼身体，学习相处', '你们在熟悉的地方玩到傍晚，偶尔争吵，也慢慢学会商量规则。', { stats: { body: 1 }, links: { friend: 5 }, health: 3 }),
      choice('ask', '把最近的疑问讲给大人听', '好奇与学习', '有些问题立刻得到回答，有些还要一起寻找。你知道了遇到不懂的事可以开口问。', { stats: { mind: 1 }, links: { family: 5 }, peace: 4 }),
    ],
  };
  if (eventId.startsWith(`${life.world}-quiet-`)) return {
    id: eventId, age, kind: 'life', title: life.world === 'cultivation' && age > 100 ? '山中又换了几度春秋' : '生活仍有细小的变化',
    text: `${life.health < 40 ? '身体提醒你放慢脚步，很多事要重新安排。' : life.wealth < 25 ? '生活的余裕不多，你开始认真安排每一项开支。' : '没有大事发生的日子也在向前，你有机会照料那些一直被推迟的小事。'}${life.links.friend >= 50 ? `${journeyRelations(life).friend.name}的消息还会辗转到来，一段联系慢慢有了新的模样。` : '有些旧联系淡了，也有新的人来到身边。'}你想把这段时间用在哪里？`,
    choices: [
      choice('rest', '照顾身体和日常', '恢复健康，整理生活', '你减少不必要的奔忙，让饭食、睡眠和小事重新有了安稳的次序。', { health: 8, wealth: 3, peace: 4 }),
      choice('learn', '学一点一直想学的东西', '慢慢积累，不急着求成果', '你给自己留下一段固定的时间，所学未必会带来名声，却改变了理解生活的方式。', { stats: { mind: 1 }, peace: 6 }),
      choice('visit', '与仍愿相见的人联系', '照料关系', '你们说起近况，也承认彼此已经不同。愿意继续了解，比要求对方留在从前更费心。', { links: { friend: 7, family: 4 }, peace: 6 }),
    ],
  };
  const scene = eventIndex.get(eventId);
  if (!scene) throw new Error('Unknown journey event');
  return { ...scene, age };
}

export function journeyEnding(life: Life): Ending {
  const path = pathFor(life);
  const origin = originFor(life);
  const completed = sideArcs.filter(arc => arc.world === life.world && has(life, `${arc.id}:done`));
  const unfinished = sideArcs.filter(arc => arc.world === life.world && has(life, `${arc.id}:started`) && !has(life, `${arc.id}:done`) && !has(life, `${arc.id}:closed`));
  const wins = path ? path.stages.filter((_, index) => has(life, `${path.id}-${index}:won`)).length : 0;
  const title = life.health <= 0 ? '未写完的手记' : path ? wins >= 2 ? path.ending : `${path.name}间的一生` : life.peace >= 65 ? '平常日子，自有回声' : '有晴有雨的一生';
  const subtitle = life.health <= 0 ? '意外让故事提前停下，走过的日子仍然真实。' : has(life, 'golden-core') ? '走过漫长岁月，也仍记得来处。' : '没有统一的成败，只有你亲自走过的这一路。';
  const paragraphs = [`你出生在${origin.place}，由${origin.household}照料长大。那时的资源与境遇影响了最初的路，却没有写定之后的每一次相遇。`,
    path ? `你后来走向${path.name}。${wins >= 2 ? '一些艰难的尝试真的做成了，也有人因此记住你的工作。' : '有过进展，也有停步。你没有赢下每一次尝试，仍把许多年月放进了具体的事情里。'}${has(life, 'changed-path') ? '你曾中途改道，旧路上的付出没有被取消，而是一起成为后来判断的依据。' : ''}` : '你没有把这一生押在一个鲜明的方向上。工作、相处、修补日常与偶尔的尝试，一点点组成了自己的生活。'];
  for (const arc of completed) paragraphs.push(has(life, `${arc.id}:good`) ? arc.close[2] : arc.close[3]);
  if (unfinished.length) paragraphs.push(`还有${unfinished.map(arc => `“${arc.start[0]}”`).join('、')}没能等到全部回音。你确实开始过，也确实留下了一些仍由别人继续的事。`);
  const incidents = life.journal.filter(entry => entry.kind === 'incident');
  if (incidents.length) paragraphs.push(`那些计划外的日子也改变过生活：${incidents.slice(0, 3).map(entry => `“${entry.title}”`).join('、')}。它们并不全是选择的奖惩，你的回应却成为了往后的起点。`);
  if (life.world === 'cultivation') paragraphs.push(has(life, 'foundation') ? '修为给了你额外的年月，没有替你免去代价与告别。最后留下的仍是怎样使用这些时间。' : '你没有获得漫长寿元。有限的年月里，修习、日常和故人的消息，仍组成完整的一生。');
  paragraphs.push(life.links.friend >= 65 ? '有些联系跨过距离和变化，仍容得下真实的近况。你被记得，不只因为做成过什么。' : '一些联系淡了，一些话没能及时说出。它们与曾经的亲近一起，留在这份手记里。');
  paragraphs.push(life.peace >= 65 ? '回望时，你仍有遗憾，却也认得那些愿意再次做出的选择。' : '回望时，还有难以放下的事。那些认真生活、接受帮助和重新起步的日子，同样属于你。');
  return { title, subtitle, paragraphs, keepsake: completed.at(-1)?.keepsake ?? path?.keepsake ?? `一张记着${origin.place}的旧纸` };
}
