import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { userID: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow users to see their own likes
    if (session.user.userID !== params.userID) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { userID: params.userID },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get posts that the user has liked
    const likes = await prisma.like.findMany({
      where: { userId: user.id },
      include: {
        post: {
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const posts = likes.map((like) => like.post)

    return NextResponse.json({ posts })
  } catch (error) {
    console.error('Error fetching user likes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

