/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/about',
        destination: '/about.html',
      },
      {
        source: '/training',
        destination: '/training.html',
      },
    ];
  },
};

export default nextConfig;
