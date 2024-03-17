const { withServerActions } = require('server-actions-for-next-pages');

/** @type {import('next').NextConfig} */
const nextConfig = withServerActions()({
  reactStrictMode: false,

  experimental: {
    externalDir: true,
    serverMinification: false,
  },
});

module.exports = nextConfig;
