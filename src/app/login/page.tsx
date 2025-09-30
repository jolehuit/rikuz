'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Google, Github } from '@lobehub/icons'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const signInWithGoogle = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/topics`,
        },
      })
      if (error) throw error
    } catch (error) {
      setMessage('Error signing in with Google')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const signInWithGitHub = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/topics`,
        },
      })
      if (error) throw error
    } catch (error) {
      setMessage('Error signing in with GitHub')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const signInWithMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/topics`,
        },
      })
      if (error) throw error
      setMessage('Check your email for the login link!')
    } catch (error) {
      setMessage('Error sending magic link')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const tryWithoutAccount = () => {
    router.push('/topics')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">Sign in to Rikuz</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Your personalized feed awaits</p>
        </div>

        {message && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
            {message}
          </div>
        )}

        <div className="space-y-4">
          {/* OAuth Buttons */}
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Google className="h-5 w-5" />
            Continue with Google
          </button>

          <button
            onClick={signInWithGitHub}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-gray-900 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            <Github className="h-5 w-5" />
            Continue with GitHub
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or</span>
            </div>
          </div>

          {/* Magic Link Form */}
          <form onSubmit={signInWithMagicLink} className="space-y-4">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>

          {/* Anonymous Mode */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={tryWithoutAccount}
              className="w-full text-center text-sm text-gray-600 hover:text-gray-900"
            >
              Try without account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
