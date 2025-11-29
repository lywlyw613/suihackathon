import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get session token from cookie
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('next-auth.session-token')?.value || 
                        cookieStore.get('__Secure-next-auth.session-token')?.value

    if (!sessionToken) {
      return NextResponse.json({ error: 'Session token not found' }, { status: 400 })
    }

    // Update session expires time (30 minutes from now)
    const newExpires = new Date(Date.now() + 30 * 60 * 1000)
    
    // Update the session by sessionToken
    const updated = await prisma.session.updateMany({
      where: {
        sessionToken: sessionToken,
        userId: session.user.id, // Extra security check
      },
      data: {
        expires: newExpires,
      },
    })

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, expires: newExpires })
  } catch (error) {
    console.error('Error updating session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

