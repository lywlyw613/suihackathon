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

    const targetUser = await prisma.user.findUnique({
      where: { userID: params.userID },
      select: { id: true },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get followers (users who follow this user)
    const follows = await prisma.follow.findMany({
      where: { followingId: targetUser.id },
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            userID: true,
            image: true,
            bio: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const followers = follows.map((follow) => follow.follower)

    return NextResponse.json({ followers })
  } catch (error) {
    console.error('Error fetching followers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

