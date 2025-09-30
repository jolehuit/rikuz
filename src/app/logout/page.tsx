'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    const logout = async () => {
      console.log('[LOGOUT] Starting logout process')
      const supabase = createClient()

      try {
        // Sign out from Supabase
        const { error } = await supabase.auth.signOut()

        if (error) {
          console.error('[LOGOUT] Error signing out:', error)
        } else {
          console.log('[LOGOUT] Successfully signed out from Supabase')
        }

        // Clear anonymous mode
        localStorage.removeItem('anonymous')
        console.log('[LOGOUT] Cleared localStorage')

        // Redirect to login
        console.log('[LOGOUT] Redirecting to /login')
        router.push('/login')
      } catch (error) {
        console.error('[LOGOUT] Unexpected error during logout:', error)
        router.push('/login')
      }
    }

    logout()
  }, [router])

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
