import type { NextConfig } from "next";

const remotePatterns: NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
> = [
  { protocol: "https", hostname: "image.tmdb.org" },
  { protocol: "https", hostname: "images.igdb.com" },
  { protocol: "https", hostname: "covers.openlibrary.org" },
  { protocol: "https", hostname: "i.scdn.co" },
  { protocol: "https", hostname: "lh3.googleusercontent.com" },
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl) {
  try {
    const { hostname } = new URL(supabaseUrl);
    remotePatterns.push({
      protocol: "https",
      hostname,
      pathname: "/storage/v1/object/public/**",
    });
  } catch {
    // Ignore invalid env URL; uploads still work, Next/Image may need a restart after fix.
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
