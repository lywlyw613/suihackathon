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

    const user = await prisma.user.findUnique({
      where: { userID: params.userID },
      select: {
        id: true,
        name: true,
        userID: true,
        image: true,
        avatar: true,
        banner: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            posts: {
              where: {
                parentId: null, // Only count top-level posts
              },
            },
            following: true,
            followers: true,
          },
        },
      },
    }).catch((error) => {
      console.error('Prisma error:', error)
      throw error
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error: any) {
    console.error('Error fetching user:', error)
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

export async function PATCH(
  request: Request,
  { params }: { params: { userID: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is editing their own profile
    if (session.user.userID !== params.userID) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { bio, avatar, banner } = await request.json()

    const user = await prisma.user.update({
      where: { userID: params.userID },
      data: {
        bio: bio !== undefined ? (bio || null) : undefined,
        avatar: avatar !== undefined ? (avatar || null) : undefined,
        banner: banner !== undefined ? (banner || null) : undefined,
      },
      select: {
        id: true,
        name: true,
        userID: true,
        image: true,
        avatar: true,
        banner: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            following: true,
            followers: true,
          },
        },
      },
    })

    return NextResponse.json({ user })
  } catch (error: any) {
    console.error('Error updating user:', error)
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


