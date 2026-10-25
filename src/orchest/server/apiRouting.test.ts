import { describe, expect, it } from "vitest";
import { dispatch } from "./handlers";

describe("admin API route registration", () => {
  it("dispatches the session endpoint instead of returning the shim 404", async () => {
    const response = await dispatch(new Request("https://example.test/api/auth/session"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ authenticated: false });
  });
});
