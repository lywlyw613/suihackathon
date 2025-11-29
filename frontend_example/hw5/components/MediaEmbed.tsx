'use client'

import { useState } from 'react'
import { extractYouTubeId, isImageUrl, isVideoUrl, isYouTubeUrl } from '@/lib/utils'

interface MediaEmbedProps {
  url: string
}

export default function MediaEmbed({ url }: MediaEmbedProps) {
  const [imageError, setImageError] = useState(false)

  // YouTube embed
  if (isYouTubeUrl(url)) {
    const videoId = extractYouTubeId(url)
    if (videoId) {
      return (
        <div className="mt-4 rounded-lg overflow-hidden">
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )
    }
  }

  // Image embed
  if (isImageUrl(url) && !imageError) {
    return (
      <div className="mt-4 rounded-lg overflow-hidden">
        <img
          src={url}
          alt="Post image"
          className="w-full h-auto max-h-96 object-contain rounded-lg"
          onError={() => setImageError(true)}
          loading="lazy"
        />
      </div>
    )
  }

  // Video embed
  if (isVideoUrl(url)) {
    return (
      <div className="mt-4 rounded-lg overflow-hidden">
        <video
          src={url}
          controls
          className="w-full h-auto max-h-96 rounded-lg"
          preload="metadata"
        >
          Your browser does not support the video tag.
        </video>
      </div>
    )
  }

  return null
}


