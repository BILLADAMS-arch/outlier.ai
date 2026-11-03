import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as promoApi from '../services/promo'

/** Public page behind the unsubscribe link in promotional emails. */
export default function Unsubscribe() {
  const [params] = useSearchParams()
  const u = params.get('u'), t = params.get('t')
  const [state, setState] = useState(u && t ? 'working' : 'invalid')
  useEffect(() => {
    if (!u || !t) return undefined
    let live = true
    promoApi.unsubscribe(u, t).then((ok) => live && setState(ok ? 'done' : 'invalid'), () => live && setState('error'))
    return () => { live = false }
  }, [u, t])
  return (
    <main className="unsub">
      <div className="unsub-card">
        <img src="/images/outlier.png" alt="Outlier" height="30" />
        {state === 'working' && <p>Updating your preference…</p>}
        {state === 'done' && <><h1>You are unsubscribed</h1><p>You will no longer receive promotional emails from Outlier. Account emails such as sign-in codes, approvals and earnings statements will still be sent. You can change this any time under Account.</p></>}
        {state === 'invalid' && <><h1>This link is not valid</h1><p>The unsubscribe link is incomplete or has been changed. Sign in and turn off promotional emails under Account instead.</p></>}
        {state === 'error' && <><h1>Something went wrong</h1><p>We could not update your preference. Please try again, or turn off promotional emails under Account.</p></>}
        <p><Link to="/login">Go to sign in</Link></p>
      </div>
    </main>
  )
}
