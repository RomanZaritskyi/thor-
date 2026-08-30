import { describe, expect, it } from 'vitest'

import { cn } from './utils'

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b')
  })

  it('lets a later Tailwind class win over an earlier one in the same group', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('keeps classes from different groups', () => {
    expect(cn('px-2', 'py-4')).toBe('px-2 py-4')
  })
})
