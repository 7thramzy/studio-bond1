import { hash as bcryptHash } from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockFrom, mockSelect, mockEq, mockMaybeSingle } = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { mockFrom: from, mockSelect: select, mockEq: eq, mockMaybeSingle: maybeSingle };
});

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: mockFrom },
}));

import { dispatch } from "./handlers";

const testPassword = "Local-only-test-password-2026";
const testHash = await bcryptHash(testPassword, 4);

function loginRequest(identifier: string, password: string, ip: string): Request {
  return new Request("https://example.test/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ email: identifier, password }),
  });
}

describe("custom admin login endpoint", () => {
  const previousSecret = process.env["ADMIN_SESSION_SECRET"];

  beforeEach(() => {
    process.env["ADMIN_SESSION_SECRET"] = "test-session-secret-with-sufficient-length";
    mockMaybeSingle.mockReset();
    mockEq.mockClear();
    mockSelect.mockClear();
    mockFrom.mockClear();
  });

  afterEach(() => {
    if (previousSecret === undefined) delete process.env["ADMIN_SESSION_SECRET"];
    else process.env["ADMIN_SESSION_SECRET"] = previousSecret;
  });

  it("authenticates an active username with its stored bcrypt hash", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        user_id: "11111111-1111-4111-8111-111111111111",
        email: "admin@example.test",
        username: "admin",
        password_hash: testHash,
        is_active: true,
      },
      error: null,
    });

    const response = await dispatch(loginRequest("ADMIN", testPassword, "198.51.100.21"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ authenticated: true });
    expect(mockFrom).toHaveBeenCalledWith("orchest_admin_users");
    expect(mockEq).toHaveBeenCalledWith("username", "admin");
    expect(response.headers.get("set-cookie")).toContain("orchest_admin_session_v2=");
  });

  it("rejects inactive custom accounts without issuing a session", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        user_id: "22222222-2222-4222-8222-222222222222",
        email: "disabled@example.test",
        username: "disabled",
        password_hash: null,
        is_active: false,
      },
      error: null,
    });

    const response = await dispatch(loginRequest("disabled", testPassword, "198.51.100.22"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
