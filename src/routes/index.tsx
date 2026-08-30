import { createFileRoute, Link } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  component: Home,
})

const stack = [
  ['React', '19 · React Compiler on'],
  ['Vite', '8 · Rolldown'],
  ['TypeScript', '6 · strict'],
  ['TanStack', 'Router + Query'],
  ['Tailwind', '4 · shadcn/ui'],
  ['Vitest + Playwright', 'unit + e2e'],
] as const

function Home() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Thor</h1>
        <p className="max-w-prose text-muted-foreground">
          A spec-driven React starter. Specs in <code>specs/</code> are the source of truth; code
          and tests are their implementation. Start with <code>specs/constitution.md</code>, then
          run <code>/specify</code>.
        </p>
      </header>

      <dl className="grid gap-3 sm:grid-cols-2">
        {stack.map(([name, detail]) => (
          <div key={name} className="rounded-lg border p-4">
            <dt className="font-medium">{name}</dt>
            <dd className="text-sm text-muted-foreground">{detail}</dd>
          </div>
        ))}
      </dl>

      <Button asChild>
        <Link to="/notes" search={{ q: '' }}>
          Open the reference feature
        </Link>
      </Button>
    </div>
  )
}
