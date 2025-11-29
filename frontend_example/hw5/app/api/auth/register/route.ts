import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { userID, regKey } = await request.json()

    if (!userID) {
      return NextResponse.json(
        { error: 'UserID is required' },
        { status: 400 }
      )
    }

    // Validate userID format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(userID)) {
      return NextResponse.json(
        { error: 'Invalid userID format' },
        { status: 400 }
      )
    }

    // Check if regKey is required and valid
    if (process.env.REG_KEY) {
      if (!regKey || regKey !== process.env.REG_KEY) {
        return NextResponse.json(
          { error: 'Invalid registration key' },
          { status: 403 }
        )
      }
    }

    // Check if userID is already taken by a different user
    const existingUser = await prisma.user.findUnique({
      where: { userID },
    })

    if (existingUser && existingUser.id !== session.user.id) {
      return NextResponse.json(
        { error: 'UserID already taken' },
        { status: 409 }
      )
    }

    // If the userID is already assigned to this user, just return success
    if (existingUser && existingUser.id === session.user.id) {
      return NextResponse.json({ success: true, user: existingUser })
    }

    // Update user with userID
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { userID },
    })

    return NextResponse.json({ success: true, user })
  } catch (error: any) {
    console.error('Registration error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'UserID already taken' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


