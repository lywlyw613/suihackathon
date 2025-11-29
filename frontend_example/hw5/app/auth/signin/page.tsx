'use client'

import { signIn, getSession } from 'next-auth/react'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [userID, setUserID] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState('')
  const [facebookAvailable, setFacebookAvailable] = useState(false)
  const [checkingUserID, setCheckingUserID] = useState(false)
  const [userIDExists, setUserIDExists] = useState<boolean | null>(null)
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  useEffect(() => {
    // Check if Facebook is available
    fetch('/api/auth/check-provider?provider=facebook')
      .then((res) => res.json())
      .then((data) => setFacebookAvailable(data.configured))
      .catch(() => setFacebookAvailable(false))
  }, [])

  useEffect(() => {
    getSession().then((session) => {
      if (session) {
        router.push(callbackUrl)
      }
    })
  }, [router, callbackUrl])

  const handleOAuthSignIn = async (provider: string) => {
    setError('')
    try {
      // Check if provider is configured
      if (provider === 'github') {
        const response = await fetch('/api/auth/check-provider?provider=github')
        const data = await response.json()
        if (!data.configured) {
          setError('GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env file.')
          return
        }
      }
      
      const result = await signIn(provider, {
        callbackUrl: '/auth/register',
        redirect: true,
      })
    } catch (err: any) {
      console.error('OAuth sign in error:', err)
      setError(err?.message || 'Failed to sign in. Please try again.')
    }
  }

  const checkUserID = async (userIDToCheck: string) => {
    if (!userIDToCheck.trim()) {
      setUserIDExists(null)
      return
    }

    setCheckingUserID(true)
    try {
      const response = await fetch('/api/auth/check-userid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID: userIDToCheck }),
      })

      const data = await response.json()
      setUserIDExists(data.exists)
    } catch (err) {
      console.error('Check userID error:', err)
      setUserIDExists(null)
    } finally {
      setCheckingUserID(false)
    }
  }

  useEffect(() => {
    // Debounce userID check
    if (userID.trim()) {
      const timeoutId = setTimeout(async () => {
        setCheckingUserID(true)
        try {
          const response = await fetch('/api/auth/check-userid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userID }),
          })
          const data = await response.json()
          setUserIDExists(data.exists)
        } catch (err) {
          console.error('Check userID error:', err)
          setUserIDExists(null)
        } finally {
          setCheckingUserID(false)
        }
      }, 500)
      return () => clearTimeout(timeoutId)
    } else {
      setUserIDExists(null)
    }
  }, [userID])

  const handleUserIDLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!userID.trim()) {
      setError('Please enter your userID')
      return
    }

    // Check if userID exists first
    if (userIDExists === null) {
      await checkUserID(userID)
      return
    }

    if (!userIDExists) {
      setError('This userID does not exist. Please sign in with Google or GitHub to create a new account.')
      return
    }

    try {
      // Direct login with userID (creates session directly)
      const response = await fetch('/api/auth/userid-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID }),
        credentials: 'include', // Important for cookies
      })

      const data = await response.json()

      if (response.ok) {
        // Session created, wait a bit for cookie to be set, then redirect
        // Use window.location to ensure full page reload and session refresh
        setTimeout(() => {
          window.location.href = callbackUrl || '/'
        }, 100)
      } else {
        setError(data.error || 'Invalid userID')
      }
    } catch (err: any) {
      console.error('UserID login error:', err)
      setError('Failed to sign in. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-md w-full space-y-8 p-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Sign in to X-Clone
          </h2>
        </div>
        <div className="mt-8 space-y-6">
          <form onSubmit={handleUserIDLogin} className="space-y-4">
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
                onChange={(e) => {
                  setUserID(e.target.value)
                  setUserIDExists(null)
                  setError('')
                }}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  userIDExists === false
                    ? 'border-red-500'
                    : userIDExists === true
                    ? 'border-green-500'
                    : 'border-gray-600'
                } placeholder-gray-400 text-white bg-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                placeholder="Enter your userID"
              />
              {checkingUserID && (
                <p className="mt-1 text-sm text-gray-400">Checking...</p>
              )}
              {userIDExists === true && !checkingUserID && (
                <p className="mt-1 text-sm text-green-500">✓ UserID exists</p>
              )}
              {userIDExists === false && !checkingUserID && (
                <p className="mt-1 text-sm text-gray-400">
                  This userID does not exist. Sign in with Google or GitHub to create a new account.
                </p>
              )}
            </div>
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            <button
              type="submit"
              disabled={checkingUserID || userIDExists === false}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkingUserID ? 'Checking...' : userIDExists === false ? 'UserID does not exist' : 'Sign in with UserID'}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-black text-gray-400">Or continue with</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleOAuthSignIn('google')}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </button>
            <button
              onClick={() => handleOAuthSignIn('github')}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              Sign in with GitHub
            </button>
            {facebookAvailable && (
              <button
                onClick={() => handleOAuthSignIn('facebook')}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Sign in with Facebook (Optional)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  )
}

