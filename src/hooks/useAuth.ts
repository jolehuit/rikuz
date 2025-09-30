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
    let isMounted = true
    let subscription: { unsubscribe: () => void } | null = null

    const initialize = async () => {
      // Step 1: Check initial auth state FIRST, wait for it to complete
      console.log('[useAuth] getInitialUser called')
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        console.log('[useAuth] getUser result:', {
          user: !!user,
          userId: user?.id,
          error,
          isMounted,
        })

        if (!isMounted) {
          console.log('[useAuth] Component unmounted during getUser, aborting')
          return
        }

        setUser(user)

        // Check if in anonymous mode
        const anonymous = localStorage.getItem('anonymous') === 'true'
        setIsAnonymous(anonymous && !user)
        console.log('[useAuth] Initial state set:', {
          hasUser: !!user,
          isAnonymous: anonymous && !user,
        })
      } catch (error) {
        console.error('[useAuth] Error in getInitialUser:', error)
      } finally {
        if (isMounted) {
          console.log('[useAuth] Setting loading to false')
          setLoading(false)
        }
      }

      // Step 2: Only AFTER initial load completes, set up auth change listener
      if (!isMounted) {
        console.log('[useAuth] Component unmounted, skipping listener setup')
        return
      }

      console.log('[useAuth] Setting up auth state listener')
      const {
        data: { subscription: authSubscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[useAuth] Auth state changed:', event, {
          hasSession: !!session,
          userId: session?.user?.id,
          isMounted,
        })

        if (!isMounted) return

        setUser(session?.user || null)
        setIsAnonymous(false)

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

      subscription = authSubscription
    }

    initialize()

    return () => {
      console.log('[useAuth] useEffect cleanup')
      isMounted = false
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  return {
    user,
    loading,
    isAnonymous,
  }
}
