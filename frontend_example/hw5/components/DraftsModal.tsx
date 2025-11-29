'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import PostModal from './PostModal'

interface Draft {
  id: string
  content: string
  createdAt: string
  updatedAt: string
}

interface DraftsModalProps {
  onClose: () => void
}

export default function DraftsModal({ onClose }: DraftsModalProps) {
  const { data: session } = useSession()
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null)
  const [showPostModal, setShowPostModal] = useState(false)
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null)

  useEffect(() => {
    fetchDrafts()
  }, [])

  const fetchDrafts = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/drafts')
      if (response.ok) {
        const data = await response.json()
        setDrafts(data.drafts || [])
      }
    } catch (error) {
      console.error('Error fetching drafts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDraft = async (draftId: string, showConfirm: boolean = true) => {
    if (showConfirm) {
      setDraftToDelete(draftId)
      return
    }

    try {
      const response = await fetch(`/api/drafts/${draftId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        fetchDrafts()
      }
    } catch (error) {
      console.error('Error deleting draft:', error)
    }
  }

  const confirmDelete = async () => {
    if (draftToDelete) {
      try {
        const response = await fetch(`/api/drafts/${draftToDelete}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          fetchDrafts()
        }
      } catch (error) {
        console.error('Error deleting draft:', error)
      }
      setDraftToDelete(null)
    }
  }

  const cancelDelete = () => {
    setDraftToDelete(null)
  }

  const handleUseDraft = (draft: Draft) => {
    setSelectedDraft(draft)
    setShowPostModal(true)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60))
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60))
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
      }
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return `${days} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  if (!session) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-black rounded-2xl w-full max-w-2xl border border-gray-800 max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h2 className="text-xl font-bold text-white">Drafts</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8">
                <div className="animate-pulse space-y-4">
                  <div className="h-24 bg-gray-800 rounded"></div>
                  <div className="h-24 bg-gray-800 rounded"></div>
                  <div className="h-24 bg-gray-800 rounded"></div>
                </div>
              </div>
            ) : drafts.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No drafts yet. Start writing to save drafts!
              </div>
            ) : (
              <div>
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="p-4 border-b border-gray-800 hover:bg-gray-900/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-white mb-2 whitespace-pre-wrap break-words">
                          {draft.content}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {formatDate(draft.updatedAt)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleUseDraft(draft)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-full font-bold hover:bg-blue-600 transition-colors text-sm"
                        >
                          Use
                        </button>
                        <button
                          onClick={() => handleDeleteDraft(draft.id, true)}
                          className="px-4 py-2 bg-gray-800 text-white rounded-full font-bold hover:bg-gray-700 transition-colors text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showPostModal && selectedDraft && (
        <PostModal
          onClose={() => {
            setShowPostModal(false)
            const draftId = selectedDraft.id
            setSelectedDraft(null)
            // Delete the draft after using it (no confirmation)
            handleDeleteDraft(draftId, false)
            onClose()
          }}
          initialContent={selectedDraft.content}
          onPostCreated={() => {
            setShowPostModal(false)
            const draftId = selectedDraft.id
            setSelectedDraft(null)
            // Delete the draft after posting (no confirmation)
            handleDeleteDraft(draftId, false)
            onClose()
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {draftToDelete && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-black rounded-2xl w-full max-w-md border border-gray-800 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Delete draft?</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete this draft? This action cannot be undone.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-full font-bold hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-full font-bold hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

