import { Pin, PinOff, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import type { Note } from '../model'

export function NoteCard({
  note,
  onTogglePin,
  onDelete,
}: {
  note: Note
  onTogglePin: (note: Note) => void
  onDelete: (note: Note) => void
}) {
  return (
    <Card data-testid="note-card" data-pinned={note.pinned}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span data-testid="note-title">{note.title}</span>
          {note.pinned ? <Badge variant="secondary">Pinned</Badge> : null}
        </CardTitle>
        <CardAction className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={note.pinned ? `Unpin ${note.title}` : `Pin ${note.title}`}
            onClick={() => {
              onTogglePin(note)
            }}
          >
            {note.pinned ? <PinOff /> : <Pin />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${note.title}`}
            onClick={() => {
              onDelete(note)
            }}
          >
            <Trash2 />
          </Button>
        </CardAction>
      </CardHeader>
      {note.body === '' ? null : (
        <CardContent className="text-sm whitespace-pre-wrap text-muted-foreground">
          {note.body}
        </CardContent>
      )}
    </Card>
  )
}
