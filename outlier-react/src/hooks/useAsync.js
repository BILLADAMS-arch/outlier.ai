import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Runs an async loader and returns { data, error, loading, reload }.
 * Reloads when `deps` change, when `reload()` is called, and (optionally) when the tab regains focus
 * so dashboards reflect changes made elsewhere.
 */
export function useAsync(loader, deps = [], { refreshOnFocus = false } = {}) {
  const key = JSON.stringify(deps)
  const [result, setResult] = useState({ key: null, data: null, error: null })
  const [tick, setTick] = useState(0)
  const loaderRef = useRef(loader)

  useEffect(() => {
    loaderRef.current = loader
  })

  useEffect(() => {
    let off = false
    loaderRef.current().then(
      (data) => !off && setResult({ key, data, error: null }),
      (error) => !off && setResult({ key, data: null, error }),
    )
    return () => {
      off = true
    }
  }, [key, tick])

  useEffect(() => {
    if (!refreshOnFocus) return undefined
    const onVisible = () => document.visibilityState === 'visible' && setTick((t) => t + 1)
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refreshOnFocus])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data: result.key === key ? result.data : null, error: result.key === key ? result.error : null, loading: result.key !== key, reload }
}
