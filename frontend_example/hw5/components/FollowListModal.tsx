'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import FollowButton from './FollowButton'

interface User {
  id: string
  name: string | null
  userID: string
  image: string | null
  bio: string | null
}

interface FollowListModalProps {
  userID: string
  type: 'followers' | 'following'
  onClose: () => void
}

export default function FollowListModal({ userID, type, onClose }: FollowListModalProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [userID, type])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/users/${userID}/${type}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(type === 'followers' ? data.followers : data.following)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-black rounded-2xl w-full max-w-2xl border border-gray-800 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white capitalize">{type}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-16 bg-gray-800 rounded"></div>
                <div className="h-16 bg-gray-800 rounded"></div>
                <div className="h-16 bg-gray-800 rounded"></div>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No {type} yet.
            </div>
          ) : (
            <div>
              {users.map((user) => (
                <div
                  key={user.id}
                  className="p-4 border-b border-gray-800 hover:bg-gray-900/50 transition-colors cursor-pointer"
                  onClick={() => {
                    router.push(`/profile/${user.userID}`)
                    onClose()
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      {user.image ? (
                        <Image
                          src={user.image}
                          alt={user.name || 'User'}
                          width={48}
                          height={48}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-white">
                          {user.name?.[0] || 'U'}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="font-bold text-white">{user.name || 'Unknown'}</div>
                        <div className="text-gray-400 text-sm">@{user.userID}</div>
                        {user.bio && (
                          <div className="text-gray-400 text-sm mt-1">{user.bio}</div>
                        )}
                      </div>
                    </div>
                    {session && session.user.userID !== user.userID && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <FollowButton targetUserId={user.id} userID={user.userID} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

