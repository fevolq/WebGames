import type { Attribute, Life, Relation, WorldId } from '../model';
import { randomStream } from '../random';

export interface Origin {
  id: string; place: string; household: string; text: string; affinity: Attribute;
  means: number; health: number; wealth: number; peace: number;
}
export const origins: Record<WorldId, Origin[]> = {
  modern: [
    { id: 'factory', place: '北方工业城 · 职工宿舍', household: '轮班工人的家', text: '你出生那晚，交班的汽笛刚响。家人借来电暖器，邻居轮流送饭。窗外是工厂，窗内有人轻轻试着叫你的名字。', affinity: 'body', means: 4, health: 3, wealth: -4, peace: 5 },
    { id: 'school', place: '西南山村 · 小学校舍', household: '乡村教师的家', text: '你的摇篮放在一摞作业本旁。雨天的山路走不通，村医踩着泥赶来。家人给你留的第一件东西，是一本空白的画册。', affinity: 'mind', means: 3, health: -2, wealth: -6, peace: 8 },
    { id: 'harbor', place: '东南海岛 · 渔港', household: '靠海吃饭的家', text: '潮水涨到石阶下时，你降生了。渔船提前靠岸，甲板上还晾着网。你最先熟悉的声音，是风、浪和大人相互报平安的喊声。', affinity: 'body', means: 3, health: 6, wealth: -5, peace: 2 },
    { id: 'market', place: '中部县城 · 老街', household: '经营小店的家', text: '店门口挂起暂停营业的纸牌。家人腾出账本旁的位置，放上你的奶瓶。有人带着没结清的账来道贺，也有人带来了新做的小被子。', affinity: 'charm', means: 5, health: 0, wealth: 6, peace: 3 },
    { id: 'city', place: '滨海大城 · 研究院社区', household: '技术人员的家', text: '医院的走廊彻夜明亮。家人给你拍了第一张照片，又把工作消息设成静音。你将住进一间不大的书房，那里正好能看到一棵树。', affinity: 'mind', means: 8, health: 4, wealth: 8, peace: -3 },
    { id: 'road', place: '西部边城 · 客运站旁', household: '常年奔波的家', text: '家人在途中等到了你的出生。车票改签了几次，亲戚从不同城市赶来。装着婴儿衣服的旅行袋，后来成了你最熟悉的家当。', affinity: 'spirit', means: 2, health: -3, wealth: -8, peace: 1 },
  ],
  ancient: [
    { id: 'farm', place: '青禾乡 · 田庄', household: '耕读农家', text: '新麦刚收进屋，你的哭声就响了。家人把最干燥的角落让给摇篮。雨水、收成与灶火，是这个家每日谈论的事。', affinity: 'body', means: 2, health: 5, wealth: -8, peace: 6 },
    { id: 'books', place: '江南府城 · 书巷', household: '抄书人的家', text: '你出生时，案上的墨还没干。家人把未交的书稿移开，在灯下替你缝衣。你还不会说话，已经听过许多翻书的声音。', affinity: 'mind', means: 5, health: 0, wealth: 1, peace: 7 },
    { id: 'border', place: '北境关城 · 军户里', household: '守边军户', text: '关城落了第一场雪。轮休的家人抱你时卸下护腕，生怕冰到你的脸。远处有人练号，你的被子上补着一块柔软的旧布。', affinity: 'body', means: 3, health: 7, wealth: -3, peace: -4 },
    { id: 'river', place: '临河渡口 · 船家', household: '往来水路的家', text: '你的第一张床安在船舱里。船靠岸以后，家人才敢放下悬着的心。码头的客人口音不同，都想看一眼这个新来的孩子。', affinity: 'charm', means: 4, health: 1, wealth: 3, peace: 2 },
    { id: 'guild', place: '西市 · 匠人坊', household: '世代做工的家', text: '炉火熄下去，屋里仍很暖。老师傅洗净手才敢抱你，邻家送来一只没有上漆的小木马。你将在许多工具声里长大。', affinity: 'spirit', means: 5, health: 3, wealth: 4, peace: 4 },
    { id: 'estate', place: '京郊 · 大族别院', household: '有藏书田产的家', text: '院子里忙了整夜，长辈为名字争论不休。照料你的人给你松开包得太紧的小被子。门第带来照应，也带来许多尚不懂的规矩。', affinity: 'mind', means: 9, health: 4, wealth: 10, peace: -6 },
  ],
  cultivation: [
    { id: 'herb', place: '青岚山麓 · 药村', household: '采药人家', text: '你出生在草木香里。家人刚从山上回来，竹篓里还有露水。没有仙人来报喜，只有隔壁医者留下的一碗温汤。', affinity: 'spirit', means: 2, health: 7, wealth: -6, peace: 6 },
    { id: 'clan', place: '栖霞谷 · 修行世家', household: '小修行家族', text: '你的名字被添进族谱。长辈送来一枚温养的小玉片，又争起将来该拜谁为师。此刻的你，只想抓住衣襟安稳地睡一觉。', affinity: 'mind', means: 8, health: 4, wealth: 9, peace: -4 },
    { id: 'ferry', place: '云海浮港 · 灵舟泊地', household: '随船往来的家', text: '灵舟停泊时，你来到了世上。船工把舱壁的裂缝补好，让风吹不进来。你以后记得的故乡，可能是一座港，也可能是一条船。', affinity: 'charm', means: 5, health: 1, wealth: 3, peace: 3 },
    { id: 'forge', place: '赤石镇 · 炉坊', household: '炼器匠户', text: '铸炉边挂上了报喜的红绳。家人把炉灰洗了两遍，才接过你。有人说火光映在你眼里，像一枚还没锻成的星。', affinity: 'body', means: 4, health: 5, wealth: 2, peace: 1 },
    { id: 'shelter', place: '荒原边缘 · 清风道院', household: '收留旅人的道院', text: '风雪里，你被送到道院。值夜人记下送来者留下的半个地址，替你烤暖被褥。院里的几位照料者，成为你最早的家人。', affinity: 'spirit', means: 1, health: -4, wealth: -9, peace: 8 },
    { id: 'spring', place: '镜湖岛 · 散修聚落', household: '守着灵泉的家', text: '灵泉在你出生那天涨了水。家人先忙着挡水，后来才想起摆一桌酒。来客有人背剑，有人提菜，修行与日常挤在同一个院子里。', affinity: 'luck', means: 6, health: 2, wealth: 5, peace: 4 },
  ],
};
export const originFor = (life: Life) => origins[life.world][life.origin];
const names = {
  modern: { friend: ['许舟', '小满', '陈鹿', '方圆', '林夏', '周岩'], mentor: ['林老师', '周师傅', '程先生', '顾老师', '梁师傅', '贺老师'] },
  ancient: { friend: ['阿芦', '青棠', '小砚', '石生', '阿禾', '云生'], mentor: ['沈先生', '周师傅', '顾先生', '陆师傅', '文先生', '许师傅'] },
  cultivation: { friend: ['小禾', '云生', '阿芷', '青石', '望舒', '松明'], mentor: ['闻溪', '陆止', '白芷', '清和', '松月', '云岫'] },
};
export function journeyRelations(life: Life): Record<Relation, { name: string; role: string }> {
  const random = randomStream(life.birthSeed ^ 0x13ab921f);
  const friend = names[life.world].friend[Math.floor(random.next() * 6)];
  const mentor = names[life.world].mentor[Math.floor(random.next() * 6)];
  const laterGeneration = (life.journey?.age ?? 0) > 95;
  return {
    family: { name: '家人', role: laterGeneration ? '家族后辈与旧日牵挂' : originFor(life).household },
    friend: { name: laterGeneration ? `${friend}的后人` : friend, role: laterGeneration ? '延续下来的故交' : '年少相识的伙伴' },
    mentor: { name: laterGeneration ? `${mentor}一脉` : mentor, role: laterGeneration ? '师承与后人' : '曾经指点你的人' },
  };
}
