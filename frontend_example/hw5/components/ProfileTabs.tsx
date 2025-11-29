'use client'

import { useState, useEffect } from 'react'
import PostCard from './PostCard'
import { pusherClient } from '@/lib/pusher-client'

interface Post {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    name: string | null
    userID: string
    image: string | null
    avatar: string | null
  }
  likes: { userId: string }[]
  reposts: { userId: string }[]
  comments: { id: string }[]
  parentId: string | null
  _count: {
    likes: number
    reposts: number
    replies: number // Comments are implemented as replies
  }
}

interface ProfileTabsProps {
  userID: string
  activeTab: 'posts' | 'reposts' | 'likes'
  onTabChange: (tab: 'posts' | 'reposts' | 'likes') => void
  isOwnProfile: boolean
}

export default function ProfileTabs({ userID, activeTab, onTabChange, isOwnProfile }: ProfileTabsProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPosts()
  }, [userID, activeTab])

  useEffect(() => {
    // Subscribe to Pusher updates for deleted posts
    if (pusherClient) {
      const channel = pusherClient.subscribe('feed-updates')
      
      channel.bind('post-deleted', (data: { postId: string }) => {
        // Remove deleted post from the list
        setPosts((prevPosts) => prevPosts.filter((p) => p.id !== data.postId))
      })

      return () => {
        pusherClient?.unsubscribe('feed-updates')
      }
    }
  }, [])

  const fetchPosts = async () => {
    setLoading(true)
    try {
      let endpoint = `/api/users/${userID}/posts`
      if (activeTab === 'likes') {
        endpoint = `/api/users/${userID}/likes`
      } else if (activeTab === 'reposts') {
        endpoint = `/api/users/${userID}/reposts`
      }
      const response = await fetch(endpoint)
      if (response.ok) {
        const data = await response.json()
        setPosts(data.posts || [])
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => onTabChange('posts')}
          className={`flex-1 py-4 text-center font-semibold transition-colors ${
            activeTab === 'posts'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:bg-gray-900'
          }`}
        >
          Posts
        </button>
        <button
          onClick={() => onTabChange('reposts')}
          className={`flex-1 py-4 text-center font-semibold transition-colors ${
            activeTab === 'reposts'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:bg-gray-900'
          }`}
        >
          Reposts
        </button>
        {isOwnProfile && (
          <button
            onClick={() => onTabChange('likes')}
            className={`flex-1 py-4 text-center font-semibold transition-colors ${
              activeTab === 'likes'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:bg-gray-900'
            }`}
          >
            Likes
          </button>
        )}
      </div>

      {/* Content */}
      {activeTab === 'likes' && (
        <div className="p-4 border-b border-gray-800 bg-blue-900/20">
          <div className="flex items-center space-x-2 text-blue-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M5 12a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Your likes are private. Only you can see them.</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-800 rounded"></div>
            <div className="h-32 bg-gray-800 rounded"></div>
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          {activeTab === 'likes' 
            ? 'No liked posts yet.' 
            : activeTab === 'reposts'
            ? 'No reposts yet.'
            : 'No posts yet.'}
        </div>
      ) : (
        <div>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onUpdate={fetchPosts} />
          ))}
        </div>
      )}
    </div>
  )
}

