'use client'

interface UpdateNoticeProps {
  message: string
  onClick: () => void
  onDismiss?: () => void
}

export default function UpdateNotice({ message, onClick, onDismiss }: UpdateNoticeProps) {
  return (
    <div className="sticky top-0 z-50 bg-blue-500 hover:bg-blue-600 transition-colors cursor-pointer" onClick={onClick}>
      <div className="px-4 py-3 flex items-center justify-between text-white">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
          <span className="font-semibold">{message}</span>
        </div>
        {onDismiss && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDismiss()
            }}
            className="text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

