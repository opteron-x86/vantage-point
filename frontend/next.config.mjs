/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,

  // Emit a minimal self-contained server bundle at build time. This is what
  // we copy into the runtime Docker image so we don't need node_modules there.
  output: "standalone",

  // Quiet the dev-mode warning about multiple lockfiles when Docker builds
  // see a parent directory with a lockfile it won't find.
  outputFileTracingRoot: process.env.NEXT_OUTPUT_FILE_TRACING_ROOT || undefined,
};

export default nextConfig;
