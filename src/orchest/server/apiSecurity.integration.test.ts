import { describe, expect, it } from "vitest";
import { dispatch } from "./handlers";

describe("AI and admin API integration boundaries", () => {
  it("rejects admin assistant requests without a session", async () => {
    const response = await dispatch(
      new Request("https://example.test/api/admin/assistant", {
        method: "POST",
        headers: { "content-type": "application/json", "x-csrf-token": "missing" },
        body: JSON.stringify({ message: "أعطني ملخصاً" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects SEO generation requests without a session", async () => {
    const response = await dispatch(
      new Request("https://example.test/api/ai/generate-seo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "زفة اختبار", artist: "منشد اختبار" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("keeps the public session endpoint unauthenticated and explicit", async () => {
    const response = await dispatch(new Request("https://example.test/api/auth/session"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ authenticated: false });
  });
});
