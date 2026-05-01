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
              "frame-src https://*.vercel.app https://*.vercel.run https://*.onkernel.com https://*.onkernel.com:8443 https://va.vercel-scripts.com",
              "frame-ancestors 'self' https://*.vercel.app https://*.vercel.run https://*.onkernel.com https://*.onkernel.com:8443",
              "connect-src 'self' https://*.vercel.app https://*.vercel.run https://*.onkernel.com https://*.onkernel.com:8443",
              "img-src 'self' data: https://*.vercel.app https://*.vercel.run https://*.onkernel.com https://*.onkernel.com:8443",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.vercel.app https://*.vercel.run https://va.vercel-scripts.com",
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
