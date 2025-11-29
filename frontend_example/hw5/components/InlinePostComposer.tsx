'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { countCharacters } from '@/lib/utils'

interface InlinePostComposerProps {
  onPostCreated?: () => void
}

export default function InlinePostComposer({ onPostCreated }: InlinePostComposerProps) {
  const { data: session } = useSession()
  const [isExpanded, setIsExpanded] = useState(false)
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isExpanded])

  const charCount = countCharacters(content)
  const maxChars = 280
  const canPost = content.trim().length > 0 && charCount <= maxChars

  const handlePost = async () => {
    if (!canPost || isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (response.ok) {
        setContent('')
        setIsExpanded(false)
        // Don't reload page - Pusher will handle the new post notification
        // The user can click the notification to see the new post
      } else {
        alert('Failed to post. Please try again.')
      }
    } catch (error) {
      console.error('Post error:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!session) return null

  return (
    <div className="border-b border-gray-800 p-4">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full text-left text-gray-400 hover:text-gray-300 transition-colors"
        >
          What's happening?
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex space-x-4">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || 'User'}
                className="w-12 h-12 rounded-full"
                key={session.user.image} // Force re-render when image changes
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-white">
                {session.user.name?.[0] || 'U'}
              </div>
            )}
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => {
                  const newValue = e.target.value
                  // Check if adding this character would exceed the limit
                  const newCharCount = countCharacters(newValue)
                  if (newCharCount <= maxChars) {
                    setContent(newValue)
                  }
                }}
                placeholder="What's happening?"
                className="w-full bg-transparent text-white placeholder-gray-500 resize-none outline-none text-lg"
                rows={4}
              />
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-4 text-blue-500">
                  {/* Media icons can be added here */}
                </div>
                <div className="flex items-center space-x-4">
                  <span
                    className={`text-sm ${
                      charCount > maxChars ? 'text-red-500' : 'text-gray-400'
                    }`}
                  >
                    {charCount}/{maxChars}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setIsExpanded(false)
                        setContent('')
                      }}
                      className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePost}
                      disabled={!canPost || isSubmitting}
                      className="px-6 py-2 bg-blue-500 text-white rounded-full font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmitting ? 'Posting...' : 'Post'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


