import bcrypt from 'bcryptjs'

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10)

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS)
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

/**
 * Hash a token (e.g., refresh token) for secure DB storage.
 * Uses a fixed salt round of 10 since tokens are already high-entropy.
 */
export async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10)
}

export async function compareToken(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
