import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { userID } = await request.json()

    if (!userID) {
      return NextResponse.json(
        { error: 'UserID is required' },
        { status: 400 }
      )
    }

    // Find user by userID
    const user = await prisma.user.findUnique({
      where: { userID: userID },
      include: {
        accounts: true, // Get all accounts
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid userID' },
        { status: 404 }
      )
    }

    if (user.accounts.length === 0) {
      return NextResponse.json(
        { error: 'No OAuth account found for this userID' },
        { status: 404 }
      )
    }

    // Check if user already has a userID (should always be true here)
    if (!user.userID) {
      return NextResponse.json(
        { error: 'User account is not fully set up' },
        { status: 400 }
      )
    }

    // Generate session token
    const sessionToken = randomBytes(32).toString('base64url')
    const expires = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

    // Create session in database
    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires,
      },
    })

    // Set session cookie
    const cookieStore = await cookies()
    // In production, Vercel uses HTTPS, so we should use secure cookies
    // But we need to check NEXTAUTH_URL to determine if we're in production
    const isProduction = process.env.NEXTAUTH_URL?.startsWith('https://') || false
    
    // Use the correct cookie name based on environment
    const cookieName = isProduction 
      ? '__Secure-next-auth.session-token' 
      : 'next-auth.session-token'
    
    cookieStore.set(
      cookieName,
      sessionToken,
      {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        expires,
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('UserID login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

