'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import LoadingToast from '@/components/LoadingToast'
import Link from 'next/link'
import Image from 'next/image'
import { formatTimeAgo } from '@/lib/utils'

interface Notification {
  id: string
  type: 'like' | 'repost' | 'comment'
  createdAt: string
  read: boolean
  actor: {
    id: string
    name: string | null
    userID: string
    avatar: string | null
    image: string | null
  }
  post: {
    id: string
    content: string
    createdAt: string
    author: {
      id: string
      name: string | null
      userID: string
      avatar: string | null
      image: string | null
    }
  }
}

export default function NotificationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated' && session) {
      if (!session.user.userID) {
        router.push('/auth/register')
      } else {
        fetchNotifications()
        // Mark all as read when viewing
        markAsRead()
      }
    }
  }, [status, session, router])

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
      })
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
  }

  const getNotificationText = (notification: Notification) => {
    const actorName = notification.actor.name || notification.actor.userID
    switch (notification.type) {
      case 'like':
        return `${actorName} liked your post`
      case 'repost':
        return `${actorName} reposted your post`
      case 'comment':
        return `${actorName} commented on your post`
      default:
        return 'New notification'
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
                <div className="h-32 bg-gray-800 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!session || !session.user.userID) {
    return null
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Sidebar />
      <div className="md:ml-64 pt-16 md:pt-0 pb-16 md:pb-0">
        <div className="max-w-2xl mx-auto md:border-x border-gray-800 min-h-screen">
          {/* Header */}
          <div className="sticky top-[56px] md:top-0 bg-black/80 backdrop-blur-sm border-b border-gray-800 z-10 p-3 md:p-4">
            <h1 className="text-xl font-bold">Notifications</h1>
          </div>

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No notifications yet.</div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={`/post/${notification.post.id}`}
                  className={`block border-b border-gray-800 p-4 hover:bg-gray-900/50 transition-colors ${
                    !notification.read ? 'bg-gray-900/30' : ''
                  }`}
                >
                  <div className="flex space-x-3">
                    {/* Actor Avatar */}
                    <div className="flex-shrink-0">
                      {notification.actor.avatar || notification.actor.image ? (
                        <Image
                          src={notification.actor.avatar || notification.actor.image || ''}
                          alt={notification.actor.name || 'User'}
                          width={48}
                          height={48}
                          className="rounded-full"
                          unoptimized
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-white">
                          {notification.actor.name?.[0] || notification.actor.userID[0] || 'U'}
                        </div>
                      )}
                    </div>

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-white font-medium">
                          {getNotificationText(notification)}
                        </span>
                        <span className="text-gray-400 text-sm">
                          {formatTimeAgo(new Date(notification.createdAt))}
                        </span>
                      </div>

                      {/* Post Preview */}
                      <div className="text-gray-400 text-sm line-clamp-2">
                        {notification.post.content}
                      </div>
                    </div>

                    {/* Unread Indicator */}
                    {!notification.read && (
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

