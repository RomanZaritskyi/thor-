import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">Thor</h1>
      <p className="max-w-prose text-muted-foreground">
        A workout log for training without a programme: pick whichever machine is free, see what you
        lifted on it last time, record today&rsquo;s sets.
      </p>
      <p className="max-w-prose text-sm text-muted-foreground">
        Nothing is built yet. The specification lives in <code>specs/002-workout-log/spec.md</code>;
        run <code>/plan</code> to design it.
      </p>
    </div>
  )
}
