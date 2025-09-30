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
    // Check initial auth state
    const getInitialUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)

      // Check if in anonymous mode
      const anonymous = localStorage.getItem('anonymous') === 'true'
      setIsAnonymous(anonymous && !user)

      setLoading(false)
    }

    getInitialUser()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null)
      setIsAnonymous(false)
      setLoading(false)

      // Create user profile if signing in
      if (event === 'SIGNED_IN' && session?.user) {
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
      subscription.unsubscribe()
    }
  }, [])

  return {
    user,
    loading,
    isAnonymous,
  }
}
