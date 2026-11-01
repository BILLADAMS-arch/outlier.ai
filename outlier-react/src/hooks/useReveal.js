import { useEffect, useRef } from 'react'

/** Adds the "in" class to the element once it scrolls into view (pair with the .reveal CSS class). */
export function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (!('IntersectionObserver' in window)) { el.classList.add('in'); return undefined }
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { el.classList.add('in'); io.disconnect() } }, { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return ref
}
