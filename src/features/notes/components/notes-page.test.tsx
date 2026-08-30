import { screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { buildNote, createTestRepository, renderApp } from '@/test/utils'

import type { Note } from '../model'
import { NotesPage } from './notes-page'

function Harness({ confirmDelete }: { confirmDelete?: (note: Note) => boolean }) {
  const [query, setQuery] = useState('')

  return <NotesPage query={query} onQueryChange={setQuery} confirmDelete={confirmDelete} />
}

/** Card titles in DOM order — the assertion target for ordering rules. */
function visibleTitles() {
  return screen.getAllByTestId('note-title').map((title) => title.textContent)
}

describe('<NotesPage />', () => {
  it('shows the empty state when there are no notes (FR-007)', async () => {
    renderApp(<Harness />)

    expect(await screen.findByText(/no notes yet/i)).toBeInTheDocument()
  })

  it('renders every stored note (FR-001)', async () => {
    const repository = createTestRepository([
      buildNote({ id: '11111111-1111-4111-8111-111111111111', title: 'First', body: 'one' }),
      buildNote({ id: '22222222-2222-4222-8222-222222222222', title: 'Second', body: 'two' }),
    ])
    renderApp(<Harness />, { repository })

    expect(await screen.findAllByTestId('note-card')).toHaveLength(2)
    expect(visibleTitles()).toEqual(expect.arrayContaining(['First', 'Second']))
    expect(screen.getByText('one')).toBeInTheDocument()
    expect(screen.getByText('two')).toBeInTheDocument()
  })

  it('creates a note from the form and clears the inputs (FR-003)', async () => {
    const { user } = renderApp(<Harness />)

    await user.type(await screen.findByLabelText('Title'), 'Buy milk')
    await user.type(screen.getByLabelText('Body'), '2 litres')
    await user.click(screen.getByRole('button', { name: 'Add note' }))

    expect(await screen.findByText('Buy milk')).toBeInTheDocument()
    expect(screen.getByText('2 litres')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('')
  })

  it('creates several notes in a row without losing form state (FR-003)', async () => {
    const { user } = renderApp(<Harness />)

    for (const title of ['First', 'Second']) {
      await user.type(await screen.findByLabelText('Title'), title)
      await user.click(screen.getByRole('button', { name: 'Add note' }))
      expect(await screen.findByText(title)).toBeInTheDocument()
    }

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('note-card')).toHaveLength(2)
  })

  it('blocks an empty title and reports it on the field (FR-003)', async () => {
    const repository = createTestRepository()
    const createSpy = vi.spyOn(repository, 'create')
    const { user } = renderApp(<Harness />, { repository })

    await user.click(await screen.findByRole('button', { name: 'Add note' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Title is required')
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true')
    expect(createSpy).not.toHaveBeenCalled()
  })

  it('filters the list as the query changes (FR-002)', async () => {
    const repository = createTestRepository([
      buildNote({ id: '11111111-1111-4111-8111-111111111111', title: 'Shopping' }),
      buildNote({ id: '22222222-2222-4222-8222-222222222222', title: 'Standup' }),
    ])
    const { user } = renderApp(<Harness />, { repository })

    expect(await screen.findAllByTestId('note-card')).toHaveLength(2)

    await user.type(screen.getByLabelText('Search'), 'shop')

    expect(await screen.findByText('Shopping')).toBeInTheDocument()
    expect(screen.queryByText('Standup')).not.toBeInTheDocument()
  })

  it('reports a query that matches nothing (FR-007)', async () => {
    const repository = createTestRepository([buildNote({ title: 'Shopping' })])
    const { user } = renderApp(<Harness />, { repository })

    await user.type(await screen.findByLabelText('Search'), 'zzz')

    expect(await screen.findByText(/no notes match/i)).toBeInTheDocument()
  })

  it('moves a pinned note to the top (FR-004)', async () => {
    const repository = createTestRepository([
      buildNote({
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Newer',
        updatedAt: '2026-02-01T00:00:00.000Z',
      }),
      buildNote({
        id: '22222222-2222-4222-8222-222222222222',
        title: 'Older',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    ])
    const { user } = renderApp(<Harness />, { repository })

    expect(await screen.findAllByTestId('note-card')).toHaveLength(2)
    expect(visibleTitles()).toEqual(['Newer', 'Older'])

    await user.click(screen.getByRole('button', { name: 'Pin Older' }))

    expect(await screen.findByRole('button', { name: 'Unpin Older' })).toBeInTheDocument()
    expect(visibleTitles()).toEqual(['Older', 'Newer'])
  })

  it('deletes only after the confirmation is accepted (FR-005)', async () => {
    const repository = createTestRepository([buildNote({ title: 'Disposable' })])
    const { user } = renderApp(<Harness confirmDelete={() => false} />, { repository })

    await user.click(await screen.findByRole('button', { name: 'Delete Disposable' }))

    expect(screen.getByText('Disposable')).toBeInTheDocument()
  })

  it('deletes the note when the confirmation is accepted (FR-005)', async () => {
    const repository = createTestRepository([buildNote({ title: 'Disposable' })])
    const { user } = renderApp(<Harness confirmDelete={() => true} />, { repository })

    await user.click(await screen.findByRole('button', { name: 'Delete Disposable' }))

    expect(await screen.findByText(/no notes yet/i)).toBeInTheDocument()
  })
})
