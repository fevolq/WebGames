# 游间 PLAYROOM

一个给电脑端休息时间准备的小游戏大厅。大厅与所有小游戏位于同一项目，以独立根路径访问。

当前完成的是大厅：原创 SVG 封面、分类筛选、名称与标签搜索、URL 筛选状态、封面失败回退、游戏预告页与 404 页面。六款游戏均为目录示例，尚未实现游戏玩法；页面不展示演示或精选角标。

## 本地开发

建议使用 Node.js 24 LTS；也支持 Node.js 22.13 及以上的 22.x 版本。依赖使用 npm 与 package-lock.json 锁定。

```sh
npm ci
npm run dev
```

打开 http://127.0.0.1:5173。界面面向宽度 1024px 及以上的桌面浏览器，常规窗口三列、大屏四列。更窄窗口保留桌面布局，不提供手机端适配。

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`npm run check` 一次执行全部测试、TypeScript 检查和生产构建；`npm run test:ui` 单独运行大厅交互回归。

`preview` 地址为 http://127.0.0.1:4173，仅供本地预览。构建生成静态站点 `dist/`、资源清单 `dist/.vite/manifest.json` 和生产配置 `.artifacts/nginx/default.conf`。

## 技术与目录

React 18 + TypeScript + Vite + React Router；CSS Modules；Arco 的搜索框按需加载样式。React 18 用于与 Arco 现有组件稳定配合。

```text
src/
  app/                 应用入口、路由、加载与错误边界
  catalog/games.ts      纯游戏元数据，新增目录条目的唯一入口
  catalog/model.ts      元数据类型、分类、路径规则与校验
  catalog/search.ts     分类与搜索匹配，不依赖页面或路由
  components/          游戏卡片、图标
  pages/lobby/         大厅布局、页面、URL 筛选规则及状态 Hook
  games/<slug>/        后续小游戏代码，按需加载
  styles/              最小公共样式重置
public/
  art/                 大厅插画
  covers/              游戏封面
  404.html             无需 JavaScript 的服务器 404 页
scripts/
  generate-routes.ts    校验注册信息并生成 Nginx 路由
  asset-types.ts        封面格式与资源 MIME 规则
  check-deployment.ts   按构建清单验证部署页面、资源内容和缓存
  smoke-http.ts         部署验证命令入口
.github/workflows/
  check.yml            main / PR 的测试、构建与 Nginx 部署验证
```

## 大厅职责与边界

- 大厅只依赖目录元数据，负责分类、搜索、卡片展示和进入链接，不导入具体游戏实现。
- `Lobby` 按需加载，Arco 搜索框的组件配置与样式随大厅加载。
- `LobbyLayout` 用于大厅和预告、加载、错误、404 等提示页面；实际游戏入口不再自动套用大厅页头页脚。
- 大厅的桌面最小宽度、主题、控件基础样式及减少动画规则限定在 `LobbyLayout` 内。`styles/global.css` 仅保留盒模型与 body 外边距重置。
- `filters.ts` 负责 URL 筛选参数的读取和更新，`useLobbyFilters` 连接 React Router，页面只使用筛选结果和操作。URL 是筛选状态的唯一来源，支持刷新、分享和浏览器前进后退。
- 分类与关键词分别处理：`all` 作为关键词可以正常搜索；清除筛选只删除 `category` 和 `q`，保留其他 URL 参数。

当前范围是大厅与游戏入口，不包含具体游戏、游戏运行容器、引擎、暂停或存档系统。

## 路由约定

| 地址 | 当前内容 |
| --- | --- |
| `/` | 游戏大厅 |
| `/?category=puzzle&q=2048` | 可刷新、可分享的筛选结果 |
| `/game_a` | 数字叠叠预告页 |
| `/game_b` | 贪吃蛇漫游预告页 |
| `/block-drop` 等登记地址 | 对应游戏预告页 |
| 未登记地址 | 404 |

React Router 在浏览器内分发页面。生产 Nginx 配置由同一份游戏目录生成，使已登记的游戏地址（含末尾 `/`）在直接访问或刷新时返回应用入口。缺失静态资源、未知路径以及未登记的游戏子路径返回真实 HTTP 404，不会被大厅页面替代。

当前每款游戏对应一个根路径；如以后需要游戏内部的嵌套路由，需同步扩展前端路由及 Nginx 路径规则。

## 接入同项目内的小游戏

1. 创建 `src/games/<slug>/index.tsx`，默认导出一个 React 组件。
2. 在 `src/catalog/games.ts` 登记名称、slug、简介、分类、标签、封面和状态。访问地址自动生成为 `/<slug>`。
3. 封面放入 `public/covers/`，支持 SVG、PNG、JPEG、WebP、GIF 和 AVIF。完成实际游戏后设置 `status: 'available'`，移除演示标记 `demo`。
4. 执行 `npm run build` 并重新部署。脚本会检查重复或非法路径、缺失封面和已上线但缺失的游戏模块。

