import { createCivicAuthPlugin } from "@civic/auth/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
};

const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3001').replace(/\/+$/, '');

const withCivicAuth = createCivicAuthPlugin({
  clientId: process.env.CIVIC_CLIENT_ID,
  loginSuccessUrl: `${frontendUrl}?auth=1`,
  callbackUrl: "/api/auth/callback",
  loginUrl: "/",
  logoutUrl: frontendUrl,
  exclude: ["/", "/api/*", "/_next/*", "/favicon.ico"],
});

export default withCivicAuth(nextConfig);
