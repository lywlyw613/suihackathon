import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const drafts = await prisma.draft.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ drafts })
  } catch (error) {
    console.error('Error fetching drafts:', error)
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

    const { content } = await request.json()

    const draft = await prisma.draft.create({
      data: {
        content,
        userId: session.user.id,
      },
    })

    return NextResponse.json({ draft })
  } catch (error) {
    console.error('Error saving draft:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


