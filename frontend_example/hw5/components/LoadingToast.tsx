'use client'

export default function LoadingToast({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-lg px-4 py-3 flex items-center space-x-3 min-w-[200px]">
        <div className="flex-shrink-0">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
        </div>
        <span className="text-white text-sm font-medium">{message}</span>
      </div>
    </div>
  )
}

