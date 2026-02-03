import { apiRequest, apiTryRequest } from "../lib/apiClient";

describe("config/apiClient basics", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("apiTryRequest returns ok=false on 404 without throwing", async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 404,
      statusText: "Not Found",
      headers: { get: () => "application/json" },
      json: async () => ({ detail: "nope" }),
    }));

    const res = await apiTryRequest("/missing", { method: "GET" });
    expect(res.ok).toBe(false);
    expect(res.status).toBe(404);
    expect(res.error).toBeInstanceOf(Error);
  });

  test("apiRequest throws enriched error on non-OK", async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 500,
      statusText: "Server Error",
      headers: { get: () => "application/json" },
      json: async () => ({ detail: "boom" }),
    }));

    await expect(apiRequest("/x", { method: "GET" })).rejects.toMatchObject({
      status: 500,
    });
  });
});
