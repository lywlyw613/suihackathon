'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface ActivityUser {
  id: string
  name: string | null
  userID: string
  avatar: string | null
}

interface NewActivityNoticeProps {
  type: 'like' | 'comment'
  users: ActivityUser[]
  onDismiss?: () => void
}

export default function NewActivityNotice({ type, users, onDismiss }: NewActivityNoticeProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false)
      if (onDismiss) {
        setTimeout(onDismiss, 300) // Wait for fade-out animation
      }
    }, 5000)

    return () => clearTimeout(timer)
  }, [onDismiss])

  if (users.length === 0) return null

  // Show up to 3 users
  const displayUsers = users.slice(0, 3)
  const remainingCount = users.length - 3

  return (
    <div className={isVisible ? 'animate-fade-in' : 'animate-fade-out'}>
      <div className="bg-gray-900/95 border-b border-gray-800 px-4 py-3 flex items-center space-x-3 text-white">
        {/* Upward Arrow */}
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>

        {/* User Avatars */}
        <div className="flex items-center -space-x-2">
          {displayUsers.map((user, index) => (
            <div
              key={user.id}
              className="relative w-8 h-8 rounded-full border-2 border-gray-900 overflow-hidden"
              style={{ zIndex: displayUsers.length - index }}
            >
              {user.avatar ? (
                <Image
                  src={user.avatar}
                  alt={user.name || user.userID}
                  width={32}
                  height={32}
                  className="rounded-full"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center text-white text-xs">
                  {user.name?.[0] || user.userID[0] || 'U'}
                </div>
              )}
            </div>
          ))}
          {remainingCount > 0 && (
            <div className="w-8 h-8 rounded-full border-2 border-gray-900 bg-gray-800 flex items-center justify-center text-white text-xs font-bold">
              +{remainingCount}
            </div>
          )}
        </div>

        {/* Text */}
        <span className="text-sm text-gray-300">
          {type === 'like' ? 'liked' : 'replied'}
        </span>

        {/* Dismiss Button */}
        <button
          onClick={() => {
            setIsVisible(false)
            if (onDismiss) {
              setTimeout(onDismiss, 300)
            }
          }}
          className="ml-auto text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

