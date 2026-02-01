import { describe, it, expect } from 'vitest'

import { formatDate } from '@/utils/formatters'

describe('formatDate', () => {
  it('formata YYYY-MM-DD sem depender de timezone', () => {
    expect(formatDate('2026-01-28')).toBe('28/01/2026')
  })

  it('preserva o dia para strings com espaços', () => {
    expect(formatDate(' 2026-12-05 ')).toBe('05/12/2026')
  })
})

