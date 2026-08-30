import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { selectVisibleNotes, type Note } from '../model'
import { useCreateNote, useDeleteNote, useNotes, useSetNotePinned } from '../queries'
import { NoteCard } from './note-card'
import { NoteForm } from './note-form'

export function NotesPage({
  query,
  onQueryChange,
  confirmDelete = (note: Note) => window.confirm(`Delete “${note.title}”?`),
}: {
  query: string
  onQueryChange: (query: string) => void
  confirmDelete?: (note: Note) => boolean
}) {
  const notes = useNotes()
  const createNote = useCreateNote()
  const setPinned = useSetNotePinned()
  const deleteNote = useDeleteNote()

  // No useMemo: the React Compiler memoizes this automatically (vite.config.ts).
  const visible = selectVisibleNotes(notes.data ?? [], query)
  const hasNotes = (notes.data ?? []).length > 0

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
        <p className="text-sm text-muted-foreground">
          Reference feature — every rule below traces to <code>specs/001-notes/spec.md</code>.
        </p>
      </header>

      <NoteForm
        isSubmitting={createNote.isPending}
        onSubmit={(draft) => createNote.mutateAsync(draft)}
      />

      <div className="space-y-2">
        <Label htmlFor="note-search">Search</Label>
        <Input
          id="note-search"
          type="search"
          placeholder="Filter by title or body"
          value={query}
          onChange={(event) => {
            onQueryChange(event.target.value)
          }}
        />
      </div>

      {notes.isPending ? (
        <p className="text-sm text-muted-foreground">Loading notes…</p>
      ) : notes.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load notes.
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {hasNotes ? `No notes match “${query}”.` : 'No notes yet. Add your first one above.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((note) => (
            <li key={note.id}>
              <NoteCard
                note={note}
                onTogglePin={(target) => {
                  setPinned.mutate({ id: target.id, pinned: !target.pinned })
                }}
                onDelete={(target) => {
                  if (confirmDelete(target)) deleteNote.mutate(target.id)
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
