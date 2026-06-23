import { getSecurityHeaders } from "./security-headers.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: getSecurityHeaders()
      }
    ];
  }
};

export default nextConfig;
