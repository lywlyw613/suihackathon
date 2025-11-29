'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import PostCard from './PostCard'
import PostModal from './PostModal'
import InlinePostComposer from './InlinePostComposer'
import UpdateNotice from './UpdateNotice'
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

export default function Feed() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<'all' | 'following'>('all')
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [showPostModal, setShowPostModal] = useState(false)
  const [pendingPosts, setPendingPosts] = useState<Post[]>([])

  useEffect(() => {
    fetchPosts()
  }, [activeTab])

  useEffect(() => {
    // Subscribe to Pusher updates for new posts and deleted posts
    if (pusherClient) {
      const channel = pusherClient.subscribe('feed-updates')
      
      channel.bind('new-post', (data: { post: Post }) => {
        // Check if this post is from the current user
        const isOwnPost = session && data.post.author.id === session.user.id
        
        if (isOwnPost) {
          // If it's own post, add immediately without notification
          setPosts((prevPosts) => {
            // Check if post already exists to avoid duplicates
            if (prevPosts.some((p) => p.id === data.post.id)) {
              return prevPosts
            }
            return [data.post, ...prevPosts]
          })
          // Scroll to top to show the new post (use setTimeout to ensure DOM is updated)
          // Use requestAnimationFrame for smoother animation
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              window.scrollTo({ top: 0, behavior: 'smooth' })
            })
          })
        } else {
          // If it's from another user, save as pending and show notification
          setPendingPosts((prev) => {
            // Check if post already exists to avoid duplicates
            if (prev.some((p) => p.id === data.post.id)) {
              return prev
            }
            return [data.post, ...prev]
          })
        }
      })

      channel.bind('post-deleted', (data: { postId: string }) => {
        // Remove deleted post from the list
        setPosts((prevPosts) => prevPosts.filter((p) => p.id !== data.postId))
      })

      return () => {
        pusherClient?.unsubscribe('feed-updates')
      }
    }
  }, [session])

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/posts?tab=${activeTab}`)
      if (response.ok) {
        const data = await response.json()
        setPosts(data.posts || [])
        // Clear pending posts when manually refreshing
        setPendingPosts([])
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleShowNewPosts = () => {
    // Add pending posts to the beginning of the list
    setPosts((prevPosts) => {
      const newPosts = [...pendingPosts]
      // Filter out duplicates
      const existingIds = new Set(prevPosts.map((p) => p.id))
      const uniqueNewPosts = newPosts.filter((p) => !existingIds.has(p.id))
      return [...uniqueNewPosts, ...prevPosts]
    })
    // Clear pending posts
    setPendingPosts([])
    // Scroll to top with smooth animation
    // Use requestAnimationFrame for smoother animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })
    })
  }

  if (!session) return null

  return (
    <div className="max-w-2xl mx-auto md:border-x border-gray-800 min-h-screen">
      {/* New Posts Notice */}
      {pendingPosts.length > 0 && (
        <UpdateNotice
          message={`${pendingPosts.length} new post${pendingPosts.length > 1 ? 's' : ''}`}
          onClick={handleShowNewPosts}
          onDismiss={() => setPendingPosts([])}
        />
      )}
      
      {/* Header */}
      <div className="sticky top-[56px] md:top-0 bg-black/80 backdrop-blur-sm border-b border-gray-800 z-10">
        <div className="flex">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-3 md:py-4 px-4 text-center font-semibold transition-colors text-sm md:text-base ${
              activeTab === 'all'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:bg-gray-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-3 md:py-4 px-4 text-center font-semibold transition-colors text-sm md:text-base ${
              activeTab === 'following'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:bg-gray-900'
            }`}
          >
            Following
          </button>
        </div>
      </div>

      {/* Inline Post Composer */}
      <InlinePostComposer onPostCreated={fetchPosts} />

      {/* Posts */}
      {loading ? (
        <div className="p-4 md:p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-800 rounded"></div>
            <div className="h-32 bg-gray-800 rounded"></div>
            <div className="h-32 bg-gray-800 rounded"></div>
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div className="p-4 md:p-8 text-center text-gray-400 text-sm md:text-base">No posts yet. Be the first to post!</div>
      ) : (
        <div>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onUpdate={fetchPosts} />
          ))}
        </div>
      )}

      {showPostModal && (
        <PostModal
          onClose={() => setShowPostModal(false)}
          onPostCreated={fetchPosts}
        />
      )}
    </div>
  )
}

