'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { countCharacters, processText } from '@/lib/utils'

interface PostModalProps {
  onClose: () => void
  initialContent?: string
  replyToId?: string
  onPostCreated?: () => void
}

export default function PostModal({ onClose, initialContent = '', replyToId, onPostCreated }: PostModalProps) {
  const { data: session } = useSession()
  const [content, setContent] = useState(initialContent)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [videos, setVideos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const initialContentRef = useRef<string>(initialContent)

  useEffect(() => {
    // Update initial content ref when initialContent prop changes
    initialContentRef.current = initialContent
    setContent(initialContent)
  }, [initialContent])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
      // Move cursor to end
      const len = content.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [])

  const charCount = countCharacters(content)
  const maxChars = 280
  const canPost = content.trim().length > 0 && charCount <= maxChars

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        if (file.type.startsWith('video/')) {
          setVideos([...videos, data.url])
        } else {
          setImages([...images, data.url])
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const removeVideo = (index: number) => {
    setVideos(videos.filter((_, i) => i !== index))
  }

  const handlePost = async () => {
    if (!canPost || isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          parentId: replyToId,
          images: images.length > 0 ? images : undefined,
          videos: videos.length > 0 ? videos : undefined,
        }),
      })

      if (response.ok) {
        // Clear content and media
        setContent('')
        setImages([])
        setVideos([])
        
        // Show success toast
        setShowSuccessToast(true)
        
        // Close modal after a short delay
        setTimeout(() => {
          onClose()
          setShowSuccessToast(false)
        }, 1500)
        
        if (onPostCreated) {
          onPostCreated()
        }
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

  const handleClose = () => {
    // Don't show confirmation if we're showing success toast (post was just created)
    if (showSuccessToast) {
      return
    }
    // Show confirmation if there's any content or media
    if (content.trim().length > 0 || images.length > 0 || videos.length > 0) {
      setShowDiscardConfirm(true)
    } else {
      onClose()
    }
  }

  const handleSaveDraft = async () => {
    try {
      await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      onClose()
    } catch (error) {
      console.error('Save draft error:', error)
    }
  }

  const handleDiscard = () => {
    setShowDiscardConfirm(false)
    onClose()
  }

  if (!session) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-black rounded-2xl w-full max-w-2xl border border-gray-800">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              onClick={() => {
                onClose()
                window.location.href = '/?drafts=true'
              }}
              className="text-blue-500 hover:text-blue-400 transition-colors"
            >
              Drafts
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
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
                  rows={6}
                />
                {/* Media Preview */}
                {(images.length > 0 || videos.length > 0) && (
                  <div className="mt-4 space-y-2">
                    {images.map((url, index) => (
                      <div key={index} className="relative inline-block">
                        <img
                          src={url}
                          alt={`Upload ${index + 1}`}
                          className="max-h-64 rounded-lg"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 rounded-full p-1"
                        >
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {videos.map((url, index) => (
                      <div key={index} className="relative inline-block">
                        <video src={url} controls className="max-h-64 rounded-lg" />
                        <button
                          onClick={() => removeVideo(index)}
                          className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 rounded-full p-1"
                        >
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-blue-500">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="hover:bg-blue-500/10 rounded-full p-2 transition-colors disabled:opacity-50"
                      title="Upload media"
                    >
                      {uploading ? (
                        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span
                      className={`text-sm ${
                        charCount > maxChars ? 'text-red-500' : 'text-gray-400'
                      }`}
                    >
                      {charCount}/{maxChars}
                    </span>
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
      </div>

      {/* Discard Confirmation */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-black rounded-2xl w-full max-w-md border border-gray-800 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Save draft?</h3>
            <p className="text-gray-400 mb-6">
              You have unsaved changes. Would you like to save as draft or discard?
            </p>
            <div className="flex space-x-4">
              <button
                onClick={handleSaveDraft}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-full font-bold hover:bg-blue-600 transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleDiscard}
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-full font-bold hover:bg-gray-700 transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[70] animate-fade-in">
          <div className="bg-green-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-semibold">Post published successfully!</span>
          </div>
        </div>
      )}
    </>
  )
}

