/** @type {import('next').NextConfig} */
const nextConfig = {
  // Trailing slashes: OFF (canonical URL consistency)
  trailingSlash: false,

  // Powered-by header: OFF (security + cleaner headers)
  poweredByHeader: false,

  // React strict mode: ON
  reactStrictMode: true,

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // Compression
  compress: true,

  // HTTP Headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Link",
            value:
              "<https://fonts.googleapis.com>; rel=preconnect, <https://fonts.gstatic.com>; rel=preconnect; crossorigin",
          },
        ],
      },
      {
        source: "/(.*)\\.(jpg|jpeg|png|gif|ico|svg|webp|avif|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      // www → non-www (canonical domain)
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.thestuffbuyers.com" }],
        destination: "https://thestuffbuyers.com/:path*",
        permanent: true,
      },
      // Trailing slash removal
      {
        source: "/:path+/",
        destination: "/:path+",
        permanent: true,
      },
      // Alternate domain redirect
      {
        source: "/:path*",
        has: [{ type: "host", value: "webuystuffcompany.com" }],
        destination: "https://thestuffbuyers.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.webuystuffcompany.com" }],
        destination: "https://thestuffbuyers.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
