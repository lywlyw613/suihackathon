import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const repost = await prisma.repost.create({
      data: {
        userId: session.user.id,
        postId: params.id,
      },
    })

    // Get updated repost count
    const repostCount = await prisma.repost.count({
      where: { postId: params.id },
    })

    // Get the post to find the author
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: { authorId: true },
    })

    // Get the user who reposted (for notification)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        userID: true,
        avatar: true,
        image: true,
      },
    })

    // Create notification if the post author is not the current user
    if (post && post.authorId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          type: 'repost',
          actorId: session.user.id,
          postId: params.id,
        },
      })

      // Trigger Pusher event for notification count update
      if (pusherServer) {
        await pusherServer.trigger(`user-${post.authorId}`, 'notification-updated', {})
      }
    }

    // Trigger Pusher event
    if (pusherServer) {
      await pusherServer.trigger(`post-${params.id}`, 'repost-updated', {
        repostCount,
        user: user ? {
          id: user.id,
          name: user.name,
          userID: user.userID,
          avatar: user.avatar || user.image,
        } : null,
      })
    }

    return NextResponse.json({ success: true, repostCount })
  } catch (error: any) {
    if (error.code === 'P2002') {
      // Already reposted
      return NextResponse.json({ error: 'Already reposted' }, { status: 409 })
    }
    console.error('Error reposting:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.repost.deleteMany({
      where: {
        userId: session.user.id,
        postId: params.id,
      },
    })

    // Get updated repost count
    const repostCount = await prisma.repost.count({
      where: { postId: params.id },
    })

    // Get the user who un-reposted (for notification)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        userID: true,
        avatar: true,
        image: true,
      },
    })

    // Trigger Pusher event
    if (pusherServer) {
      await pusherServer.trigger(`post-${params.id}`, 'repost-updated', {
        repostCount,
        user: user ? {
          id: user.id,
          name: user.name,
          userID: user.userID,
          avatar: user.avatar || user.image,
        } : null,
      })
    }

    return NextResponse.json({ success: true, repostCount })
  } catch (error) {
    console.error('Error un-reposting:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

