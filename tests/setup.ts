/**
 * Test environment bootstrap.
 *
 * Secrets are set before any module that reads them at import time — jwt.ts
 * throws on load if JWT_ACCESS_SECRET is missing, so this must run first.
 * Values are obviously fake so a test run can never be mistaken for a real
 * deployment.
 */
// NODE_ENV is typed readonly by @types/node; vitest already sets it to 'test'.
process.env.JWT_ACCESS_SECRET = 'test-access-secret-not-a-real-key'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-not-a-real-key'
process.env.JWT_ACCESS_EXPIRY = '15m'
process.env.JWT_REFRESH_EXPIRY = '7d'
// Keep bcrypt cheap; these tests assert behaviour, not work factor.
process.env.BCRYPT_SALT_ROUNDS = '4'
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/placeholder'
