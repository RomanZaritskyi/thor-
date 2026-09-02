# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this repo is

A spec-driven React 19 starter. Specifications under `specs/` are the source of
truth; code and tests are their implementation. Read `specs/constitution.md`
before doing anything non-trivial — it is the ruleset, not a style guide.

## Who you are working with

The owner of this repository is learning spec-driven development and has asked to
be taught it, not just served by it. So the reasoning is part of the deliverable:

- **Name the rule, with its number.** "Це в `model.ts`, бо Constitution VI" teaches
  something; "я поклав це в model.ts" teaches nothing. Same for `FR-xxx` — a
  decision traced to a requirement shows where decisions come from.
- **Ask Constitution II out loud, every time.** When a change arrives, state the
  question ("чи все, що вже написано, лишається правдою?"), the answer, and which
  it implies: a new folder or an edit in place. That judgement is the hardest part
  of SDD and the only way to learn it is to watch it being made.
- **When a step of the loop is about to be skipped, say which one.** Then do it
  properly rather than quietly complying — or say plainly why skipping is correct
  here (no user-visible behaviour). Do not skip silently.
- **Explain what a gate was protecting, not just how you got past it.** A red
  `spec:check`, a failing test, a lint error: each one exists because of a specific
  failure. Name it.
- **Report drift when you find it, unasked.** Spotting the gap between what a
  document claims and what the code does is the actual skill being learned. Finding
  one and staying silent teaches the opposite of it.
- **Show, don't lecture.** A worked example of the loop beats a description of the
  loop. Keep explanation proportional: a sentence at the decision, not an essay.
- **Reasoning belongs in the reply, not only in the commit message.** A commit
  message he reads later is not a conversation he can interrupt with a question.

Answer in Ukrainian; keep code, specs, commits and identifiers in English.

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
  It assumes the Rules of React, and `react-hook-form` breaks them: `register()`
  mutates form state during render, which the compiler is free to memoise away.
  The symptom is specific and easy to misread — the form works once, then every
  submit after a `reset()` validates as though the fields were empty. Any
  component built on `register()` needs `'use no memo'` as the first statement in
  its body **and** a test that submits twice; one submit passes either way. This
  was found the expensive way, and it will apply to the set-recording form.
- **Reset a form from an effect, not from the submit handler.** react-hook-form
  finalises its state after the handler resolves, so a `reset()` called inside is
  clobbered. Use `useEffect` on `formState.isSubmitSuccessful`.
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
  `main.tsx`, devtools, the QueryClient factory and `src/components/ui/**` are
  excluded and covered by Playwright instead. Do not "fix" a coverage failure by
  widening that list.
- **Playwright** uses its own downloaded browsers (`pnpm exec playwright install`).
  On an image that ships Chromium, point at it with
  `PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome pnpm e2e`.

## Testing

- Query by role, label and accessible name. `getByTestId` is for ordering
  assertions only — where a test must read items in DOM order — never as a
  substitute for a real accessible name.
- Name the requirement in the test title: `it('… (FR-004)')`, or on the `describe`
  when a whole block serves one requirement. `pnpm spec:check` greps for those
  ids and fails a shipped spec whose requirement no test names — but it cannot
  see the reverse, so a test with no id is a requirement nobody wrote down.
  `/analyze` is what catches that.
- `renderApp` from `src/test/utils` supplies the providers every feature needs.
  A feature that injects dependencies wraps it with its own provider rather than
  teaching `src/test/` about that feature.
- Never let a test touch persisted state left by another test. Inject an
  in-memory adapter instead of reaching for the real one.
- Never weaken a test to make it pass. A failing test is information.

## Conventions

- No default exports except where a framework demands one.
- `import type` for type-only imports (enforced).
- Comments explain _why_, not _what_. The code already says what.
- `src/features/` is empty. The first feature is `specs/002-workout-log/`, which
  is clarified and waiting on `/plan`.
