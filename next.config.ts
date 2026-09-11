import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow the sandbox preview gateway origin to load Next.js assets.
  allowedDevOrigins: ["*.space-z.ai"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "sxqnqorornkpdrmntpce.supabase.co",
        pathname: "/storage/v1/object/public/menu-items/**",
      },
    ],
  },
};

export default nextConfig;
