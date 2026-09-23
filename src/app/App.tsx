import { Component, Suspense, lazy, useEffect, type ComponentType, type ReactNode } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { games } from '../catalog/games';
import { gamePath, validateCatalog, type Game } from '../catalog/model';
import { LobbyLayout } from '../pages/lobby/LobbyLayout';
import { Icon } from '../components/Icon';
import styles from './App.module.css';

validateCatalog(games);
const Lobby = lazy(() => import('../pages/lobby/Lobby'));
const modules = import.meta.glob<{ default: ComponentType }>('../games/*/index.tsx');
const gameComponents = Object.fromEntries(
  Object.entries(modules).map(([path, load]) => [path.split('/').at(-2)!, lazy(load)]),
);

function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    const game = games.find((entry) => gamePath(entry) === pathname.replace(/\/$/, ''));
    document.title = pathname === '/' ? '游间 PLAYROOM · 给大脑放个小假'
      : game ? `${game.name} · 游间 PLAYROOM` : '页面未找到 · 游间 PLAYROOM';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

export function StatusPage({ kind, game }: { kind: 'unavailable' | 'not-found' | 'error' | 'error-lobby' | 'loading' | 'loading-lobby'; game?: Game }) {
  const maintenance = game?.status === 'maintenance';
  const loading = kind === 'loading' || kind === 'loading-lobby';
  const failed = kind === 'error' || kind === 'error-lobby';
  const title = kind === 'not-found' ? '这条路，暂时没有游戏'
    : kind === 'error-lobby' ? '大厅暂时没能加载'
    : kind === 'error' ? '游戏暂时没能加载'
    : kind === 'loading-lobby' ? '正在打开游戏大厅…'
    : kind === 'loading' ? '正在准备游戏…'
    : maintenance ? `${game?.name}正在维护` : `${game?.name ?? '游戏'}，还在准备中`;
  const description = kind === 'not-found' ? '地址可能有误。回到大厅，看看其他小小的快乐。'
    : failed ? '请检查网络后刷新页面，或先返回大厅。'
    : loading ? '稍等一下，马上就好。'
    : maintenance ? '我们正在调整游戏体验，稍后再来看看吧。'
    : '这是一张游戏预告，具体玩法尚未开放。先到大厅逛逛吧。';
  const badge = kind === 'not-found' ? '404' : failed ? 'OOPS' : loading ? '…' : maintenance ? 'PAUSE' : 'SOON';
  return <LobbyLayout><main id="main-content" tabIndex={-1} className={styles.statusPage}>
    <span className={styles.statusArt}><Icon name={kind === 'not-found' ? 'search' : 'gamepad'} size={72} /><span>{badge}</span></span>
    <div className={styles.eyebrow}>{kind === 'not-found' ? 'A LITTLE DETOUR' : 'GOOD THINGS TAKE A LITTLE TIME'}</div>
    <h1>{title}</h1><p>{description}</p>
    {!loading && <div className={styles.statusActions}>
      <Link to="/"><Icon name="back" size={17} />返回游戏大厅</Link>
      {failed && <button onClick={() => window.location.reload()}>重新加载</button>}
    </div>}
  </main></LobbyLayout>;
}

class PageErrorBoundary extends Component<{ children: ReactNode; errorKind?: 'error' | 'error-lobby' }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <StatusPage kind={this.props.errorKind ?? 'error'} /> : this.props.children; }
}

function GameRoute({ game }: { game: Game }) {
  if (game.status !== 'available') return <StatusPage kind="unavailable" game={game} />;
  const GameComponent = gameComponents[game.slug];
  if (!GameComponent) return <StatusPage kind="error" />;
  return <PageErrorBoundary key={game.slug}>
    <Suspense fallback={<StatusPage kind="loading" />}><GameComponent /></Suspense>
  </PageErrorBoundary>;
}

export function App() {
  return <>
    <RouteEffects />
    <Routes>
      <Route path="/" element={<PageErrorBoundary errorKind="error-lobby">
        <Suspense fallback={<StatusPage kind="loading-lobby" />}><Lobby /></Suspense>
      </PageErrorBoundary>} />
      {games.map((game) => <Route key={game.slug} caseSensitive path={gamePath(game)} element={<GameRoute game={game} />} />)}
      <Route path="*" element={<StatusPage kind="not-found" />} />
    </Routes>
  </>;
}
