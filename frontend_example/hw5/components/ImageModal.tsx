'use client'

import { useEffect } from 'react'
import { processText } from '@/lib/utils'

interface ImageModalProps {
  imageUrl: string
  postContent: string
  onClose: () => void
}

export default function ImageModal({ imageUrl, postContent, onClose }: ImageModalProps) {
  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 text-white hover:text-gray-300 transition-colors z-10"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Content */}
      <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Image */}
        <div className="mb-4">
          <img
            src={imageUrl}
            alt="Post image"
            className="w-full h-auto rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Post Content */}
        {postContent && (
          <div
            className="text-white whitespace-pre-wrap break-words"
            dangerouslySetInnerHTML={{ __html: processText(postContent) }}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
    </div>
  )
}


