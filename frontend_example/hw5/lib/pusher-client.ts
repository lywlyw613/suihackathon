'use client'

import Pusher from 'pusher-js'

let pusherClient: Pusher | null = null

if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_PUSHER_KEY) {
  pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
  })
}

export { pusherClient }

