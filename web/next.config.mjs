import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The isomorphic crypto + DTO package ships TypeScript source, so Next transpiles it.
  transpilePackages: ['@kith/shared'],
  reactStrictMode: true,
  // Pin the workspace root so Turbopack resolves the file: dependency deterministically
  // (the app and @kith/shared both live under this parent).
  turbopack: { root: join(here, '..') },
  typescript: {
    // Next 16.2's in-build type worker calls the TypeScript compiler API programmatically and
    // crashes on the TS 7 native compiler. Types are still enforced: `npm run typecheck`
    // (tsc --noEmit) is the gate and runs clean. Remove once Next ships TS 7 support.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
