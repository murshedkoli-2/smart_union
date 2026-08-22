import type { NextConfig } from "next";

/**
 * Security headers are set in middleware.ts, not here.
 *
 * The Content-Security-Policy carries a per-request nonce so that script-src
 * no longer needs 'unsafe-inline' — see lib/security/csp. A nonce has to be
 * generated per response, which a static `headers()` entry cannot do.
 */
const nextConfig: NextConfig = {};

export default nextConfig;
