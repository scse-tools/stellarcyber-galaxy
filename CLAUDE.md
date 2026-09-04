# CLAUDE.md

## Build & Test Commands
- **Install dependencies:** `npm install`
- **Run dev server:** `npm run dev`
- **Build project:** `npm run build`
- **Run all tests:** `npm test`
- **Run single test:** `npx jest path/to/file.test.js`
- **Lint & Format:** `npm run lint`

## Tech Stack & Core Libraries
- **Framework:** Next.js (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS, shadcn/ui
- **State Management:** Zustand
- **Database/Backend:** Supabase / Prisma

## Code Style & Architecture Guidelines
- **Modularity:** Keep files short (< 200 lines). Break large components into sub-components.
- **Naming Conventions:** 
  - `kebab-case` for file names and directories (e.g., `user-profile.tsx`).
  - `PascalCase` for React components and TypeScript types/interfaces.
  - `camelCase` for functions and variables.
- **TypeScript:** Strict mode enabled. Never use `any`—use `unknown` or explicit types/generics.
- **State & Data:** Prefer Server Components for data fetching; use Client Components (`"use client"`) only when interactivity/state is strictly needed.

## Workflow Rules
- Always run `npm run lint` and `npm test` before declaring a task complete.
- Do not install new third-party dependencies without asking first.
- Keep changes minimal and focused solely on the requested task.
- Clean up unused imports, dead code, and temporary console logs before finishing.