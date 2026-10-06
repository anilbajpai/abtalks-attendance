import { withAuth } from "next-auth/middleware";
import { isAllowedEmail } from "@/lib/users";

// Re-check the allow-list on every request so removed users with an
// existing session are signed out, not just blocked at next login.
export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token?.email && isAllowedEmail(token.email),
  },
  pages: { signIn: "/login" },
});

export const config = {
  matcher: ["/dashboard/:path*", "/calendar/:path*", "/admin/:path*"],
};
