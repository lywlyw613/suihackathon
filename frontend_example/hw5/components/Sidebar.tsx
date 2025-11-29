'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { pusherClient } from '@/lib/pusher-client'

export default function Sidebar() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [showLogout, setShowLogout] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      // Don't close if clicking on the logout button itself
      if (target instanceof Element) {
        const button = target.closest('button[type="button"]')
        if (button) {
          const buttonText = button.textContent?.trim()
          if (buttonText === 'Log out') {
            console.log('Click detected on logout button, not closing menu')
            return
          }
        }
      }
      if (menuRef.current && !menuRef.current.contains(target)) {
        setShowLogout(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch notification count
  useEffect(() => {
    if (session?.user?.id) {
      const fetchNotificationCount = async () => {
        try {
          const response = await fetch('/api/notifications/count')
          if (response.ok) {
            const data = await response.json()
            setNotificationCount(data.count || 0)
          }
        } catch (error) {
          console.error('Error fetching notification count:', error)
        }
      }

      fetchNotificationCount()

      // Subscribe to Pusher updates for notifications
      if (pusherClient) {
        const channel = pusherClient.subscribe(`user-${session.user.id}`)
        
        channel.bind('notification-updated', () => {
          fetchNotificationCount()
        })

        return () => {
          pusherClient?.unsubscribe(`user-${session.user.id}`)
        }
      }
    }
  }, [session])

  if (!session) {
    return null
  }

  const handleLogout = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    console.log('Logout button clicked')
    setShowLogout(false)
    try {
      console.log('Calling signOut...')
      const result = await signOut({ 
        callbackUrl: '/auth/signin',
        redirect: false 
      })
      console.log('signOut result:', result)
      // Wait a bit for session to clear
      await new Promise(resolve => setTimeout(resolve, 100))
      // Force a full page reload to clear all state
      console.log('Redirecting to signin...')
      window.location.href = '/auth/signin'
    } catch (error) {
      console.error('Logout error:', error)
      // Fallback: redirect anyway
      window.location.href = '/auth/signin'
    }
  }

  const menuItems = [
    { name: 'Home', href: '/', icon: 'home' },
    { name: 'Notifications', href: '/notifications', icon: 'notifications' },
    { name: 'Profile', href: `/profile/${session.user.userID}`, icon: 'profile' },
  ]

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname?.startsWith(href)
  }

  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-black border-r border-gray-800 flex-col">
        {/* Logo / Main Menu Icon */}
        <div className="p-4">
          <Link href="/" className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-gray-900 transition-colors">
            <svg
              viewBox="0 0 24 24"
              className="w-8 h-8 text-white"
              fill="currentColor"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-full transition-colors relative ${
                isActive(item.href)
                  ? 'bg-black text-white'
                  : 'text-gray-400 hover:bg-gray-900/50 hover:text-white'
              }`}
            >
              {item.icon === 'home' ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              ) : item.icon === 'notifications' ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
              <span className="text-lg font-medium">{item.name}</span>
              {item.name === 'Notifications' && notificationCount > 0 && (
                <span className="absolute right-4 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </Link>
          ))}

          {/* Post Button - Bright background */}
          <button
            onClick={() => router.push('/?post=true')}
            className="w-full mt-4 bg-white text-black rounded-full py-3 px-4 font-bold hover:bg-gray-200 transition-colors"
          >
            Post
          </button>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-800 relative" ref={menuRef}>
          <button
            onClick={() => setShowLogout(!showLogout)}
            className="w-full flex items-center space-x-3 p-3 rounded-full hover:bg-gray-900/50 transition-colors"
          >
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || 'User'}
                width={40}
                height={40}
                className="rounded-full"
                unoptimized
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white">
                {session.user.name?.[0] || 'U'}
              </div>
            )}
            <div className="flex-1 text-left">
              <div className="text-white font-medium">{session.user.name}</div>
              <div className="text-gray-400 text-sm">@{session.user.userID}</div>
            </div>
          </button>

          {showLogout && (
            <div className="absolute bottom-20 left-4 right-4 bg-gray-900 rounded-lg shadow-lg border border-gray-800 overflow-hidden z-50">
              <button
                onClick={(e) => {
                  console.log('Button clicked directly!', e)
                  e.preventDefault()
                  e.stopPropagation()
                  handleLogout(e)
                }}
                type="button"
                className="w-full px-4 py-3 text-left text-white hover:bg-gray-800 transition-colors cursor-pointer"
                style={{ pointerEvents: 'auto' }}
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation - Visible on mobile only */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 z-50">
        <nav className="flex items-center justify-around px-2 py-2">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors relative ${
                isActive(item.href)
                  ? 'text-white'
                  : 'text-gray-400'
              }`}
            >
              {item.icon === 'home' ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              ) : item.icon === 'notifications' ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
              {item.name === 'Notifications' && notificationCount > 0 && (
                <span className="absolute top-1 right-1 bg-blue-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
              <span className="text-xs mt-1">{item.name}</span>
            </Link>
          ))}
          
          {/* Mobile Post Button */}
          <button
            onClick={() => router.push('/?post=true')}
            className="flex items-center justify-center w-12 h-12 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </nav>
      </div>

      {/* Mobile Top Bar - For logo and user profile */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-black border-b border-gray-800 z-40 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <svg
            viewBox="0 0 24 24"
            className="w-8 h-8 text-white"
            fill="currentColor"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </Link>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowLogout(!showLogout)}
            className="flex items-center"
          >
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || 'User'}
                width={32}
                height={32}
                className="rounded-full"
                unoptimized
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm">
                {session.user.name?.[0] || 'U'}
              </div>
            )}
          </button>
          {showLogout && (
            <div className="absolute right-0 top-12 bg-gray-900 rounded-lg shadow-lg border border-gray-800 overflow-hidden min-w-[120px] z-50">
              <div className="px-4 py-2 border-b border-gray-800">
                <div className="text-white text-sm font-medium">{session.user.name}</div>
                <div className="text-gray-400 text-xs">@{session.user.userID}</div>
              </div>
              <button
                onClick={(e) => {
                  console.log('Mobile button clicked directly!', e)
                  e.preventDefault()
                  e.stopPropagation()
                  handleLogout(e)
                }}
                type="button"
                className="w-full px-4 py-3 text-left text-white hover:bg-gray-800 transition-colors text-sm cursor-pointer"
                style={{ pointerEvents: 'auto' }}
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}


