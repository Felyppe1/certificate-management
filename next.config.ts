import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: 'standalone',
  /* config options here */
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
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
