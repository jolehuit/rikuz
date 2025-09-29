'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

export default function AnonymousBanner() {
  const { isAnonymous } = useAuth()
  const router = useRouter()

  if (!isAnonymous) return null

  const createAccount = () => {
    router.push('/login')
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm text-yellow-800">
              <strong>Anonymous Mode:</strong> Your data is stored locally and will be lost if you
              clear your browser.
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <button
            onClick={createAccount}
            className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-sm font-medium px-3 py-1 rounded-md transition-colors"
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  )
}
