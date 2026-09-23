# Repository Guidelines

## Project Structure & Architecture

Desktop-only lobby built with React, TypeScript, Vite, React Router, CSS Modules, and Arco Design. Scope covers the lobby and game entry points; implement gameplay only when requested.

- `src/app/`: routing, lazy loading, and loading/error boundaries.
- `src/catalog/`: game metadata, validation, categories, and pure search logic. Register entries in `games.ts`.
- `src/pages/lobby/`: lobby layout, UI, URL filter helpers, and hooks.
- `src/components/`: shared cards and icons; `src/styles/`: minimal global resets.
- `src/games/<slug>/index.tsx`: future game modules, each default-exporting a React component at `/<slug>`.
- `public/art/` and `public/covers/`: local illustrations and covers.
- `scripts/`: Nginx configuration generation and deployment checks. Tests live beside source files.

Keep the lobby dependent on metadata, not game implementations. Treat URL parameters as the filter state; preserve unrelated parameters. Scope lobby styles to its layout.

Each game owns its page, layout, styles, interactions, runtime state, scores, save format, storage keys, and recovery logic inside `src/games/<slug>/`. Do not impose a shared game template, page header, branding, or layout. The lobby and app layer must not manage game progress. The only shared game navigation is an unobtrusive settings control in the top-right hover area, with return navigation inside its menu; it must not occupy layout space or handle game state. Preserve keyboard access to this control. Games may share input lifecycle helpers, but never a central progress store.

## Build, Test, and Development Commands

Use Node.js 24 and npm with the committed lockfile. In PowerShell, use `npm.cmd` if needed.

- `npm ci`: install locked dependencies.
- `npm run dev`: start development at `http://127.0.0.1:5173`.
- `npm run typecheck`: check strict TypeScript types.
- `npm test` / `npm run test:ui`: run all tests or lobby interaction tests.
- `npm run build`: type-check, build `dist/`, validate catalog, and generate `.artifacts/nginx/default.conf`.
- `npm run preview`: preview the production build on port 4173.
- `npm run check`: run tests and production build.
- `npm run test:deployment`: verify Nginx against matching local artifacts; configure `TEST_BASE_URL` and optionally `TEST_BUILD_DIR`.

## Coding Style & Naming Conventions

Follow `.editorconfig`: UTF-8, LF, two-space indentation, and final newlines. Match existing semicolons and single-quoted TypeScript strings. Use PascalCase components, `useX` hooks, and `Component.module.css` stylesheets. Keep pure helpers independent of React. No formatter or linter is configured.

## Testing Guidelines

Use Vitest with `*.test.ts` or `*.test.tsx`; UI tests use React Testing Library, user-event, and jsdom. No numeric coverage threshold exists. Cover meaningful behavior changes, especially filtering, URL restoration, fallbacks, and route/asset validation. Run `npm run check` for code changes; inspect desktop layouts for visual changes.

## Commit & Pull Request Guidelines

Commit on `main` unless instructed otherwise. Follow history: `fix: ...`, `style: ...`, `refactor: ...`, `test: ...`, `chore: ...`, or `docs: ...`. Keep commits focused; preserve unrelated edits. Do not push unless requested.

If opening a PR, describe the problem, resulting behavior, validation, and linked issue when applicable; include screenshots for visual changes. Never commit secrets, local environment files, or generated artifacts.
