import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { userID } = await request.json()

    if (!userID) {
      return NextResponse.json(
        { error: 'UserID is required' },
        { status: 400 }
      )
    }

    // Check if userID exists
    const user = await prisma.user.findUnique({
      where: { userID: userID },
      select: { id: true, userID: true },
    })

    return NextResponse.json({
      exists: !!user,
    })
  } catch (error) {
    console.error('Check userID error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


