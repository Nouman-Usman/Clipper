# Repository Guidelines

## Project Structure & Module Organization
This repo is a single Next.js 16 App Router project.
- `app/`: application entrypoints and UI modules (`page.tsx`, `layout.tsx`, feature components like `landing-motion.tsx`, `three-hero.tsx`).
- `public/`: static assets (SVGs and icons) served from `/`.
- Root config: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`.
- Generated output: `.next/` (do not edit or commit manual changes).

Keep new route files under `app/` and colocate route-specific components nearby when practical.

## Build, Test, and Development Commands
Use npm (lockfile is `package-lock.json`):
- `npm run dev`: start local development server at `http://localhost:3000`.
- `npm run build`: create production build.
- `npm run start`: run the production build locally.
- `npm run lint`: run ESLint checks.

Before opening a PR, run at least `npm run lint` and `npm run build`.

## Coding Style & Naming Conventions
- Language: TypeScript + React function components.
- Indentation: 2 spaces; keep imports grouped and unused code removed.
- Components/files: use `kebab-case` for route-local files (existing pattern: `landing-console.tsx`, `three-hero.tsx`).
- Prefer explicit, descriptive names (`HeroScene`, `LandingConsole`) over abbreviations.
- Styling: use existing global styles in `app/globals.css`; keep one-off styling close to the component.

## Testing Guidelines
There is no test runner configured yet (no Jest/Vitest/Playwright scripts).
Until tests are added:
- Treat `npm run lint` and `npm run build` as required quality gates.
- For UI changes, include manual verification notes in the PR (route tested, browser/device checks).

If you add a test framework, add scripts to `package.json` and place tests in `app/**/__tests__/` or alongside modules as `*.test.ts(x)`.

## Commit & Pull Request Guidelines
Current history is minimal (`Initial commit from Create Next App`), so use a clear, imperative style:
- Commit format: `feat: add hero animation`, `fix: prevent layout shift`, `chore: update eslint rule`.

PRs should include:
- Short summary of what changed and why.
- Linked issue/task (if available).
- Screenshots or GIFs for UI changes.
- Verification checklist with executed commands and results.

## Agent-Specific Notes (Next.js 16)
This repo includes a hard rule: Next.js behavior may differ from older versions. Before framework-level changes, consult relevant docs under `node_modules/next/dist/docs/` and follow deprecations.
