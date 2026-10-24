const test = require("node:test"),
  assert = require("node:assert/strict");
const createTransport = require("../app/static/transport.js"),
  createModel = require("../app/static/workspace-model.js");
test("transport preserves method/body and caller headers without swallowing auth failures", async () => {
  const calls = [];
  let unauthorized = 0;
  const transport = createTransport({
    request: async (path, options) => {
      calls.push({ path, options });
      return {
        ok: false,
        status: 401,
        json: async () => ({ error: "Login required" }),
      };
    },
    locale: () => "en",
    onUnauthorized: () => unauthorized++,
    errorLabel: () => "Request failed",
  });
  await assert.rejects(
    transport.api("/api/state", {
      method: "PUT",
      body: "{}",
      headers: { "Content-Type": "application/json" },
    }),
    (e) => e.status === 401 && e.data.error === "Login required",
  );
  assert.equal(unauthorized, 1);
  assert.equal(calls[0].options.headers["X-IPTV-Request"], "1");
  assert.equal(calls[0].options.headers["Accept-Language"], "en");
  assert.equal(calls[0].options.body, "{}");
  await assert.rejects(transport.api("/api/auth/login"));
  assert.equal(unauthorized, 1);
});
test("transport does not report failed responses as successful state", async () => {
  const transport = createTransport({
    request: async () => ({
      ok: false,
      status: 409,
      json: async () => ({ error: "Conflict" }),
    }),
    locale: () => "zh",
    onUnauthorized() {},
    errorLabel: () => "Failed",
  });
  await assert.rejects(
    transport.api("/api/state"),
    (e) => e.status === 409 && e.message === "Conflict",
  );
});
test("workspace model owns independent mutable collections for each application", () => {
  const a = createModel(),
    b = createModel();
  a.selectedChannels.add("one");
  a.sourceCheckResults.set("one", { status: "ok" });
  assert.equal(b.selectedChannels.size, 0);
  assert.equal(b.sourceCheckResults.size, 0);
  assert.equal(a.state, undefined);
  assert.equal(a.dirty, false);
});
