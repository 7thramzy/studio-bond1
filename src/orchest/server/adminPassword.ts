import { compare } from "bcryptjs";

const BCRYPT_HASH_PATTERN = /^\$2[ab]\$\d{2}\$[./A-Za-z0-9]{53}$/;

/** Verify an existing bcrypt hash without exposing password material to callers. */
export async function verifyAdminPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (!password || !BCRYPT_HASH_PATTERN.test(passwordHash)) return false;
  try {
    return await compare(password, passwordHash);
  } catch {
    return false;
  }
}
