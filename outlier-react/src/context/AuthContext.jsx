/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import * as authService from '../services/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = still restoring the saved session
  const [loaded, setLoaded] = useState({ userId: null, profile: null, error: null })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id ?? null
  const refreshProfile = useCallback(async () => {
    if (!userId) return
    try {
      const profile = await authService.getProfile(userId)
      setLoaded({ userId, profile, error: profile ? null : new Error('Your profile could not be found.') })
    } catch (error) {
      setLoaded({ userId, profile: null, error })
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return undefined
    let off = false
    authService.getProfile(userId).then(
      (profile) => !off && setLoaded({ userId, profile, error: profile ? null : new Error('Your profile could not be found.') }),
      (error) => !off && setLoaded({ userId, profile: null, error }),
    )
    return () => { off = true }
  }, [userId])

  const value = useMemo(() => {
    const restoring = session === undefined
    const profileReady = !userId || loaded.userId === userId
    return {
      session,
      user: session?.user ?? null,
      profile: loaded.userId === userId ? loaded.profile : null,
      profileError: loaded.userId === userId ? loaded.error : null,
      loading: restoring || !profileReady,
      isAdmin: loaded.userId === userId && loaded.profile?.role === 'admin',
      isApproved: loaded.userId === userId && loaded.profile?.accountStatus === 'approved',
      refreshProfile,
      signIn: authService.signIn,
      signUp: authService.signUp,
      signOut: authService.signOut,
    }
  }, [session, userId, loaded, refreshProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export const useAuth = () => useContext(AuthContext)
