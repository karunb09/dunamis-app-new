/** @type {import('next').NextConfig} */

// Security headers. These are safe defaults that don't break app behaviour.
// The Content-Security-Policy is the strongest XSS mitigation but MUST be tuned
// and tested against your actual inline scripts/styles and third-party origins
// (Cashfree, image hosts, fonts) before enabling — a wrong CSP silently breaks
// the page. It is left commented with a starting template; enable once verified.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // {
  //   key: "Content-Security-Policy",
  //   value: [
  //     "default-src 'self'",
  //     "script-src 'self' 'unsafe-inline'",        // tighten with nonces/hashes
  //     "style-src 'self' 'unsafe-inline'",
  //     "img-src 'self' data: https:",
  //     "connect-src 'self' https:",                 // include your backend origin
  //     "font-src 'self' data:",
  //     "frame-ancestors 'self'",
  //   ].join("; "),
  // },
];

const nextConfig = {
  images: {
    // Serve modern formats — Next.js image optimizer handles the conversion.
    // avif has better compression but slower encoding; webp is the safe default.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
    ],
    // Limit concurrent optimizations to avoid blocking the server on mobile traffic spikes
    deviceSizes: [390, 640, 768, 1024, 1280, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256],
  },
  async headers() {
    return [
      // Security headers on every route
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      // Immutable cache for hashed static assets — browsers won't re-request these
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // API routes must never be served stale
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
