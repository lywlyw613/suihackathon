import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import FacebookProvider from 'next-auth/providers/facebook'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    }),
    // Facebook is optional (not required for HW#5)
    ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
      ? [
          FacebookProvider({
            clientId: process.env.FACEBOOK_CLIENT_ID,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email || !account) {
        console.error('SignIn: Missing user.email or account')
        return false
      }

      try {
        // Check if a user with this email already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { accounts: true },
        })

        if (existingUser) {
          // User exists, check if this account is already linked
          const accountExists = existingUser.accounts.some(
            (acc) => acc.provider === account.provider && acc.providerAccountId === account.providerAccountId
          )

          if (!accountExists) {
            // Link the new account to existing user
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state,
              },
            })
          }
          // Use existing user (Prisma adapter will handle this)
        }
        // Let Prisma adapter handle user creation if new
        return true
      } catch (error) {
        console.error('SignIn error:', error)
        return false
      }
    },
    async redirect({ url, baseUrl }) {
      // Handle redirects properly
      // If user doesn't have userID, redirect to register page
      // Otherwise redirect to the requested URL or home
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`
      }
      if (new URL(url).origin === baseUrl) {
        return url
      }
      return baseUrl
    },
    async session({ session, user }) {
      if (session.user && user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            userID: true,
            avatar: true,
            image: true,
          },
        })
        if (dbUser) {
          session.user.id = dbUser.id
          session.user.userID = dbUser.userID || ''
          // Use avatar if available, otherwise fallback to image
          session.user.image = dbUser.avatar || dbUser.image || null
          // If no userID, we'll handle redirect in the page
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'database',
    maxAge: 30 * 60, // 30 minutes (idle timeout)
  },
}

