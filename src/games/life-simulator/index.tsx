import { useEffect, useRef, useState } from 'react';
import { IconArrowLeft, IconArrowRight, IconBook, IconCheck, IconDownload, IconMinus, IconPlus, IconRefresh, IconSwap, IconClose } from '@arco-design/web-react/icon';
import { attributes, prose, type Life, type Relation, type Stats, type WorldId } from './model';
import { advance, allocate, BASE_STATS, BUDGET, chapterLabel, choiceAvailable, choose, createLife, currentEvent, directionFor, endingFor, isLastPage, randomStats, spent, successChance, worldFor, worldForLife, worlds } from './engine';
import { exportText, load, persist, updateLife, type GameSave } from './storage';
import { WorldScene } from './WorldScene';
import styles from './Game.module.css';

function Paragraphs({ text }: { text: string }) { return <>{text.split('\n\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)}</>; }
function Meter({ label, value }: { label: string; value: number }) {
  return <div className={styles.meter}><div><span>{label}</span><span>{value}<small> / 100</small></span></div><meter min={0} max={100} value={value} aria-label={label} /></div>;
}
function LifeJournal({ life }: { life: Life }) {
  return <div className={styles.fullJournal}>{life.journal.map(entry => <details key={entry.eventId}>
    <summary><span>{entry.age} 岁</span><strong>{entry.title}</strong><IconPlus /></summary>
    <div><Paragraphs text={entry.story} /><p className={styles.journalChoice}>你的选择 · {entry.choice}</p><Paragraphs text={entry.result} /></div>
  </details>)}</div>;
}
function downloadLife(life: Life) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', exportText(life)], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = `人生模拟器-${life.name.replace(/[\\/:*?"<>|]/g, '')}-生平.txt`;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function ExportDialog({ life, onClose }: { life: Life; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.showModal();
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  async function copy() {
    try { await navigator.clipboard.writeText(exportText(life)); setMessage('生平文字已复制。'); }
    catch { textRef.current?.focus(); textRef.current?.select(); setMessage('文字已选中，请按 Ctrl+C 复制。'); }
  }
  return <dialog ref={ref} className={`${styles.dialog} ${styles.exportDialog}`} onCancel={onClose} aria-labelledby="export-title">
    <h2 id="export-title">把这一生留在纸上</h2><p>可复制完整文字，也可下载为文本文件。</p><textarea ref={textRef} readOnly aria-label="生平全文" value={exportText(life)} />
    <p role="status">{message || '包含已经发生的故事、你的选择与后续结果。'}</p><div><button autoFocus className={styles.secondary} onClick={onClose}>关闭</button><button className={styles.secondary} onClick={copy}>复制全文</button><button className={styles.primary} onClick={() => { try { downloadLife(life); setMessage('已发起下载。如没有保存提示，可以复制全文。'); } catch { setMessage('暂时无法下载，请复制全文保存。'); } }}><IconDownload />下载文本</button></div>
  </dialog>;
}

export default function LifeSimulator() {
  const [loaded] = useState(load);
  const [save, setSave] = useState<GameSave>(loaded.save);
  const [saved, setSaved] = useState(true);
  const [notice, setNotice] = useState(loaded.warning);
  const [exported, setExported] = useState<Life | null>(null);
  const [showShelf, setShowShelf] = useState(false);
  const [viewed, setViewed] = useState<Life | null>(null);
  const [showJournal, setShowJournal] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const oldFocus = useRef<HTMLElement | null>(null);
  const life = viewed ?? save.active;
  const world = life ? worldForLife(life) : worldFor(save.draft.world);
  const scene = life ? currentEvent(life) : null;
  const entry = life?.journal.at(-1);
  const age = life ? (life.phase === 'event' ? scene!.age : entry?.age ?? 0) : 0;
  const isEnding = life?.phase === 'ended';

  useEffect(() => { setSaved(persist(save)); }, [save]);
  useEffect(() => {
    if (life) {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView?.({ block: 'nearest', behavior: 'instant' });
    }
  }, [life?.id, life?.cursor, life?.phase, showShelf, showJournal]);
  useEffect(() => {
    if (confirm) {
      oldFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.current?.showModal();
    } else if (dialog.current?.open) {
      dialog.current.close();
      oldFocus.current?.focus({ preventScroll: true });
    }
  }, [confirm]);

  function changeDraft(changes: Partial<GameSave['draft']>) { setSave(previous => ({ ...previous, draft: { ...previous.draft, ...changes } })); }
  function setStats(stats: Stats) { changeDraft({ stats }); }
  function startLife(worldId: WorldId) {
    const seed = new Uint32Array(1);
    crypto.getRandomValues(seed);
    setSave(previous => {
      if (previous.active) return previous;
      const next = { ...previous, draft: { ...previous.draft, world: worldId } };
      return updateLife(next, createLife(worldId, next.draft.name, next.draft.stats, seed[0]));
    });
    setViewed(null); setShowShelf(false); setShowJournal(false);
    setNotice('');
  }
  function act(action: (life: Life) => Life) {
    setSave(previous => previous.active ? updateLife(previous, action(previous.active)) : previous);
  }
  function newLife() {
    setSave(previous => ({ ...previous, active: null }));
    setConfirm(false); setViewed(null); setShowShelf(false); setShowJournal(false);
  }
  function backFromShelf() { setViewed(null); setShowShelf(false); setShowJournal(false); }

  return <main id="main-content" className={styles.game} data-world={world.id}>
    <div className={styles.shell}>
      <div className={styles.masthead}>
        <div className={styles.wordmark}><span className={styles.mark}>人</span><div><h1>人生模拟器</h1><span>每一种人生，都值得认真走过。</span></div></div>
        <div className={styles.topActions}>
          {showShelf || viewed ? <button onClick={backFromShelf}><IconArrowLeft />返回{save.active ? '当前人生' : '开篇'}</button> : <button onClick={() => { setShowShelf(true); setShowJournal(false); }}><IconBook />往世录 <span>{save.shelf.length}</span></button>}
        </div>
      </div>
      {(!saved || notice) && <p role="status" className={styles.warning}>{!saved ? '浏览器暂时无法保存。你可以继续游玩，请在关闭页面前导出生平。' : notice}</p>}

      {showShelf && !viewed ? <section className={styles.shelf}>
        <div className={styles.sectionIntro}><span className={styles.eyebrow}>留在纸页里的岁月</span><h2>往世录</h2><p>保留最近十二段完整人生。没有名次，只有你走过的路。</p></div>
        {save.shelf.length ? <div className={styles.shelfGrid}>{save.shelf.map(record => {
          const ending = endingFor(record);
          return <button key={record.id} className={styles.recordCard} onClick={() => { setViewed(record); setShowJournal(false); }}>
            <span>{worldFor(record.world).name} · {record.journal.at(-1)?.age} 岁</span><h3>{ending.title}</h3><p>{record.name}的一生</p><small>{ending.keepsake}</small><IconArrowRight />
          </button>;
        })}</div> : <div className={styles.empty}><IconBook /><h3>这里还没有写完的人生</h3><p>走到一生的终点，故事会自动收进这里。</p><button className={styles.primary} onClick={backFromShelf}>回到{save.active ? '当前人生' : '开篇'}<IconArrowRight /></button></div>}
      </section> : !life ? <>
        <section className={styles.intro}><h2>人生是场旅行。</h2></section>
        <section className={styles.configuration} aria-labelledby="attributes-heading">
          <div className={styles.birthCard}><span className={styles.eyebrow}>出生档案</span><label htmlFor="life-name">如何称呼这一世的你</label><input id="life-name" value={save.draft.name} maxLength={12} placeholder="写下一个名字" onChange={event => changeDraft({ name: event.target.value.replace(/[\u0000-\u001f]/g, '') })} />
            <span className={styles.place}>出生境遇将在进入人生时揭晓</span><p>你可以决定起点的禀赋。<br />命运如何展开，还要看往后的选择。</p>
          </div>
          <div className={styles.attributesPanel}>
            <div className={styles.sectionLabel}>
              <div className={styles.attributeHeading}>
                <h3 id="attributes-heading"><span>一</span>分配初始属性</h3>
                <div className={styles.pointBudget} aria-live="polite" aria-atomic="true"><span>总点数 <strong>{BUDGET}</strong></span><span>剩余点数 <strong>{BUDGET - spent(save.draft.stats)}</strong></span></div>
              </div>
              <div className={styles.smallActions}><button onClick={() => setStats(randomStats())}><IconSwap />随机</button><button onClick={() => setStats({ ...BASE_STATS })}><IconRefresh />重置</button></div>
            </div>
            <div className={styles.attributeGrid}>{attributes.map(attr => <div className={styles.attribute} key={attr.id}>
              <div className={styles.attributeTop}><label>{attr.name}</label><div className={styles.stepper}>
                <button aria-label={`降低${attr.name}`} disabled={save.draft.stats[attr.id] <= 1} onClick={() => setStats(allocate(save.draft.stats, attr.id, -1))}><IconMinus /></button><output aria-label={`${attr.name}数值`}>{save.draft.stats[attr.id]}</output><button aria-label={`提升${attr.name}`} disabled={save.draft.stats[attr.id] >= 10 || BUDGET - spent(save.draft.stats) < attr.cost} onClick={() => setStats(allocate(save.draft.stats, attr.id, 1))}><IconPlus /></button>
              </div></div><p>{attr.description}</p>
            </div>)}</div>
          </div>
        </section>
        <section aria-labelledby="world-heading" className={styles.worldSection}>
          <div className={styles.sectionLabel}><h3 id="world-heading"><span>二</span>选择人生背景</h3></div>
          <div className={styles.worldGrid}>{worlds.map(item => <button key={item.id} className={styles.worldCard} aria-label={`进入${item.name}人生`} aria-describedby={`world-${item.id}-description`} onClick={() => startLife(item.id)}>
            <WorldScene world={item.id} /><div className={styles.worldCopy}><div><h4>{item.name}</h4><span>{item.subtitle}</span><IconArrowRight /></div><p id={`world-${item.id}-description`}>{item.description}</p></div>
          </button>)}</div>
        </section>
      </> : isEnding ? <section className={styles.ending}>
        <WorldScene world={world.id} className={styles.endingScene} />
        <div className={styles.endingHead}><span className={styles.eyebrow}>{life.name} · {world.name} · {age} 岁{life.flags.includes('ascended') ? '飞升，续写新卷' : '终章'}</span><h2 ref={heading} tabIndex={-1}>{endingFor(life).title}</h2><p>{endingFor(life).subtitle}</p></div>
        <div className={styles.endingBody}>{endingFor(life).paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}<blockquote>{life.journal.at(-1)?.choice.replace(/[“”]/g, '')}</blockquote><div className={styles.keepsake}><IconBook /><div><small>这一生留下的旧物</small><strong>{endingFor(life).keepsake}</strong></div></div></div>
        <div className={styles.endingActions}><button className={styles.secondary} onClick={() => setExported(life)}><IconDownload />导出生平</button><button className={styles.secondary} onClick={() => setShowJournal(value => !value)}><IconBook />{showJournal ? '收起手记' : '翻阅人生手记'}</button>{viewed ? <button className={styles.primary} onClick={() => { setViewed(null); setShowShelf(true); }}>返回往世录<IconArrowRight /></button> : <button className={styles.primary} onClick={newLife}>再启一生<IconArrowRight /></button>}</div>
        {showJournal && <LifeJournal life={life} />}
      </section> : <div className={styles.playLayout}>
        <aside className={styles.timeline} aria-label="人生足迹"><div className={styles.timelineHeading}><IconBook /><span>来时的路</span></div><div className={styles.timelineEntries}>
          <div className={styles.timelineOrigin}><i /><span>{world.place}</span><small>故事由此开始</small></div>
          {life.journal.map((item, index) => <button key={item.eventId} className={index === life.journal.length - 1 ? styles.recent : undefined} onClick={() => setShowJournal(true)}><i /><span>{item.age} 岁</span><strong>{item.title}</strong></button>)}
          {!life.journal.length && <p className={styles.timelineNote}>此刻还是一张白纸。<br />相遇与选择，会慢慢留下痕迹。</p>}
        </div><button className={styles.journalButton} onClick={() => setShowJournal(true)}>翻阅完整手记<IconArrowRight /></button></aside>
        <section className={styles.storyColumn}>
          {showJournal ? <div className={styles.journalPage}><div className={styles.sectionLabel}><h2 ref={heading} tabIndex={-1}>人生手记</h2><button className={styles.textButton} onClick={() => setShowJournal(false)}><IconClose />回到当下</button></div>{life.journal.length ? <><LifeJournal life={life} /><button className={styles.textButton} onClick={() => setExported(life)}><IconDownload />导出当前手记</button></> : <p>还没有做出选择，故事正要开始。</p>}</div> : <article className={styles.story} key={`${life.cursor}-${life.phase}`}>
            <WorldScene world={world.id} className={styles.storyScene} />
            <div className={styles.storyContent}><div className={styles.chapterLine}><span>{chapterLabel(age, world.id)}</span><span>{scene!.kind ? ({ main: '人生转折', side: '支线 · 旧事与回音', incident: '突发际遇', life: '日常与成长' })[scene!.kind] : world.subtitle}</span></div>
              <div className={styles.age}><strong>{age}</strong><span>岁</span><i /></div>
              <h2 ref={heading} tabIndex={-1}>{life.phase === 'event' ? scene!.title : entry!.title}</h2>
              {life.phase === 'event' ? <><div className={styles.prose}><Paragraphs text={prose(scene!.text, life)} /></div><div className={styles.choiceHeading}><span>{age === 0 ? '故事的开篇' : '此刻，你会如何选择'}</span><i /></div><div className={styles.choices} role="group" aria-label="人生选择">{scene!.choices.map((option, index) => {
                const available = choiceAvailable(life, option);
                const chance = successChance(life, option);
                return <button key={option.id} className={styles.choice} disabled={!available} onClick={() => act(current => choose(current, option.id))}>
                  <span className={styles.choiceNumber}>{String.fromCharCode(65 + index)}</span><span className={styles.choiceText}><strong>{option.label}</strong><small>{option.hint}{!available && ` · 尚需${attributes.find(attr => attr.id === option.requirement!.stat)!.name} ${option.requirement!.min}`}{option.risk && available && ` · 成功率 ${Math.round(chance * 100)}%`}</small></span><IconArrowRight />
                </button>;
              })}</div></> : <div className={styles.result} aria-live="polite"><p className={styles.chosen}><IconCheck />{entry!.choice}</p><div className={styles.prose}><Paragraphs text={entry!.result} /></div><div className={styles.changes}>{entry!.changes.map(change => <span key={change}>{change}</span>)}</div><div className={styles.nextPage}><span>{isLastPage(life) ? '那些经历，终将成为你的故事。' : '这个选择，已经写进了你的人生。'}</span><button className={styles.primary} onClick={() => act(advance)}>{isLastPage(life) ? '回望这一生' : '往后走一页'}<IconArrowRight /></button></div></div>}
            </div>
          </article>}
          <p className={styles.pageNote}>平凡或精彩，都有属于自己的分量。</p>
        </section>
        <aside className={styles.lifePanel} aria-label="人生近况"><div className={styles.person}><span className={styles.personSeal}>{life.name.slice(0, 1)}</span><h3>{life.name}</h3><p>{life.flags.includes('chosen-route') ? directionFor(life) : '尚未定向的人生'}</p><span>{world.name} · {age} 岁</span></div>
          <div className={styles.vitals}><Meter label="健康" value={life.health} /><Meter label="生计" value={life.wealth} /><Meter label="心境" value={life.peace} /><p>健康归零时，人生会提前落幕。生计表示生活余裕，并非具体金钱。</p></div>
          <div className={styles.currentStats}><h4>此时的你</h4><dl>{attributes.map(attr => <div key={attr.id}><dt>{attr.name}</dt><dd>{life.stats[attr.id]}{life.stats[attr.id] !== life.initial[attr.id] && <small>初始 {life.initial[attr.id]}</small>}</dd></div>)}</dl></div>
          <div className={styles.relations}><h4>生命中的人</h4>{(['family', 'friend', 'mentor'] as Relation[]).filter(key => key === 'family' || (key === 'friend' ? age >= 3 : age >= (world.id === 'cultivation' ? 7 : 10))).map(key => <div key={key}><span>{world.relations[key].name}<small>{world.relations[key].role}</small></span><em>{life.links[key] >= 70 ? '深厚' : life.links[key] >= 45 ? '亲近' : life.links[key] >= 20 ? '牵挂' : '疏远'}</em></div>)}</div>
          <button className={styles.restart} onClick={() => setConfirm(true)}><IconRefresh />重新开始</button>
        </aside>
      </div>}
      <footer className={styles.footer}><span>人生没有标准答案</span><span>每次落笔，都是一种可能。</span></footer>
    </div>
    <dialog ref={dialog} className={styles.dialog} onCancel={() => setConfirm(false)} aria-labelledby="restart-title"><h2 id="restart-title">要重新开始这一生吗？</h2><p>当前尚未完成的人生会被替换。往世录中的完整人生会保留。</p><div><button autoFocus className={styles.secondary} onClick={() => setConfirm(false)}>继续现在的人生</button><button className={styles.primary} onClick={newLife}>重新开始</button></div></dialog>
    {exported && <ExportDialog life={exported} onClose={() => setExported(null)} />}
  </main>;
}
