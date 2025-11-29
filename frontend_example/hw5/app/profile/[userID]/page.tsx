'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import ProfileHeader from '@/components/ProfileHeader'
import ProfileTabs from '@/components/ProfileTabs'
import LoadingToast from '@/components/LoadingToast'

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

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const userID = params.userID as string
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'posts' | 'reposts' | 'likes'>('posts')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated' && session) {
      if (!session.user.userID) {
        router.push('/auth/register')
      } else {
        fetchUser()
      }
    }
  }, [status, session, router, userID])

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/users/${userID}`)
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else if (response.status === 404) {
        router.push('/')
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <LoadingToast />
        <Sidebar />
        <div className="md:ml-64 pt-16 md:pt-0 pb-16 md:pb-0">
          <div className="max-w-2xl mx-auto md:border-x border-gray-800 min-h-screen">
            <div className="p-4 md:p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-32 bg-gray-800 rounded"></div>
                <div className="h-24 bg-gray-800 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!session || !session.user.userID || !user) {
    return null
  }

  const isOwnProfile = session.user.userID === userID

  return (
    <div className="min-h-screen bg-black text-white">
      <Sidebar />
      <div className="md:ml-64 pt-16 md:pt-0 pb-16 md:pb-0">
        <div className="max-w-2xl mx-auto md:border-x border-gray-800 min-h-screen">
          {/* Back Button */}
          <div className="sticky top-[56px] md:top-0 bg-black/80 backdrop-blur-sm border-b border-gray-800 z-10 p-3 md:p-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Home</span>
            </button>
          </div>
          <ProfileHeader
            user={user}
            isOwnProfile={isOwnProfile}
            onUpdate={fetchUser}
          />
          <ProfileTabs
            userID={userID}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isOwnProfile={isOwnProfile}
          />
        </div>
      </div>
    </div>
  )
}

