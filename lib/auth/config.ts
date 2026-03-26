import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import type { AppRole } from '@/lib/utils/rbac'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      orgId?: string | null
      appRole: AppRole
    }
  }

  interface User {
    orgId?: string | null
    appRole?: AppRole
  }
}

declare module 'next-auth' {
  interface JWT {
    orgId?: string | null
    appRole?: AppRole
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1)

        if (!user || !user.hashedPassword) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword
        )
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          orgId: user.orgId,
          appRole: user.appRole as AppRole,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.orgId = (user as any).orgId
        token.appRole = (user as any).appRole
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
        session.user.orgId = token.orgId as string | null
        session.user.appRole = (token.appRole as AppRole) ?? 'viewer'
      }
      return session
    },
  },
})
