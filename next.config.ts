import type { NextConfig } from "next";

// The Discord OAuth callback sets the login cookie on exactly one host (the one in
// DISCORD_REDIRECT_URI). If people also reach the site on the www/non-www twin, they
// have no cookie there and get bounced to the main page. Send the twin to the real host.
const redirectUri = process.env.DISCORD_REDIRECT_URI || 'https://centraloperationsportal.com/api/auth/discord/callback';
const canonicalHost = new URL(redirectUri).host;
const twinHost = canonicalHost.startsWith('www.') ? canonicalHost.slice(4) : `www.${canonicalHost}`;

const nextConfig: NextConfig = {
  // Evidence uploads (Met Police portal) send the file inside a server action.
  experimental: { serverActions: { bodySizeLimit: '5mb' } },
  async redirects() {
    return [
      // The Services Hub is now its own standalone page.
      { source: '/dashboard/services', destination: '/services', permanent: false },
      {
        source: '/:path*',
        has: [{ type: 'host', value: twinHost }],
        destination: `https://${canonicalHost}/:path*`,
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
      },
    ],
  },
};

export default nextConfig;