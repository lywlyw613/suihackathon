import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const tab = searchParams.get('tab') || 'all'

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    let whereClause: any = {
      parentId: null, // Only top-level posts
    }

    if (tab === 'following') {
      // Get users that the current user follows
      const following = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      })

      const followingIds = following.map((f) => f.followingId)

      whereClause.authorId = {
        in: followingIds.length > 0 ? followingIds : [userId], // Include own posts
      }
    }

    const posts = await prisma.post.findMany({
      where: whereClause,
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
        comments: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            likes: true,
            reposts: true,
            replies: true, // Comments are implemented as replies (recursive posts)
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    })

    return NextResponse.json({ posts })
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content, parentId, images, videos } = await request.json()

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    const post = await prisma.post.create({
      data: {
        content: content.trim(),
        authorId: session.user.id,
        parentId: parentId || null,
        images: images || [],
        videos: videos || [],
      },
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
        _count: {
          select: {
            likes: true,
            reposts: true,
            replies: true, // Comments are implemented as replies (recursive posts)
          },
        },
      },
    })

    // If this is a comment (has parentId), update the parent post's comment count via Pusher
    if (parentId) {
      const replyCount = await prisma.post.count({
        where: { parentId },
      })
      
      // Get the parent post to find the author
      const parentPost = await prisma.post.findUnique({
        where: { id: parentId },
        select: { authorId: true },
      })
      
      // Get the user who commented (for notification)
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
      
      // Create notification if the parent post author is not the current user
      if (parentPost && parentPost.authorId !== session.user.id) {
        await prisma.notification.create({
          data: {
            userId: parentPost.authorId,
            type: 'comment',
            actorId: session.user.id,
            postId: parentId,
          },
        })

        // Trigger Pusher event for notification count update
        if (pusherServer) {
          await pusherServer.trigger(`user-${parentPost.authorId}`, 'notification-updated', {})
        }
      }
      
      if (pusherServer) {
        await pusherServer.trigger(`post-${parentId}`, 'comment-updated', {
          commentCount: replyCount,
          user: user ? {
            id: user.id,
            name: user.name,
            userID: user.userID,
            avatar: user.avatar || user.image,
          } : null,
        })
      }
    } else {
      // If this is a new top-level post, trigger event to update feed
      if (pusherServer) {
        await pusherServer.trigger('feed-updates', 'new-post', {
          post: {
            id: post.id,
            content: post.content,
            createdAt: post.createdAt,
            images: post.images || [],
            videos: post.videos || [],
            author: {
              id: post.author.id,
              name: post.author.name,
              userID: post.author.userID,
              image: post.author.image,
              avatar: post.author.avatar,
            },
            likes: [],
            reposts: [],
            comments: [],
            parentId: null,
            _count: {
              likes: 0,
              reposts: 0,
              replies: 0,
            },
          },
        })
      }
    }

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

