import { useEffect, useRef, useState } from 'react'

/** True once there has been no keyboard, mouse, touch or scroll activity for `minutes` (only while `enabled`). */
export function useIdle(minutes, enabled) {
  const [idle, setIdle] = useState(false)
  const last = useRef(0)
  useEffect(() => {
    if (!enabled) return undefined
    last.current = Date.now()
    const bump = () => { last.current = Date.now(); setIdle(false) }
    const events = ['mousemove', 'keydown', 'pointerdown', 'scroll', 'touchstart']
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }))
    const id = setInterval(() => { if (Date.now() - last.current > minutes * 60000) setIdle(true) }, 15000)
    return () => { events.forEach((e) => window.removeEventListener(e, bump)); clearInterval(id) }
  }, [minutes, enabled])
  return enabled && idle
}
