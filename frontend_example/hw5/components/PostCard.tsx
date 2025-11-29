'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatTimeAgo, processText, extractYouTubeId, isImageUrl, isVideoUrl, isYouTubeUrl } from '@/lib/utils'
import Image from 'next/image'
import { pusherClient } from '@/lib/pusher-client'
import MediaEmbed from './MediaEmbed'
import ImageModal from './ImageModal'
import NewActivityNotice from './NewActivityNotice'
import UpdateNotice from './UpdateNotice'

interface Post {
  id: string
  content: string
  images?: string[]
  videos?: string[]
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

interface PostCardProps {
  post: Post
  onUpdate?: () => void
}

export default function PostCard({ post, onUpdate }: PostCardProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [isLiked, setIsLiked] = useState(false)
  const [isReposted, setIsReposted] = useState(false)
  const [likeCount, setLikeCount] = useState(post._count.likes)
  const [repostCount, setRepostCount] = useState(post._count.reposts)
  const [commentCount, setCommentCount] = useState(post._count.replies) // Comments are replies
  const [showMenu, setShowMenu] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [likeUsers, setLikeUsers] = useState<Array<{ id: string; name: string | null; userID: string; avatar: string | null }>>([])
  const [commentUsers, setCommentUsers] = useState<Array<{ id: string; name: string | null; userID: string; avatar: string | null }>>([])
  const [pendingLikeCount, setPendingLikeCount] = useState<number | null>(null)
  const [pendingCommentCount, setPendingCommentCount] = useState<number | null>(null)
  const [pendingRepostCount, setPendingRepostCount] = useState<number | null>(null)

  useEffect(() => {
    if (session) {
      setIsLiked(post.likes.some((like) => like.userId === session.user.id))
      setIsReposted(post.reposts.some((repost) => repost.userId === session.user.id))
    }

    // Subscribe to Pusher updates
    if (pusherClient) {
      const channel = pusherClient.subscribe(`post-${post.id}`)
      
      channel.bind('like-updated', (data: { likeCount: number; user?: { id: string; name: string | null; userID: string; avatar: string | null } | null }) => {
        // Check if this is from current user's own action
        const isOwnAction = data.user && session && data.user.id === session.user.id
        
        if (isOwnAction) {
          // If it's own action, update immediately without notification
          setLikeCount(data.likeCount)
          setPendingLikeCount(null)
        } else {
          // If it's from another user, save as pending and show notification
          setPendingLikeCount(data.likeCount)
          if (data.user && session && data.user.id !== session.user.id) {
            setLikeUsers((prev) => {
              // Avoid duplicates
              if (prev.some((u) => u.id === data.user!.id)) {
                return prev
              }
              return [data.user!, ...prev].slice(0, 10) // Keep last 10 users
            })
          }
        }
      })

      channel.bind('repost-updated', (data: { repostCount: number; user?: { id: string; name: string | null; userID: string; avatar: string | null } | null }) => {
        // Check if this is from current user's own action
        const isOwnAction = data.user && session && data.user.id === session.user.id
        
        if (isOwnAction) {
          // If it's own action, update immediately without notification
          setRepostCount(data.repostCount)
          setPendingRepostCount(null)
        } else {
          // If it's from another user, save as pending
          setPendingRepostCount(data.repostCount)
        }
      })

      channel.bind('comment-updated', (data: { commentCount: number; user?: { id: string; name: string | null; userID: string; avatar: string | null } | null }) => {
        // Check if this is from current user's own action
        const isOwnAction = data.user && session && data.user.id === session.user.id
        
        if (isOwnAction) {
          // If it's own action, update immediately without notification
          setCommentCount(data.commentCount)
          setPendingCommentCount(null)
        } else {
          // If it's from another user, save as pending and show notification
          setPendingCommentCount(data.commentCount)
          if (data.user && session && data.user.id !== session.user.id) {
            setCommentUsers((prev) => {
              // Avoid duplicates
              if (prev.some((u) => u.id === data.user!.id)) {
                return prev
              }
              return [data.user!, ...prev].slice(0, 10) // Keep last 10 users
            })
          }
        }
      })

      return () => {
        pusherClient?.unsubscribe(`post-${post.id}`)
      }
    }
  }, [session, post])

  const handleLike = async () => {
    if (!session) return

    const wasLiked = isLiked
    setIsLiked(!wasLiked)
    // Don't update count immediately - wait for Pusher event
    // This allows the notification system to work properly

    try {
      const response = await fetch(`/api/posts/${post.id}/like`, {
        method: wasLiked ? 'DELETE' : 'POST',
      })

      if (!response.ok) {
        // Revert on error
        setIsLiked(wasLiked)
      }
      // Don't call onUpdate() to avoid unnecessary re-renders
      // The Pusher event will handle the count update
    } catch (error) {
      console.error('Like error:', error)
      setIsLiked(wasLiked)
    }
  }

  const handleRepost = async () => {
    if (!session) return

    const wasReposted = isReposted
    setIsReposted(!wasReposted)
    // Don't update count immediately - wait for Pusher event

    try {
      const response = await fetch(`/api/posts/${post.id}/repost`, {
        method: wasReposted ? 'DELETE' : 'POST',
      })

      if (!response.ok) {
        setIsReposted(wasReposted)
      }
      // Don't call onUpdate() to avoid unnecessary re-renders
      // The Pusher event will handle the count update
    } catch (error) {
      console.error('Repost error:', error)
      setIsReposted(wasReposted)
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setShowDeleteConfirm(false)
        setShowMenu(false)
        // Don't call onUpdate() - Pusher will handle the deletion notification
        // The post will be removed via Pusher event in Feed/ProfileTabs
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete post')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('An error occurred while deleting the post')
    }
  }

  const handleDeleteClick = () => {
    setShowMenu(false)
    setShowDeleteConfirm(true)
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
  }

  const handleUpdateCounts = () => {
    // Update all pending counts
    if (pendingLikeCount !== null) {
      setLikeCount(pendingLikeCount)
      setPendingLikeCount(null)
    }
    if (pendingCommentCount !== null) {
      setCommentCount(pendingCommentCount)
      setPendingCommentCount(null)
    }
    if (pendingRepostCount !== null) {
      setRepostCount(pendingRepostCount)
      setPendingRepostCount(null)
    }
    // Clear activity notices
    setLikeUsers([])
    setCommentUsers([])
    // Scroll to top of this post
    const element = document.getElementById(`post-${post.id}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const hasPendingUpdates = pendingLikeCount !== null || pendingCommentCount !== null || pendingRepostCount !== null

  const isOwnPost = session?.user.id === post.author.id

  return (
    <div id={`post-${post.id}`} className="border-b border-gray-800 hover:bg-gray-900/50 transition-colors">
      {/* Update Notice */}
      {hasPendingUpdates && (
        <UpdateNotice
          message="Show updates"
          onClick={handleUpdateCounts}
          onDismiss={() => {
            setPendingLikeCount(null)
            setPendingCommentCount(null)
            setPendingRepostCount(null)
            setLikeUsers([])
            setCommentUsers([])
          }}
        />
      )}
      
      {/* New Activity Notices */}
      {likeUsers.length > 0 && (
        <NewActivityNotice
          type="like"
          users={likeUsers}
          onDismiss={() => setLikeUsers([])}
        />
      )}
      {commentUsers.length > 0 && (
        <NewActivityNotice
          type="comment"
          users={commentUsers}
          onDismiss={() => setCommentUsers([])}
        />
      )}

      <div className="p-4">
        <div className="flex space-x-3">
        {/* Avatar */}
        <Link href={`/profile/${post.author.userID}`}>
          {post.author.avatar || post.author.image ? (
            <Image
              src={post.author.avatar || post.author.image || ''}
              alt={post.author.name || 'User'}
              width={48}
              height={48}
              className="rounded-full cursor-pointer"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-white cursor-pointer">
              {post.author.name?.[0] || 'U'}
            </div>
          )}
        </Link>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <Link href={`/profile/${post.author.userID}`}>
                <span className="font-bold text-white hover:underline">
                  {post.author.name || 'Unknown'}
                </span>
              </Link>
              <Link href={`/profile/${post.author.userID}`}>
                <span className="text-gray-400 hover:underline">
                  @{post.author.userID}
                </span>
              </Link>
              <span className="text-gray-400">·</span>
              <span className="text-gray-400">{formatTimeAgo(new Date(post.createdAt))}</span>
            </div>
            {isOwnPost && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-lg shadow-lg border border-gray-800 overflow-hidden z-10">
                    <button
                      onClick={handleDeleteClick}
                      className="w-full px-4 py-2 text-left text-red-500 hover:bg-gray-800 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Post Content */}
          <div className="mt-2 text-white whitespace-pre-wrap">
            <div dangerouslySetInnerHTML={{ __html: processText(post.content) }} />
            
            {/* Display uploaded images */}
            {post.images && post.images.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg overflow-hidden">
                {post.images.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Post image ${index + 1}`}
                    className="w-full h-auto max-h-96 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    loading="lazy"
                    onClick={() => setSelectedImage(url)}
                  />
                ))}
              </div>
            )}

            {/* Display uploaded videos */}
            {post.videos && post.videos.length > 0 && (
              <div className="mt-4 space-y-2">
                {post.videos.map((url, index) => (
                  <video
                    key={index}
                    src={url}
                    controls
                    className="w-full h-auto max-h-96 rounded-lg"
                    preload="metadata"
                  >
                    Your browser does not support the video tag.
                  </video>
                ))}
              </div>
            )}
            
            {/* Extract and display media embeds from links */}
            {(() => {
              const urlRegex = /(https?:\/\/[^\s]+)/g
              const urls = post.content.match(urlRegex) || []
              const mediaUrls = urls.filter(url => 
                isYouTubeUrl(url) || isImageUrl(url) || isVideoUrl(url)
              )
              
              return (
                <div>
                  {mediaUrls.map((url, index) => (
                    <MediaEmbed key={`${url}-${index}`} url={url} />
                  ))}
                </div>
              )
            })()}
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center justify-between text-gray-400">
            <button
              onClick={() => router.push(`/post/${post.id}`)}
              className="flex items-center space-x-2 hover:text-blue-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{commentCount}</span>
            </button>

            <button
              onClick={handleRepost}
              className={`flex items-center space-x-2 transition-colors ${
                isReposted ? 'text-green-500' : 'hover:text-green-500'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{repostCount}</span>
            </button>

            <button
              onClick={handleLike}
              className={`flex items-center space-x-2 transition-colors ${
                isLiked ? 'text-red-500' : 'hover:text-red-500'
              }`}
            >
              <svg
                className="w-5 h-5"
                fill={isLiked ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>{likeCount}</span>
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <ImageModal
          imageUrl={selectedImage}
          postContent={post.content}
          onClose={() => setSelectedImage(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-black rounded-2xl w-full max-w-md border border-gray-800 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Delete post?</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete this post? This action cannot be undone.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-full font-bold hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-full font-bold hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

