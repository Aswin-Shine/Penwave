import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // FIX M-9: restrict to known image hosts instead of '**' wildcard.
    // The wildcard allows Next.js to proxy any external URL — SSRF vector.
    // Add your actual CDN/storage domains here.
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'cdn.penwave.io' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },

  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    // next.config.ts runs in Node at build/start time — NEXT_PUBLIC_ vars are
    // available here via process.env, but we hardcode the dev fallback explicitly
    // so the CSP is never built with an empty or undefined origin.
    const apiOrigin = process.env.NEXT_PUBLIC_API_URL
      ? new URL(process.env.NEXT_PUBLIC_API_URL).origin  // strips /api path → http://localhost:4000
      : 'http://localhost:4000';

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Next.js requires 'unsafe-inline' for its hydration scripts.
              // 'unsafe-eval' is also needed in dev for HMR / Turbopack.
              isDev
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
                : "script-src 'self' 'unsafe-inline'",
              // Tailwind / Framer Motion inline styles + Google Fonts stylesheet
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Google Fonts binary files
              "font-src 'self' https://fonts.gstatic.com",
              // API origin + Next.js HMR websockets in dev
              isDev
                ? `connect-src 'self' ${apiOrigin} ws://localhost:3000 ws://localhost:3001`
                : `connect-src 'self' ${apiOrigin}`,
              // Images: self, data URIs, blobs, and any https host (covers CDNs)
              "img-src 'self' data: blob: https:",
              // Video/audio: self + https covers CloudFront and any CDN
              "media-src 'self' https:",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};
  
export default nextConfig;
