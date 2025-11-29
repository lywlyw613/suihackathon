'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface FollowButtonProps {
  targetUserId: string
  userID: string
}

export default function FollowButton({ targetUserId, userID }: FollowButtonProps) {
  const { data: session } = useSession()
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkFollowStatus()
  }, [targetUserId])

  const checkFollowStatus = async () => {
    if (!session) return

    try {
      const response = await fetch(`/api/users/${userID}/follow-status`)
      if (response.ok) {
        const data = await response.json()
        setIsFollowing(data.isFollowing)
      }
    } catch (error) {
      console.error('Error checking follow status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!session) return

    const wasFollowing = isFollowing
    setIsFollowing(!wasFollowing)

    try {
      const response = await fetch(`/api/users/${userID}/follow`, {
        method: wasFollowing ? 'DELETE' : 'POST',
      })

      if (!response.ok) {
        setIsFollowing(wasFollowing)
      }
    } catch (error) {
      console.error('Follow error:', error)
      setIsFollowing(wasFollowing)
    }
  }

  if (isLoading) {
    return (
      <div className="px-4 py-2 border border-gray-600 rounded-full font-bold bg-gray-900">
        Loading...
      </div>
    )
  }

  return (
    <button
      onClick={handleFollow}
      className={`px-4 py-2 rounded-full font-bold transition-colors ${
        isFollowing
          ? 'border border-gray-600 hover:bg-red-900/20 hover:border-red-500 hover:text-red-500'
          : 'bg-white text-black hover:bg-gray-200'
      }`}
    >
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  )
}



