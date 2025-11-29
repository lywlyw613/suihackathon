'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { signOut } from 'next-auth/react'
import LoadingToast from '@/components/LoadingToast'

function RegisterContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [userID, setUserID] = useState('')
  const [error, setError] = useState('')
  const [regKey, setRegKey] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated' && session?.user?.userID) {
      // If user already has userID, redirect to home
      router.push('/')
    }
  }, [status, session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    if (!userID.trim()) {
      setError('UserID is required')
      setIsSubmitting(false)
      return
    }

    // Validate userID format (alphanumeric, 3-20 characters)
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(userID)) {
      setError('UserID must be 3-20 characters and contain only letters, numbers, and underscores')
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID, regKey }),
      })

      const data = await response.json()

      if (response.ok) {
        // Sign out and sign back in to refresh session
        await signOut({ redirect: false })
        router.push('/auth/signin?callbackUrl=/')
      } else {
        setError(data.error || 'Registration failed')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <LoadingToast />
        <div className="max-w-md w-full space-y-8 p-8 opacity-50">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
              Complete Your Registration
            </h2>
            <p className="mt-2 text-center text-sm text-gray-400">
              Choose a unique userID for your account
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const handleGoBack = async () => {
    // Sign out and go back to sign in page
    await signOut({ redirect: false })
    router.push('/auth/signin')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-md w-full space-y-8 p-8">
        {/* Back Button */}
        <div className="flex items-center">
          <button
            onClick={handleGoBack}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Sign In</span>
          </button>
        </div>

        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Complete Your Registration
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Choose a unique userID for your account
          </p>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="userID" className="block text-sm font-medium text-gray-300">
                UserID
              </label>
              <input
                id="userID"
                name="userID"
                type="text"
                required
                value={userID}
                onChange={(e) => setUserID(e.target.value.toLowerCase())}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., john_doe123"
                pattern="[a-zA-Z0-9_]{3,20}"
              />
              <p className="mt-1 text-xs text-gray-500">
                3-20 characters, letters, numbers, and underscores only
              </p>
            </div>
            {process.env.NEXT_PUBLIC_REQUIRE_REG_KEY === 'true' && (
              <div>
                <label htmlFor="regKey" className="block text-sm font-medium text-gray-300">
                  Registration Key (optional)
                </label>
                <input
                  id="regKey"
                  name="regKey"
                  type="text"
                  value={regKey}
                  onChange={(e) => setRegKey(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter registration key if required"
                />
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-red-900/50 p-4">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Registering...' : 'Complete Registration'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <LoadingToast />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  )
}

