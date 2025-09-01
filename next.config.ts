// next.config.ts
import { NextConfig } from "next";

const nextConfig: NextConfig = {
  // …any other config…
  env: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
};

export default nextConfig;
