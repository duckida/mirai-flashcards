import { createCivicAuthPlugin } from "@civic/auth/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
};

const withCivicAuth = createCivicAuthPlugin({
  clientId: process.env.CIVIC_CLIENT_ID,
  loginSuccessUrl: "/",
  callbackUrl: "/api/auth/callback",
  loginUrl: "/",
  logoutUrl: "/",
  exclude: ["/", "/api/auth/*", "/_next/*", "/favicon.ico", "/api/user"],
});

export default withCivicAuth(nextConfig);
