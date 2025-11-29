'use client'

import { useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'keydown']
const UPDATE_INTERVAL = 2 * 60 * 1000 // Update session every 2 minutes if user is active
const IDLE_TIMEOUT = 30 * 60 * 1000 // 30 minutes of inactivity

export function useActivityTracker() {
  const { data: session, status } = useSession()
  const lastUpdateRef = useRef<number>(0)
  const lastActivityRef = useRef<number>(Date.now())
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (status !== 'authenticated' || !session) {
      // Clear intervals if not authenticated
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
        updateIntervalRef.current = null
      }
      return
    }

    const updateSession = async () => {
      try {
        const response = await fetch('/api/auth/update-session', {
          method: 'POST',
          credentials: 'include',
        })
        if (response.ok) {
          lastUpdateRef.current = Date.now()
          lastActivityRef.current = Date.now()
        }
      } catch (error) {
        console.error('Failed to update session:', error)
      }
    }

    const checkIdleTimeout = () => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current
      if (timeSinceLastActivity >= IDLE_TIMEOUT) {
        // Session expired due to inactivity, sign out
        signOut({ callbackUrl: '/auth/signin' })
      }
    }

    const handleActivity = () => {
      lastActivityRef.current = Date.now()
      
      // Reset idle timeout on activity
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      // Set new timeout to check for idle
      timeoutRef.current = setTimeout(checkIdleTimeout, IDLE_TIMEOUT)
    }

    // Add event listeners
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    // Initial session update
    updateSession()

    // Set up periodic session updates (every 2 minutes if user is active)
    updateIntervalRef.current = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current
      // Only update if user has been active in the last 5 minutes
      if (timeSinceLastActivity < 5 * 60 * 1000) {
        updateSession()
      }
    }, UPDATE_INTERVAL)

    // Set initial idle timeout
    timeoutRef.current = setTimeout(checkIdleTimeout, IDLE_TIMEOUT)

    // Cleanup
    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
    }
  }, [session, status])
}

