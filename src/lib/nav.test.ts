import { describe, expect, it } from 'vitest'

import { activeSection } from './nav'

describe('activeSection (FR-033)', () => {
  it('counts an open exercise as the exercises section', () => {
    // The reason this is a function at all: the router's own `activeProps`
    // cannot express "/ but also /exercise/x", so an open exercise would light
    // no tab at all.
    expect(activeSection('/')).toBe('exercises')
    expect(activeSection('/exercise/11111111-1111-4111-8111-111111111111')).toBe('exercises')
  })

  it('covers history, including one exercise inside it', () => {
    expect(activeSection('/history')).toBe('history')
    expect(activeSection('/history/11111111-1111-4111-8111-111111111111')).toBe('history')
  })

  it('covers data', () => {
    expect(activeSection('/data')).toBe('data')
  })

  it('matches whole segments, not prefixes', () => {
    expect(activeSection('/historyx')).toBeUndefined()
    expect(activeSection('/exercises')).toBeUndefined()
  })

  it('ignores a trailing slash', () => {
    expect(activeSection('/history/')).toBe('history')
    expect(activeSection('/data/')).toBe('data')
  })

  it('lights nothing on an address the app does not have', () => {
    expect(activeSection('/does-not-exist')).toBeUndefined()
  })
})
