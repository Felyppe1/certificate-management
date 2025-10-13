import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: 'standalone',
  /* config options here */
    experimental: {
        serverActions: {
            bodySizeLimit: '15mb',
        }
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "lh3.googleusercontent.com",
            },
        ],
    },
};

export default nextConfig;
