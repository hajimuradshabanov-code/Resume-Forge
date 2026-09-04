import { test, expect, type Browser, type Page } from "@playwright/test";

const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

async function register(page: Page, name: string) {
  const email = `${name.toLowerCase()}-${unique()}@e2e.local`;
  await page.goto("/register");
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Password123!");
  await page.getByLabel("Confirm password").fill("Password123!");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/onboarding");
  await page.getByRole("button", { name: "Skip for now" }).click();
  await page.waitForURL("**/dashboard");
  return email;
}

test("register → create resume → fill profile → add experience → choose template → preview → download PDF", async ({ page }) => {
  await register(page, "Alice");
  await page.getByRole("button", { name: "Create Resume" }).first().click();
  await page.getByRole("button", { name: /Start from scratch/ }).click();
  await page.waitForURL(/\/resume\/[0-9a-f-]{36}$/);
  const url = page.url();

  await page.getByLabel("Full name").fill("Alice Example");
  await page.getByLabel("Professional headline").fill("Product Designer");
  await expect(page.getByRole("status").filter({ hasText: /Saved/ })).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: "Experience" }).click();
  await page.getByRole("button", { name: "Add experience" }).click();
  await page.getByLabel("Job title").fill("Designer");
  await page.getByLabel("Company").fill("Acme");
  await expect(page.getByRole("status").filter({ hasText: /Saved/ })).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: "Templates" }).click();
  await page.getByRole("button", { name: /Executive/ }).click();
  await expect(page.getByText("Executive template applied")).toBeVisible();

  // Persisted across reload
  await page.reload();
  await expect(page.getByLabel("Full name")).toHaveValue("Alice Example");

  await page.goto(`${url}/preview`);
  const download = page.waitForEvent("download", { timeout: 60_000 });
  await page.getByRole("button", { name: "Download PDF" }).click();
  expect((await download).suggestedFilename()).toBe("Alice_Example_Resume.pdf");
});

test("user A cannot access user B's resume", async ({ browser }: { browser: Browser }) => {
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await register(pageA, "Owner");
  await pageA.getByRole("button", { name: "Create Resume" }).first().click();
  await pageA.getByRole("button", { name: /Start from scratch/ }).click();
  await pageA.waitForURL(/\/resume\/[0-9a-f-]{36}$/);
  const resumeUrl = pageA.url();
  const id = resumeUrl.split("/").pop()!;

  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await register(pageB, "Intruder");
  const res = await pageB.goto(resumeUrl);
  expect(res?.status()).toBe(404);
  const api = await pageB.request.get(`/api/resumes/${id}`);
  expect(api.status()).toBe(404);
  const del = await pageB.request.delete(`/api/resumes/${id}`);
  expect(del.status()).toBe(404);

  // Owner still has it
  await pageA.reload();
  await expect(pageA.getByLabel("Full name")).toBeVisible();
});

test("unauthenticated users are redirected to login", async ({ page }: { page: Page }) => {
  await page.goto("/dashboard");
  await page.waitForURL(/\/login/);
  const api = await page.request.get("/api/resumes");
  expect(api.status()).toBe(401);
});
