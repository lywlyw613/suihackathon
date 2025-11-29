import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            userID: true,
            image: true,
            avatar: true,
          },
        },
        likes: {
          select: {
            userId: true,
          },
        },
        reposts: {
          select: {
            userId: true,
          },
        },
        parent: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                userID: true,
                image: true,
                avatar: true,
              },
            },
            likes: {
              select: {
                userId: true,
              },
            },
            reposts: {
              select: {
                userId: true,
              },
            },
            _count: {
              select: {
                likes: true,
                reposts: true,
                replies: true, // Comments are implemented as replies
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            reposts: true,
            replies: true, // Comments are implemented as replies
          },
        },
      },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Get comments (replies)
    const comments = await prisma.post.findMany({
      where: { parentId: params.id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            userID: true,
            image: true,
            avatar: true,
          },
        },
        likes: {
          select: {
            userId: true,
          },
        },
        reposts: {
          select: {
            userId: true,
          },
        },
        _count: {
          select: {
            likes: true,
            reposts: true,
            replies: true, // Comments are implemented as replies
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return NextResponse.json({ post, comments })
  } catch (error) {
    console.error('Error fetching post:', error)
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

    // Check if post exists and belongs to the user
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        authorId: true,
      },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (post.authorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // MongoDB doesn't support cascade delete, so we need to manually delete related records
    // Delete in transaction-like order: replies first, then likes, reposts, comments, and finally the post
    
    // 1. Delete all replies (comments) to this post recursively
    const deleteReplies = async (postId: string) => {
      const replies = await prisma.post.findMany({
        where: { parentId: postId },
        select: { id: true },
      })
      
      for (const reply of replies) {
        // Recursively delete replies to replies
        await deleteReplies(reply.id)
        // Delete likes, reposts, and comments for this reply
        await prisma.like.deleteMany({ where: { postId: reply.id } })
        await prisma.repost.deleteMany({ where: { postId: reply.id } })
        await prisma.comment.deleteMany({ where: { postId: reply.id } })
        // Delete the reply post itself
        await prisma.post.delete({ where: { id: reply.id } })
      }
    }
    
    await deleteReplies(params.id)
    
    // 2. Delete all likes for this post
    await prisma.like.deleteMany({
      where: { postId: params.id },
    })
    
    // 3. Delete all reposts for this post
    await prisma.repost.deleteMany({
      where: { postId: params.id },
    })
    
    // 4. Delete all comments for this post (if using Comment model)
    await prisma.comment.deleteMany({
      where: { postId: params.id },
    })
    
    // 5. Finally, delete the post itself
    await prisma.post.delete({
      where: { id: params.id },
    })

    // Trigger Pusher event to notify all clients that the post was deleted
    if (pusherServer) {
      await pusherServer.trigger('feed-updates', 'post-deleted', {
        postId: params.id,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting post:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    })
    return NextResponse.json(
      { error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error?.message : undefined },
      { status: 500 }
    )
  }
}
