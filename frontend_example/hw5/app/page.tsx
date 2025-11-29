'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import Sidebar from '@/components/Sidebar'
import PostModal from '@/components/PostModal'
import Feed from '@/components/Feed'
import LoadingToast from '@/components/LoadingToast'
import DraftsModal from '@/components/DraftsModal'
import { useSearchParams } from 'next/navigation'

function HomeContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPostModal, setShowPostModal] = useState(false)
  const [showDraftsModal, setShowDraftsModal] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated' && session) {
      if (!session.user.userID) {
        router.push('/auth/register')
      } else {
        // Check if we should show post modal or drafts modal
        const shouldShowPost = searchParams.get('post') === 'true'
        const shouldShowDrafts = searchParams.get('drafts') === 'true'
        setShowPostModal(shouldShowPost)
        setShowDraftsModal(shouldShowDrafts)
      }
    }
  }, [status, session, router, searchParams])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black text-white">
        <LoadingToast />
        <Sidebar />
        <div className="md:ml-64 pt-16 md:pt-0 pb-16 md:pb-0">
          <div className="max-w-2xl mx-auto border-x border-gray-800 min-h-screen">
            <div className="p-4 md:p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-800 rounded w-3/4"></div>
                <div className="h-4 bg-gray-800 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!session || !session.user.userID) {
    return null
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Sidebar />
      <div className="md:ml-64 pt-16 md:pt-0 pb-16 md:pb-0">
        <Feed />
      </div>
      {showPostModal && (
        <PostModal
          onClose={() => {
            setShowPostModal(false)
            router.push('/')
          }}
        />
      )}
      {showDraftsModal && (
        <DraftsModal
          onClose={() => {
            setShowDraftsModal(false)
            router.push('/')
          }}
        />
      )}
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white">
        <LoadingToast />
        <Sidebar />
        <div className="md:ml-64 pt-16 md:pt-0 pb-16 md:pb-0">
          <div className="max-w-2xl mx-auto border-x border-gray-800 min-h-screen">
            <div className="p-4 md:p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-800 rounded w-3/4"></div>
                <div className="h-4 bg-gray-800 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}

