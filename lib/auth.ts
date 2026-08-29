import { betterAuth } from "better-auth";

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET || "publicadev_better_auth_secret_2026_dev_mode",
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_APP_CLIENT_ID || process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_APP_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET || "",
    },
  },
});
