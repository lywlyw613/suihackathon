import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all notifications for the user, ordered by most recent first
    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            userID: true,
            avatar: true,
            image: true,
          },
        },
        post: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                name: true,
                userID: true,
                avatar: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to 50 most recent notifications
    })

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Mark all notifications as read
    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        read: false,
      },
      data: {
        read: true,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking notifications as read:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

