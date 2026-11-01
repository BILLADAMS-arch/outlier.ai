const CAP_MS = 12 * 3600 * 1000 // matches the database: one segment counts for at most 12 hours

/** Seconds a segment counts for, as of `now` (ms). Mirrors the database calculation. */
export function segmentSeconds(seg, now = Date.now()) {
  const start = +new Date(seg.startedAt)
  const end = seg.endedAt ? +new Date(seg.endedAt) : now
  return Math.max(0, Math.floor((Math.min(end, start + CAP_MS) - start) / 1000))
}
export const sumSegments = (segs, now) => segs.reduce((t, s) => t + segmentSeconds(s, now), 0)
