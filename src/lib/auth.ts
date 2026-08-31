import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./prisma";
import { ADMIN_EMAILS } from "./constants";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      const email = user.email.toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email } });

      if (!existing) {
        const isAdmin = ADMIN_EMAILS.some(
          (a) => a.toLowerCase() === email
        );
        if (!isAdmin) return false;
      }

      return true;
    },
    async session({ session, token }) {
      if (session.user?.email) {
        const email = session.user.email.toLowerCase();
        const dbUser = await prisma.user.findUnique({ where: { email } });
        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.role = dbUser.role;
          session.user.name = dbUser.name;
        }
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (account && user?.email) {
        const email = user.email.toLowerCase();
        let dbUser = await prisma.user.findUnique({ where: { email } });

        if (!dbUser) {
          const isAdmin = ADMIN_EMAILS.some(
            (a) => a.toLowerCase() === email
          );
          dbUser = await prisma.user.create({
            data: {
              email,
              name: user.name || email,
              role: isAdmin ? "ADMIN" : "EMPLOYEE",
              image: user.image,
            },
          });
        } else if (user.image && !dbUser.image) {
          dbUser = await prisma.user.update({
            where: { id: dbUser.id },
            data: { image: user.image },
          });
        }

        token.id = dbUser.id;
        token.role = dbUser.role;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
