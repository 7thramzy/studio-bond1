import { hash as bcryptHash } from "bcryptjs";
import { describe, expect, it } from "vitest";
import { verifyAdminPassword } from "./adminPassword";

describe("verifyAdminPassword", () => {
  it("accepts the password corresponding to a bcrypt hash", async () => {
    const password = "Local-test-only-password-42";
    const passwordHash = await bcryptHash(password, 4);

    await expect(verifyAdminPassword(password, passwordHash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const passwordHash = await bcryptHash("Local-test-only-password-42", 4);

    await expect(verifyAdminPassword("incorrect-password", passwordHash)).resolves.toBe(false);
  });

  it("rejects empty passwords and malformed hashes", async () => {
    await expect(verifyAdminPassword("password", "not-a-bcrypt-hash")).resolves.toBe(false);
    await expect(verifyAdminPassword("", "$2a$10$not-a-valid-hash")).resolves.toBe(false);
  });
});