```tsx
// src/games/my-game/index.tsx
export default function MyGame() {
  return <main id="main-content">这里放实际游戏界面</main>;
}
```

```ts
// 添加到 src/catalog/games.ts 的 games 数组
{
  slug: 'my-game',
  name: '我的游戏',
  englishName: 'MY GAME',
  description: '一句话介绍游戏。',
  category: 'casual',
  tags: ['休闲'],
  cover: '/covers/my-game.svg',
  status: 'available',
}
```

状态支持 `available`、`coming-soon` 和 `maintenance`；已开放游戏通过封面链接进入，未开放与维护中的游戏不提供进入链接，直接访问时展示对应提示。卡片只展示封面、名称、分类与简介。`demo` 用于校验演示条目不能被标记为已开放，不作为界面角标；元数据不包含已停用的精选和操作方式字段。所有模块通过 `import.meta.glob` 延迟导入，游戏逻辑不会在打开大厅时执行。

Canvas 或其他引擎可在组件中创建实例；组件卸载时应销毁实例、移除键盘事件并取消 requestAnimationFrame、计时器和音频。游戏资源优先通过模块 import 引入，以生成带哈希的资源地址。游戏之间如需本地存档，应使用带 slug 前缀的 localStorage 键。

## 部署到服务器

### Docker Compose

服务器安装 Docker 与 Compose 后，在项目目录执行：

```sh
docker compose up -d --build
```

默认监听服务器的 8080 端口。可通过环境变量 `PORT` 修改发布端口。构建阶段使用 Node，运行阶段仅使用 Nginx。需要域名和 HTTPS 时，在服务器现有反向代理中指向该端口并配置证书。

更新时重新执行同一命令；所有游戏和大厅一起构建、一起发布。

### 已有 Nginx

1. 执行 `npm ci && npm run build`。
2. 将 `dist/` 的内容部署到站点目录，例如 `/srv/webgames`。
3. 将 `.artifacts/nginx/default.conf` 作为站点配置模板，把 `root` 改为站点目录，并按服务器情况调整 `listen`、`server_name` 和 TLS 配置。该文件是 `server` 配置块，需要放在已有 `http` 上下文中；主配置应已包含 `mime.types`。
4. 执行 `nginx -t`，通过后重新加载 Nginx。每次新增游戏均需同步发布新生成的配置。

HTML 与固定名称资源使用重新验证缓存；Vite 生成的带哈希资源缓存一年。发布新版本时，建议保留上一版本的哈希资源一段时间，避免仍在浏览旧页面的用户遇到资源缺失。

### 部署验证

使用与服务器版本对应的构建产物，启动生产 Nginx 后执行：

```sh
# 默认验证 http://127.0.0.1:8080
npm run test:deployment

# Linux/macOS：验证指定服务器
TEST_BASE_URL=https://your-domain.example npm run test:deployment
```

PowerShell 使用 `$env:TEST_BASE_URL = 'https://your-domain.example'` 设置目标后运行同一命令。
默认从本地 `dist/` 读取待验证版本；可通过 `TEST_BUILD_DIR` 指定已保存的构建目录。不要用另一个版本的本地构建检查已部署版本。

检查读取 [Vite 构建清单](https://vite.dev/guide/backend-integration)，覆盖入口、动态加载的大厅 JS/CSS、共享依赖与关联资源。逐项检查 HTTP 状态、MIME、缓存和实际文件内容，并验证所有登记地址、末尾斜线和真实 404。封面根据各自文件格式检查 MIME，缺失懒加载文件、HTML 冒充脚本、旧版本文件或错误的缓存配置都会使命令失败。

### 自动检查

GitHub Actions 的 `Lobby checks` 在推送到 `main`、针对 `main` 的 Pull Request，以及手动触发时运行。流程使用 Node.js 24 安装锁定依赖，执行 `npm run check`，随后用 Nginx 容器加载同一份构建产物和生成配置，再执行 HTTP 部署检查。流程只做验证，不发布站点；需要先将工作流推送到 GitHub 才会运行。

测试包含目录与 URL 规则、构建清单和部署故障回归，以及 React Testing Library + jsdom 中的真实大厅组件交互：输入与分类联动、空结果、清空条件、`all` 搜索词、按 URL 重新挂载恢复、历史前进后退、封面回退、目录聚焦和预告页返回大厅。页面布局和真实刷新仍通过浏览器验收。

浏览器验收还应确认：分类与搜索叠加、刷新和前进后退保留筛选、清空条件、搜索 `all`、空结果、图片失败回退、预告页返回大厅，以及 1024/1280/1440/1920px 桌面窗口布局。

## 开发约定

- 使用 `main` 分支提交；不提交密钥、本地环境文件或构建产物。
- 提交依赖锁文件；文本采用 UTF-8、LF 和两空格缩进。
- 界面示例不得标记为可体验的真实游戏，不显示虚构的评分、在线人数或排行榜。
- 所有插画与封面均为本项目编写的本地 SVG，无外部图片或字体运行时依赖。
