const { withServerActions } = require('server-actions-for-next-pages');
const { withElacca } = require('elacca')


/** @type {import('next').NextConfig} */
const nextConfig = withElacca()(
  withServerActions()({
    reactStrictMode: false,

    experimental: {
      externalDir: true,
      serverMinification: false,
    },
  }),
);

module.exports = nextConfig;
