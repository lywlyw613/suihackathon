'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import PostCard from '@/components/PostCard'
import PostModal from '@/components/PostModal'
import LoadingToast from '@/components/LoadingToast'
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
  parent?: Post
  _count: {
    likes: number
    reposts: number
    replies: number // Comments are implemented as replies
  }
}

export default function PostDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [showReplyModal, setShowReplyModal] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated' && session) {
      if (!session.user.userID) {
        router.push('/auth/register')
      } else {
        fetchPost()
      }
    }
  }, [status, session, router, postId])

  useEffect(() => {
    // Subscribe to Pusher updates for deleted posts
    if (pusherClient && postId) {
      const channel = pusherClient.subscribe('feed-updates')
      
      channel.bind('post-deleted', (data: { postId: string }) => {
        // If the main post or parent post was deleted, redirect to home
        if (data.postId === postId || data.postId === post?.parentId) {
          router.push('/')
        }
        // Remove deleted comment from the list
        setComments((prevComments) => prevComments.filter((c) => c.id !== data.postId))
      })

      return () => {
        pusherClient?.unsubscribe('feed-updates')
      }
    }
  }, [postId, post, router])

  const fetchPost = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}`)
      if (response.ok) {
        const data = await response.json()
        setPost(data.post)
        setComments(data.comments || [])
      } else if (response.status === 404) {
        router.push('/')
      }
    } catch (error) {
      console.error('Error fetching post:', error)
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

  if (!session || !session.user.userID || !post) {
    return null
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Sidebar />
      <div className="md:ml-64 pt-16 md:pt-0 pb-16 md:pb-0">
        <div className="max-w-2xl mx-auto md:border-x border-gray-800 min-h-screen">
          {/* Back Button */}
          <div className="sticky top-[56px] md:top-0 bg-black/80 backdrop-blur-sm border-b border-gray-800 z-10 p-3 md:p-4">
            <button
              onClick={() => {
                // If this post has a parent, go back to parent, otherwise go to home
                if (post.parentId) {
                  router.push(`/post/${post.parentId}`)
                } else {
                  router.push('/')
                }
              }}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>{post.parentId ? 'Post' : 'Back'}</span>
            </button>
          </div>

          {/* Main Post - Always show at the top, even if it's a comment */}
          <PostCard post={post} onUpdate={fetchPost} />

          {/* Reply Button */}
          <div className="p-4 border-b border-gray-800">
            <button
              onClick={() => setShowReplyModal(true)}
              className="w-full text-left px-4 py-2 border border-gray-700 rounded-full text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
            >
              Post your reply
            </button>
          </div>

          {/* Comments */}
          <div>
            {comments.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No replies yet. Be the first to reply!</div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="border-b border-gray-800">
                  <PostCard post={comment} onUpdate={fetchPost} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showReplyModal && (
        <PostModal
          onClose={() => {
            setShowReplyModal(false)
            fetchPost()
          }}
          replyToId={postId}
        />
      )}
    </div>
  )
}

