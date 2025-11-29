'use client'

import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'

interface User {
  id: string
  name: string | null
  userID: string
  image: string | null
  avatar: string | null
  banner: string | null
  bio: string | null
}

interface EditProfileModalProps {
  user: User
  onClose: () => void
}

export default function EditProfileModal({ user, onClose }: EditProfileModalProps) {
  const { data: session, update } = useSession()
  const [bio, setBio] = useState(user.bio || '')
  const [avatar, setAvatar] = useState(user.avatar || user.image || '')
  const [banner, setBanner] = useState(user.banner || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setAvatar(data.url)
      } else {
        const error = await response.json()
        alert(error.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleBannerUpload = async (file: File) => {
    setUploadingBanner(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setBanner(data.url)
      } else {
        const error = await response.json()
        alert(error.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setUploadingBanner(false)
    }
  }

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleAvatarUpload(file)
    }
    if (avatarInputRef.current) {
      avatarInputRef.current.value = ''
    }
  }

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleBannerUpload(file)
    }
    if (bannerInputRef.current) {
      bannerInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/users/${user.userID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio, avatar, banner }),
      })

      if (response.ok) {
        // Update session to reflect new avatar
        await update()
        onClose()
      } else {
        alert('Failed to update profile')
      }
    } catch (error) {
      console.error('Update error:', error)
      alert('An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-black rounded-2xl w-full max-w-2xl border border-gray-800">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Edit profile</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Banner Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Banner Image
              </label>
              <div className="relative">
                <div className="h-32 bg-gray-800 rounded-lg overflow-hidden">
                  {banner ? (
                    <Image
                      src={banner}
                      alt="Banner"
                      fill
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={uploadingBanner}
                  className="absolute bottom-2 right-2 px-4 py-2 bg-black/70 hover:bg-black/90 rounded-full font-bold text-white disabled:opacity-50 transition-colors"
                >
                  {uploadingBanner ? 'Uploading...' : banner ? 'Change Banner' : 'Upload Banner'}
                </button>
              </div>
            </div>

            {/* Avatar Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Avatar
              </label>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  {avatar ? (
                    <Image
                      src={avatar}
                      alt="Avatar"
                      width={80}
                      height={80}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-white text-2xl">
                      {user.name?.[0] || 'U'}
                    </div>
                  )}
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="px-4 py-2 border border-gray-600 rounded-full font-bold hover:bg-gray-900 transition-colors disabled:opacity-50"
                >
                  {uploadingAvatar ? 'Uploading...' : avatar ? 'Change Avatar' : 'Upload Avatar'}
                </button>
              </div>
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-2">
                Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white resize-none"
                rows={4}
                maxLength={160}
                placeholder="Tell us about yourself"
              />
              <p className="mt-1 text-xs text-gray-400">{bio.length}/160</p>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-600 rounded-full font-bold hover:bg-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-white text-black rounded-full font-bold hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}


