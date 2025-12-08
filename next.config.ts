import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "frame-src https://*.e2b.dev https://*.e2b.app https://*.onkernel.com https://*.onkernel.com:8443 https://va.vercel-scripts.com",
              "frame-ancestors 'self' https://*.e2b.dev https://*.e2b.app https://*.onkernel.com https://*.onkernel.com:8443",
              "connect-src 'self' https://*.e2b.dev https://*.e2b.app https://*.onkernel.com https://*.onkernel.com:8443",
              "img-src 'self' data: https://*.e2b.dev https://*.e2b.app https://*.onkernel.com https://*.onkernel.com:8443",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.e2b.dev https://*.e2b.app https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline'",
            ].join("; "),
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
