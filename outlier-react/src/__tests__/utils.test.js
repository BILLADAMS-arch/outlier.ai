import { describe, expect, it } from 'vitest'
import { earningsFor, hms, hoursLabel, money } from '../utils/format'
import { abaValid, emailOk, nameProblem, passwordProblem } from '../utils/validation'
import { computeStats } from '../utils/stats'
import { segmentSeconds, sumSegments } from '../utils/time'
import { projectStatusFor } from '../utils/status'
import { unsplashId } from '../utils/images'

describe('earnings', () => {
  it('is approved hours x hourly rate ($20 x 3h = $60)', () => {
    expect(earningsFor(3 * 3600, 20)).toBe(60)
  })
  it('rounds to cents and ignores empty time', () => {
    expect(earningsFor(4.5 * 3600, 75)).toBe(337.5)
    expect(earningsFor(1, 20)).toBe(0.01)
    expect(earningsFor(0, 99)).toBe(0)
  })
  it('formats', () => {
    expect(money(60)).toBe('$60.00')
    expect(hms(3725)).toBe('01:02:05')
    expect(hms(-5)).toBe('00:00:00')
    expect(hoursLabel(5400)).toBe('1.50 h')
  })
})

describe('validation', () => {
  it('checks US routing numbers with the ABA checksum', () => {
    expect(abaValid('021000021')).toBe(true)
    expect(abaValid('123456789')).toBe(false)
    expect(abaValid('12345')).toBe(false)
  })
  it('validates email, password and full name', () => {
    expect(emailOk('a@b.co')).toBe(true)
    expect(emailOk('nope')).toBe(false)
    expect(passwordProblem('short1')).not.toBe('')
    expect(passwordProblem('longenough')).not.toBe('')
    expect(passwordProblem('longenough1')).toBe('')
    expect(nameProblem('Ada')).not.toBe('')
    expect(nameProblem('Ada Lovelace')).toBe('')
  })
  it('only accepts Unsplash photo URLs', () => {
    expect(unsplashId('https://images.unsplash.com/photo-123abc?w=1')).toBe('photo-123abc')
    expect(unsplashId('https://example.com/photo-1')).toBeNull()
  })
})

describe('dashboard statistics', () => {
  it('starts at zero for a new account', () => {
    expect(computeStats([], [])).toEqual({ totalEarnings: 0, tasksCompleted: 0, avgPerWeek: 0 })
  })
  it('counts completed projects, sums non-rejected payments and averages per week', () => {
    const now = Date.parse('2026-03-01T00:00:00Z')
    const created = new Date(now - 14 * 86400000).toISOString() // two weeks ago
    const assignments = [{ status: 'completed', createdAt: created }, { status: 'completed', createdAt: created }, { status: 'in_progress', createdAt: created }]
    const payments = [{ amount: 60, status: 'paid' }, { amount: 40.5, status: 'pending' }, { amount: 999, status: 'rejected' }]
    expect(computeStats(assignments, payments, now)).toEqual({ totalEarnings: 100.5, tasksCompleted: 2, avgPerWeek: 1 })
  })
})

describe('timer segments', () => {
  const t0 = Date.parse('2026-01-01T10:00:00Z')
  it('counts closed segments and excludes gaps between them (paused time)', () => {
    const segs = [{ startedAt: new Date(t0).toISOString(), endedAt: new Date(t0 + 3600e3).toISOString() }, { startedAt: new Date(t0 + 2 * 3600e3).toISOString(), endedAt: new Date(t0 + 2.5 * 3600e3).toISOString() }]
    expect(sumSegments(segs, t0 + 10 * 3600e3)).toBe(5400)
  })
  it('counts a running segment up to now but never more than 12 hours', () => {
    const seg = { startedAt: new Date(t0).toISOString(), endedAt: null }
    expect(segmentSeconds(seg, t0 + 90e3)).toBe(90)
    expect(segmentSeconds(seg, t0 + 30 * 3600e3)).toBe(12 * 3600)
  })
})

describe('project status for a tasker', () => {
  it('prefers the assignment, then the application, else available', () => {
    expect(projectStatusFor('t1', [{ taskId: 't1', status: 'in_progress' }], [])).toBe('in_progress')
    expect(projectStatusFor('t1', [], [{ taskId: 't1', status: 'submitted' }])).toBe('applied')
    expect(projectStatusFor('t1', [], [{ taskId: 't1', status: 'rejected' }])).toBe('declined')
    expect(projectStatusFor('t1', [], [{ taskId: 't1', status: 'withdrawn' }])).toBe('available')
    expect(projectStatusFor('t2', [], [])).toBe('available')
  })
})
