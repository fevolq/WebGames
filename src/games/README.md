# 游戏模块

每个小游戏放在 `src/games/<slug>/index.tsx`，默认导出一个 React 组件。
`slug` 必须与 `src/catalog/games.ts` 中的登记信息一致。

大厅目前只展示演示目录，尚未包含任何小游戏实现。
所有游戏模块通过 `import.meta.glob` 按需加载，不会直接打包进大厅入口。

接入步骤与 Canvas 生命周期约定见仓库根目录 README。
