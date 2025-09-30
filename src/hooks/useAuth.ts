'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/client'
const supabase = createClient()

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAnonymous, setIsAnonymous] = useState(false)

  useEffect(() => {
    console.log('[useAuth] useEffect mounted')

    // Check initial auth state
    const getInitialUser = async () => {
      console.log('[useAuth] getInitialUser called')
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        console.log('[useAuth] getUser result:', { user: !!user, userId: user?.id, error })

        setUser(user)

        // Check if in anonymous mode
        const anonymous = localStorage.getItem('anonymous') === 'true'
        setIsAnonymous(anonymous && !user)
        console.log('[useAuth] isAnonymous:', anonymous && !user)
      } catch (error) {
        console.error('[useAuth] Error in getInitialUser:', error)
      } finally {
        console.log('[useAuth] Setting loading to false')
        setLoading(false)
      }
    }

    getInitialUser()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[useAuth] Auth state changed:', event, {
        hasSession: !!session,
        userId: session?.user?.id,
      })
      setUser(session?.user || null)
      setIsAnonymous(false)
      setLoading(false)

      // Create user profile if signing in
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('[useAuth] Creating/updating user profile')
        await supabase
          .from('users')
          .upsert({
            id: session.user.id,
            email: session.user.email || '',
            updated_at: new Date().toISOString(),
          })
          .select()
      }
    })

    return () => {
      console.log('[useAuth] useEffect cleanup')
      subscription.unsubscribe()
    }
  }, [])

  return {
    user,
    loading,
    isAnonymous,
  }
}
