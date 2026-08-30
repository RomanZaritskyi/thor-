# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this repo is

A spec-driven React 19 starter. Specifications under `specs/` are the source of
truth; code and tests are their implementation. Read `specs/constitution.md`
before doing anything non-trivial — it is the ruleset, not a style guide.

## The loop

| Step      | Command      | Produces                  | Gate before moving on               |
| --------- | ------------ | ------------------------- | ----------------------------------- |
| Describe  | `/specify`   | `specs/NNN-slug/spec.md`  | requirements are observable         |
| Decide    | `/clarify`   | updated `spec.md`         | zero `[NEEDS CLARIFICATION]`        |
| Design    | `/plan`      | `specs/NNN-slug/plan.md`  | every `FR-xxx` has a home           |
| Decompose | `/tasks`     | `specs/NNN-slug/tasks.md` | tests precede implementation        |
| Build     | `/implement` | code + tests              | `pnpm verify` and `pnpm spec:check` |
| Audit     | `/analyze`   | a drift report            | —                                   |

Skipping a step is allowed only for a change with no user-visible behaviour
(a refactor, a dependency bump, a typo). Everything else starts at `/specify`.

**One spec per feature (Constitution II).** Before scaffolding a new folder, ask
whether every requirement already written stays true. If yes, `pnpm spec:new`.
If no, the change contradicts an existing spec — edit that spec in place, in the
same commit as the code and the test. A spec describes the present, not a history
of changes; git holds the history. A removed feature's spec becomes
`Status: superseded` plus `Superseded by: NNN-slug`, which `pnpm spec:check`
requires to resolve.

## Commands

```bash
pnpm dev                  # Vite dev server on :5173
pnpm verify               # format + lint + typecheck + unit tests + build  ← the gate
pnpm test                 # Vitest once
pnpm test:watch           # Vitest in watch mode
pnpm test:coverage        # thresholds: 80% lines/statements/functions, 75% branches
pnpm e2e                  # Playwright (builds first, then previews on :4173)
pnpm spec:check           # traceability: spec ↔ plan ↔ tasks ↔ tests
pnpm spec:new "<name>"    # scaffold the next specs/NNN-slug/ folder
```

`pnpm verify` is the definition of done. Run it before you claim anything works.

## Architecture

Dependencies point inward. Nothing in an inner ring may import from an outer one.

```
routes/          route modules: URL parsing, providers, composition   (outermost)
features/*/components/   React components, no business rules
features/*/queries.ts    TanStack Query hooks over a repository
features/*/repository.ts CRUD over a store port, injected clock + ids
features/*/store.ts      persistence adapters behind a port
features/*/model.ts      pure rules and schemas, no framework imports  (innermost)
```

- Business rules go in `model.ts` as pure functions. If a rule needs a component
  to be tested, it is in the wrong place.
- Side effects — storage, network, `Date.now()`, `crypto.randomUUID()` — are
  injected, never reached for directly inside a rule.
- Parse everything crossing a trust boundary (stored JSON, URL params, responses)
  with a Zod schema. Never cast.
- `src/components/ui/**` is vendored shadcn/ui source. Regenerate it with
  `pnpm dlx shadcn@latest add <component>`; do not hand-tune it.

## Stack constraints worth knowing before you get bitten

- **React Compiler is on** (`react({ compiler: true })` in `vite.config.ts`).
  It assumes the Rules of React. `react-hook-form`'s `register()` mutates form
  state during render, which the compiler is free to memoise away — the symptom
  is a form that validates as empty after its first successful submit.
  `src/features/notes/components/note-form.tsx` opts out with `'use no memo'`.
  Any new component built on `register()` needs the same directive **and** a test
  that submits twice.
- **TypeScript is pinned to 6.0.x, not 7.** `typescript-eslint@8` declares
  `typescript <6.1.0`; on TS 7 the type-aware lint rules stop running. Bump only
  once typescript-eslint supports it, and confirm `pnpm lint` still reports
  type-aware findings afterwards.
- **`erasableSyntaxOnly` is on.** No TypeScript-only runtime syntax: no parameter
  properties (`constructor(private x)`), no `enum`, no namespaces.
- **Route modules** export `Route` and define their component inline; that shape
  is required by TanStack Router and `react-refresh/only-export-components` is
  disabled for `src/routes/**` because of it.
- **Coverage thresholds scope to logic**, not wiring — `src/routes/**`,
  `main.tsx`, devtools and `src/components/ui/**` are excluded and covered by
  Playwright instead. Do not "fix" a coverage failure by widening that list.
- **Playwright** uses its own downloaded browsers (`pnpm exec playwright install`).
  On an image that ships Chromium, point at it with
  `PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome pnpm e2e`.

## Testing

- Query by role, label and accessible name. `getByTestId` is for ordering
  assertions only (`note-title`, `note-card`), never as a substitute for a real
  accessible name.
- Name the requirement in the test title: `it('… (FR-004)')`. `pnpm spec:check`
  greps for those ids and fails a shipped spec whose requirement no test names.
- Inject a repository via `renderApp(ui, { repository })` from `src/test/utils`.
  Never let a test touch real `localStorage` state left by another test.
- Never weaken a test to make it pass. A failing test is information.

## Conventions

- No default exports except where a framework demands one.
- `import type` for type-only imports (enforced).
- Comments explain _why_, not _what_. The code already says what.
- The reference feature (`specs/001-notes/` plus `src/features/notes/`) exists to
  demonstrate the loop. Deleting it is a supported operation: remove those two
  directories, `src/routes/notes/`, `e2e/notes.spec.ts`, and the nav link in
  `src/routes/__root.tsx`.
