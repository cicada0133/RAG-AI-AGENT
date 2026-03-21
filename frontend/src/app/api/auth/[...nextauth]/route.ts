import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text", placeholder: "jsmith" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        // MVP Mock Authentication
        // In full Phase 2 this connects to Supabase 
        if (credentials?.username === "admin" && credentials?.password === "admin") {
          return { id: "1", name: "Admin User", email: "admin@centralinvest.ru" };
        }
        return null;
      }
    })
  ],
  pages: {
    signIn: '/login', // Will be implemented in Phase 2 Expansion
  },
  session: {
    strategy: "jwt",
  }
});

export { handler as GET, handler as POST };
