/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Allow Telegram user profile photos and any listing image host you use.
    remotePatterns: [
      { protocol: "https", hostname: "**" }
    ]
  },
  async headers() {
    return [
      {
        // Telegram Mini Apps must be embeddable inside Telegram's webview.
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
