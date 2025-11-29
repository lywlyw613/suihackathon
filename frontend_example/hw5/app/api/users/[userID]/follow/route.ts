import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'

export async function POST(
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

    if (targetUser.id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      )
    }

    await prisma.follow.create({
      data: {
        followerId: session.user.id,
        followingId: targetUser.id,
      },
    })

    // Get updated counts
    const followerCount = await prisma.follow.count({
      where: { followingId: targetUser.id },
    })
    const followingCount = await prisma.follow.count({
      where: { followerId: targetUser.id },
    })

    // Trigger Pusher events for real-time updates
    if (pusherServer) {
      await pusherServer.trigger(`user-${params.userID}`, 'followers-updated', {
        followerCount,
        followingCount,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Already following' },
        { status: 409 }
      )
    }
    console.error('Error following user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    await prisma.follow.deleteMany({
      where: {
        followerId: session.user.id,
        followingId: targetUser.id,
      },
    })

    // Get updated counts
    const followerCount = await prisma.follow.count({
      where: { followingId: targetUser.id },
    })
    const followingCount = await prisma.follow.count({
      where: { followerId: targetUser.id },
    })

    // Trigger Pusher events for real-time updates
    if (pusherServer) {
      await pusherServer.trigger(`user-${params.userID}`, 'followers-updated', {
        followerCount,
        followingCount,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unfollowing user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


