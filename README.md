# Thor

A React 19 starter built for **spec-driven development**: specifications under
`specs/` are the source of truth, and code is their implementation.

## Stack

| Layer      | Choice                                              | Why                                                                 |
| ---------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| UI         | React 19.2 + React Compiler                         | Automatic memoisation; no `useMemo`/`useCallback` noise             |
| Build      | Vite 8 (Rolldown)                                   | Fast dev server, route-level code splitting out of the box          |
| Language   | TypeScript 6 (`strict`, `noUncheckedIndexedAccess`) | The first line of every spec is its types                           |
| Routing    | TanStack Router                                     | Type-safe routes and typed, validated search params                 |
| Data       | TanStack Query                                      | Cache, invalidation and request state without hand-rolled reducers  |
| Validation | Zod 4                                               | One schema gives runtime parsing and the TypeScript type            |
| Forms      | react-hook-form + Zod resolver                      | Uncontrolled inputs, schema-driven errors                           |
| Styling    | Tailwind CSS 4 + shadcn/ui                          | CSS-first theming; components live in the repo, not in node_modules |
| Tests      | Vitest 4 + Testing Library, Playwright              | Rules unit-tested, flows tested through the accessibility tree      |
| Lint       | ESLint 10 flat config, type-aware + Prettier        | Type-aware rules catch what the compiler alone does not             |

## Quickstart

```bash
pnpm install
pnpm dev                      # http://localhost:5173

pnpm exec playwright install  # once, before the first e2e run
pnpm e2e
```

Node 22.12+ and pnpm 10 are expected (`packageManager` pins the exact version).

## Scripts

| Script                   | What it does                                                    |
| ------------------------ | --------------------------------------------------------------- |
| `pnpm dev`               | Dev server with HMR                                             |
| `pnpm verify`            | **The gate:** format, lint, typecheck, spec check, tests, build |
| `pnpm test` / `:watch`   | Unit and component tests                                        |
| `pnpm test:coverage`     | Coverage against thresholds (80% lines, 75% branches)           |
| `pnpm e2e` / `:ui`       | Playwright against a production build                           |
| `pnpm spec:new "<name>"` | Scaffold the next `specs/NNN-slug/` folder                      |
| `pnpm spec:check`        | Traceability: every requirement planned, tasked and tested      |

## Spec-driven workflow

```
/specify → /clarify → /plan → /tasks → /implement → /analyze
```

Each command is a Claude Code slash command in `.claude/commands/`.

- `specs/constitution.md` — the rules every spec and plan obeys.
- `docs/spec-driven-development.md` — what the workflow is and when to skip it.
- `specs/002-workout-log/` — the first feature: clarified, waiting on `/plan`.

Requirements carry stable ids (`FR-001`) that appear in the spec, the plan, the
task list and the test titles. `pnpm spec:check` fails the build when a shipped
requirement has no test naming it.

## Layout

```
.claude/commands/     slash commands driving the workflow
specs/                constitution, templates, one folder per feature
docs/                 methodology
scripts/              feature scaffolding + the traceability gate
src/
  routes/             file-based routes (TanStack Router codegen)
  features/<name>/    model.ts (pure rules) · store.ts · repository.ts · queries.ts · components/
  components/ui/      vendored shadcn/ui source
  lib/                cross-cutting helpers
  test/               setup and render helpers
e2e/                  Playwright specs
```

Dependencies point inward: routes → components → queries → repository → store →
model. `model.ts` imports no framework, which is what makes the rules cheap to
test.

## What is here

The stack, the workflow, and one clarified specification. `src/features/` is
empty on purpose: `specs/002-workout-log/spec.md` describes a workout log for
training without a programme — you use whichever machine is free, so the question
the app answers is "what did I lift on this last time", and its history is
organised by exercise rather than by date.

## Deploying

The app is a static build with a service worker, so any static host works. It
expects to live at the **root of a domain** — a subdirectory would need `base`,
the router's `basepath` and the manifest's `scope` changed together, and getting
any of them wrong breaks offline rather than the page you are looking at.

- **Vercel** — import the repository; `vercel.json` sets the build, the SPA
  rewrite and the cache headers.
- **Cloudflare Pages / Netlify** — build command `pnpm build`, output `dist`.
  `public/_redirects` and `public/_headers` carry the same rules.

Both keep `sw.js` and the manifest uncacheable so a new build can take over, and
cache the content-hashed assets forever.

After a deploy, check what a host can silently get wrong:

```bash
pnpm check:deploy https://your-deployment
```

It verifies the SPA fallback, that `sw.js` is never served stale, that the
manifest is reachable, and that hashed assets are cached long. Run against a local
`vite preview` the last check fails by design — preview serves everything
`no-cache`; the long-cache header comes from the host config.

The one thing it cannot check is the requirement it exists to protect: install the
app to a phone's home screen, turn on airplane mode, launch it from the icon and
record a set.

Serving over HTTPS matters: the service worker behind offline support, and
installing to a phone's home screen, both require a secure context.

## Decisions worth knowing

- **TypeScript is pinned to 6.0.x.** `typescript-eslint@8` supports
  `typescript <6.1.0`; on TS 7 the type-aware lint rules silently stop running.
- **React Compiler is enabled.** Any component using `react-hook-form`'s
  `register()` must opt out with `'use no memo'`: `register()` mutates state
  during render, so the compiler may memoise it away and the form silently
  validates as empty after its first submit. See `CLAUDE.md`.
- **Coverage thresholds apply to logic, not wiring.** Route modules and the entry
  point are excluded and covered by Playwright instead.

`CLAUDE.md` carries the full set of constraints for agents working here.
