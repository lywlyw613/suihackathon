'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import EditProfileModal from './EditProfileModal'
import FollowButton from './FollowButton'
import FollowListModal from './FollowListModal'
import ImageModal from './ImageModal'
import { pusherClient } from '@/lib/pusher-client'
import { processBioText } from '@/lib/utils'

interface User {
  id: string
  name: string | null
  userID: string
  image: string | null
  avatar: string | null
  banner: string | null
  bio: string | null
  createdAt: string
  _count: {
    posts: number
    following: number
    followers: number
  }
}

interface ProfileHeaderProps {
  user: User
  isOwnProfile: boolean
  onUpdate: () => void
}

export default function ProfileHeader({ user, isOwnProfile, onUpdate }: ProfileHeaderProps) {
  const { data: session } = useSession()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showFollowModal, setShowFollowModal] = useState(false)
  const [followModalType, setFollowModalType] = useState<'followers' | 'following'>('followers')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedImageContent, setSelectedImageContent] = useState<string>('')
  const [followerCount, setFollowerCount] = useState(user._count.followers)
  const [followingCount, setFollowingCount] = useState(user._count.following)

  useEffect(() => {
    setFollowerCount(user._count.followers)
    setFollowingCount(user._count.following)
  }, [user._count.followers, user._count.following])

  useEffect(() => {
    // Subscribe to Pusher updates for followers/following
    if (pusherClient) {
      const channel = pusherClient.subscribe(`user-${user.userID}`)
      
      channel.bind('followers-updated', (data: { followerCount: number; followingCount: number }) => {
        setFollowerCount(data.followerCount)
        setFollowingCount(data.followingCount)
        onUpdate() // Refresh to update the modal if it's open
      })

      return () => {
        pusherClient?.unsubscribe(`user-${user.userID}`)
      }
    }
  }, [user.userID, onUpdate])

  return (
    <>
      <div className="relative">
        {/* Banner */}
        <div className="h-48 bg-gray-800 relative overflow-hidden">
          {user.banner ? (
            <div 
              className="relative w-full h-full cursor-pointer"
              onClick={() => {
                setSelectedImage(user.banner!)
                setSelectedImageContent('')
              }}
            >
              <Image
                src={user.banner}
                alt="Banner"
                fill
                className="object-cover"
              />
            </div>
          ) : null}
        </div>

        {/* Profile Picture - Left aligned, vertically centered at bottom of banner */}
        <div 
          className="absolute bottom-0 left-4 transform translate-y-1/2 cursor-pointer"
          onClick={() => {
            if (user.avatar || user.image) {
              setSelectedImage(user.avatar || user.image || '')
              setSelectedImageContent('')
            }
          }}
        >
          {user.avatar || user.image ? (
            <Image
              src={user.avatar || user.image || ''}
              alt={user.name || 'User'}
              width={128}
              height={128}
              className="rounded-full border-4 border-black"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gray-700 border-4 border-black flex items-center justify-center text-white text-4xl">
              {user.name?.[0] || 'U'}
            </div>
          )}
        </div>

        {/* Edit Profile / Follow Button */}
        <div className="absolute bottom-4 right-4 z-10">
          {isOwnProfile ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowEditModal(true)
              }}
              className="px-4 py-2 border border-gray-600 rounded-full font-bold hover:bg-gray-900 transition-colors"
            >
              Edit profile
            </button>
          ) : (
            session && <FollowButton targetUserId={user.id} userID={user.userID} />
          )}
        </div>
      </div>

      {/* User Info */}
      <div className="pt-20 px-4 pb-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">{user.name || 'Unknown'}</h1>
          <p className="text-gray-400">@{user.userID}</p>
        </div>

        {user.bio && (
          <div
            className="mb-4 text-white whitespace-pre-wrap break-words"
            dangerouslySetInnerHTML={{ __html: processBioText(user.bio) }}
          />
        )}

        <div className="flex space-x-4 text-sm text-gray-400">
          <button
            onClick={() => {
              setFollowModalType('following')
              setShowFollowModal(true)
            }}
            className="hover:underline transition-colors"
          >
            <span className="font-bold text-white">{followingCount}</span> Following
          </button>
          <button
            onClick={() => {
              setFollowModalType('followers')
              setShowFollowModal(true)
            }}
            className="hover:underline transition-colors"
          >
            <span className="font-bold text-white">{followerCount}</span> Followers
          </button>
        </div>
      </div>

      {showEditModal && (
        <EditProfileModal
          user={user}
          onClose={() => {
            setShowEditModal(false)
            onUpdate()
          }}
        />
      )}

      {showFollowModal && (
        <FollowListModal
          userID={user.userID}
          type={followModalType}
          onClose={() => {
            setShowFollowModal(false)
            onUpdate() // Refresh to update counts if needed
          }}
        />
      )}

      {/* Image Modal for Banner/Avatar */}
      {selectedImage && (
        <ImageModal
          imageUrl={selectedImage}
          postContent={selectedImageContent}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </>
  )
}


