import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getUserByEmail, verifyPassword } from "../../../../lib/auth";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await getUserByEmail(credentials.email);
        if (!user || user.isActive === false) {
          return null;
        }

        // Block unverified users from logging in
        if (user.emailVerified === false || user.status === "pending") {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        const isValid = await verifyPassword(credentials.password, user.password);
        if (!isValid) {
          return null;
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role || "user",
          siteLink: user.siteLink || null,
          accessibleSites: user.accessibleSites || (user.siteLink ? [user.siteLink] : []),
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.siteLink = user.siteLink;
        token.accessibleSites = user.accessibleSites;
      } else if (token.email) {
        // Refresh user data on each token refresh
        const userData = await getUserByEmail(token.email);
        if (userData && userData.isActive !== false) {
          token.role = userData.role || "user";
          token.siteLink = userData.siteLink || null;
          token.accessibleSites = userData.accessibleSites || (userData.siteLink ? [userData.siteLink] : []);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role || "user";
        session.user.siteLink = token.siteLink || null;
        session.user.accessibleSites = token.accessibleSites || [];
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === "production" ? undefined : "development-secret-change-in-production"),
  // Security configuration
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-next-auth.session-token" 
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

