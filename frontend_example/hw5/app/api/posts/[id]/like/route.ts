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

    const like = await prisma.like.create({
      data: {
        userId: session.user.id,
        postId: params.id,
      },
    })

    // Get updated like count
    const likeCount = await prisma.like.count({
      where: { postId: params.id },
    })

    // Get the post to find the author
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: { authorId: true },
    })

    // Get the user who liked (for notification)
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
          type: 'like',
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
      await pusherServer.trigger(`post-${params.id}`, 'like-updated', {
        likeCount,
        user: user ? {
          id: user.id,
          name: user.name,
          userID: user.userID,
          avatar: user.avatar || user.image,
        } : null,
      })
    }

    return NextResponse.json({ success: true, likeCount })
  } catch (error: any) {
    if (error.code === 'P2002') {
      // Already liked
      return NextResponse.json({ error: 'Already liked' }, { status: 409 })
    }
    console.error('Error liking post:', error)
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

    await prisma.like.deleteMany({
      where: {
        userId: session.user.id,
        postId: params.id,
      },
    })

    // Get updated like count
    const likeCount = await prisma.like.count({
      where: { postId: params.id },
    })

    // Get the user who unliked (for notification)
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
      await pusherServer.trigger(`post-${params.id}`, 'like-updated', {
        likeCount,
        user: user ? {
          id: user.id,
          name: user.name,
          userID: user.userID,
          avatar: user.avatar || user.image,
        } : null,
      })
    }

    return NextResponse.json({ success: true, likeCount })
  } catch (error) {
    console.error('Error unliking post:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

