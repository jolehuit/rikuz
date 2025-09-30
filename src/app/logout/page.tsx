'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutPage() {
  const router = useRouter()
  const hasLoggedOut = useRef(false)

  useEffect(() => {
    if (hasLoggedOut.current) {
      console.log('[LOGOUT] Already logged out, skipping')
      return
    }

    hasLoggedOut.current = true

    const logout = async () => {
      console.log('[LOGOUT] Starting logout process')
      const supabase = createClient()

      try {
        // Clear anonymous mode first
        localStorage.removeItem('anonymous')
        console.log('[LOGOUT] Cleared localStorage')

        // Sign out from Supabase (with timeout)
        console.log('[LOGOUT] Calling signOut...')
        const signOutPromise = supabase.auth.signOut()
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 3000)
        )

        try {
          await Promise.race([signOutPromise, timeoutPromise])
          console.log('[LOGOUT] Successfully signed out from Supabase')
        } catch (timeoutError) {
          console.warn('[LOGOUT] SignOut timed out, proceeding with redirect anyway')
        }

        // Force hard redirect to clear all state
        console.log('[LOGOUT] Redirecting to /login with hard refresh')
        window.location.href = '/login'
      } catch (error) {
        console.error('[LOGOUT] Unexpected error during logout:', error)
        window.location.href = '/login'
      }
    }

    logout()
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <h2 className="text-xl font-semibold text-gray-900">Signing out...</h2>
        <p className="text-gray-600">Please wait while we sign you out.</p>
      </div>
    </div>
  )
}
