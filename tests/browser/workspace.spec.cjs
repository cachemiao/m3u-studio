const { test, expect } = require("@playwright/test");
const headers = { "X-IPTV-Request": "1" };
async function openWorkspace(page) {
  await page.request.post("/api/auth/login", {
    headers,
    data: { username: "test-admin", password: "browser-test-password-only" },
  });
  const current = await (await page.request.get("/api/state")).json();
  const channels = Array.from({ length: 12 }, (_, i) => ({
    id: "c" + i,
    name: "Sample " + i,
    group: i < 6 ? "News" : "Culture",
    url: "https://stream.example.invalid/" + i,
    logo: "",
    epg_id: "demo." + i,
    days: 7,
  }));
  await page.request.put("/api/state", {
    headers,
    data: {
      revision: current.revision,
      epg: "",
      lists: [
        {
          id: "one",
          name: "Sample list",
          groups: ["News", "Culture"],
          channels,
          enabled: true,
          epg: "",
          slug: "",
        },
      ],
    },
  });
  await page.route("**/api/version", (r) =>
    r.fulfill({ json: { current_version: "0.6.2", update_available: false } }),
  );
  await page.goto("/");
  await expect(page.locator(".channel")).toHaveCount(12);
}
test("edit, undo and redo preserve channel data", async ({ page }) => {
  await openWorkspace(page);
  await page.locator(".channel").first().hover();
  await page.locator(".channel .actions button").first().click();
  await page.locator("#channelForm [name=name]").fill("Updated");
  await page.locator("#channelForm button.primary").click();
  await expect(page.locator(".channel-name").first()).toHaveText("Updated");
  await page.locator("#undo").click();
  await expect(page.locator(".channel-name").first()).toHaveText("Sample 0");
  await page.locator("#redo").click();
  await expect(page.locator(".channel-name").first()).toHaveText("Updated");
});
test("browser draft survives reload without publishing", async ({ page }) => {
  await openWorkspace(page);
  await page.locator(".channel").first().hover();
  await page.locator(".channel .actions button").first().click();
  await page.locator("#channelForm [name=name]").fill("Draft only");
  await page.locator("#channelForm button.primary").click();
  page.on("dialog", (d) => d.accept());
  await page.reload();
  await expect(page.locator("#interactionDialog")).toBeVisible();
  await page.locator("#interactionConfirm").click();
  await expect(page.locator(".channel-name").first()).toHaveText("Draft only");
  expect(
    (await (await page.request.get("/api/state")).json()).lists[0].channels[0]
      .name,
  ).toBe("Sample 0");
});
test("selected channels move as one undoable block", async ({ page }) => {
  await openWorkspace(page);
  for (const i of [1, 3, 5])
    await page.locator(".channel-select").nth(i).check();
  await page
    .locator(".channel")
    .nth(1)
    .locator(".handle")
    .dragTo(page.locator(".channel").first(), {
      targetPosition: { x: 150, y: 3 },
    });
  expect(
    await page
      .locator(".channel")
      .evaluateAll((ns) => ns.slice(0, 3).map((n) => n.dataset.id)),
  ).toEqual(["c1", "c3", "c5"]);
  await page.locator("#undo").click();
  await expect(page.locator(".channel").first()).toHaveAttribute(
    "data-id",
    "c0",
  );
});
test("URL copy fallback leaves editor unchanged", async ({ page }) => {
  await openWorkspace(page);
  await page.evaluate(() => {
    Object.defineProperty(window, "isSecureContext", { value: false });
    document.execCommand = () => {
      window.copied = document.querySelector(".clipboard-helper").value;
      return true;
    };
  });
  await page.locator(".stream").first().click();
  await expect(page.locator(".stream-copy-feedback").first()).toContainText(
    "已复制",
  );
  expect(await page.evaluate(() => window.copied)).toBe(
    "https://stream.example.invalid/0",
  );
  await expect(page.locator("#undo")).toBeDisabled();
});
test("demo resets and makes no backend/external requests", async ({ page }) => {
  const requests = [];
  page.on("request", (r) =>
    requests.push({ url: r.url(), method: r.method() }),
  );
  await page.goto("/demo/?lang=zh");
  await expect(page.locator(".channel")).toHaveCount(24);
  await page.locator("#import").click();
  await page.locator("#demoSampleApply").click();
  await expect(page.locator(".channel")).toHaveCount(27);
  await page.locator("#save").click();
  await expect(page.locator("#toast")).toContainText("未生成真实订阅");
  await page.reload();
  await expect(page.locator(".channel")).toHaveCount(24);
  expect(
    requests.every(
      (r) =>
        r.method === "GET" && new URL(r.url).origin === "http://127.0.0.1:8357",
    ),
  ).toBeTruthy();
  for (const width of [390, 768, 1500]) {
    await page.setViewportSize({ width, height: 960 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
});
