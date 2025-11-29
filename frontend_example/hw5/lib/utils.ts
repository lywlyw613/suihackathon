import { formatDistanceToNow } from 'date-fns'

export function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s`
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) {
    return `${diffInDays}d`
  }

  return formatDistanceToNow(date, { addSuffix: true })
}

// Extract YouTube video ID from URL
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  return null
}

// Check if URL is an image
export function isImageUrl(url: string): boolean {
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i
  return imageExtensions.test(url) || url.includes('imgur.com') || url.includes('i.imgur.com')
}

// Check if URL is a video
export function isVideoUrl(url: string): boolean {
  const videoExtensions = /\.(mp4|webm|ogg|mov|avi|wmv|flv)(\?.*)?$/i
  return videoExtensions.test(url)
}

// Check if URL is YouTube
export function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/.test(url)
}

export function detectLinks(text: string): string {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  return text.replace(urlRegex, (url) => {
    // Don't wrap YouTube, images, or videos - they'll be handled separately
    if (isYouTubeUrl(url) || isImageUrl(url) || isVideoUrl(url)) {
      return url
    }
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">${url}</a>`
  })
}

export function detectMentions(text: string): string {
  const mentionRegex = /@(\w+)/g
  return text.replace(mentionRegex, (match, username) => {
    return `<a href="/profile/${username}" class="text-blue-500 hover:underline">${match}</a>`
  })
}

export function detectHashtags(text: string): string {
  const hashtagRegex = /#(\w+)/g
  return text.replace(hashtagRegex, (match, tag) => {
    return `<a href="/hashtag/${tag}" class="text-blue-500 hover:underline">${match}</a>`
  })
}

export function processText(text: string): string {
  let processed = detectLinks(text)
  processed = detectMentions(processed)
  processed = detectHashtags(processed)
  return processed
}

// Process text for bio - converts all URLs (including YouTube) to clickable links
export function processBioText(text: string): string {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  let processed = text.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">${url}</a>`
  })
  processed = detectMentions(processed)
  processed = detectHashtags(processed)
  return processed
}

export function countCharacters(text: string): number {
  // Links count as 23 characters
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const links = text.match(urlRegex) || []
  const linkLength = links.reduce((sum, link) => sum + link.length, 0)
  const linkCount = links.length
  const textWithoutLinks = text.replace(urlRegex, '')
  
  // Hashtags and mentions don't count
  const hashtagRegex = /#\w+/g
  const mentionRegex = /@\w+/g
  const textWithoutSpecial = textWithoutLinks.replace(hashtagRegex, '').replace(mentionRegex, '')
  
  return textWithoutSpecial.length + (linkCount * 23)
}


