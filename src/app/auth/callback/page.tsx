'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get session from URL hash
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Auth callback error:', error)
          router.push('/login?error=auth_error')
          return
        }

        if (data.session?.user) {
          // Create or update user profile
          const { error: profileError } = await supabase
            .from('users')
            .upsert({
              id: data.session.user.id,
              email: data.session.user.email || '',
              updated_at: new Date().toISOString(),
            })
            .select()

          if (profileError) {
            console.error('Error creating user profile:', profileError)
          }

          // Redirect to topics page
          router.push('/topics')
        } else {
          router.push('/login?error=no_session')
        }
      } catch (error) {
        console.error('Unexpected error:', error)
        router.push('/login?error=unexpected')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  )
}
