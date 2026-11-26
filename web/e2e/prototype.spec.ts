import { expect, test, type Page } from "@playwright/test";

async function viewAs(page: Page, role: "Salesman" | "Manager" | "Admin") {
  await page.getByRole("combobox", { name: "Viewing as" }).first().selectOption({ label: role });
}

test("salesman creates an order and records an advance", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Good afternoon, Ali/ })).toBeVisible();

  await page.goto("/catalog");
  await page.getByRole("link", { name: "Select Royal Sofa Set" }).click();
  await expect(page.getByRole("heading", { name: "Royal Sofa Set" })).toBeVisible();

  await page.getByRole("checkbox", { name: "Centre table" }).check();
  await page.getByRole("checkbox", { name: "Side tables (pair)" }).check();
  await expect(page.getByText("Rs. 228,000").last()).toBeVisible();
  await page.getByRole("button", { name: "Add to order" }).click();

  await expect(page).toHaveURL(/\/orders\/new$/);
  const next = page.getByRole("button", { name: "Save & receive advance" });
  await expect(next).toBeDisabled();
  await page.getByRole("combobox", { name: /Choose customer/ }).selectOption({ label: "Mr. Imran Khan — 0321-4567890" });
  await page.getByLabel(/Expected delivery/).fill("2026-12-20");
  await next.click();

  await expect(page.getByRole("heading", { name: "Receive advance" })).toBeVisible();
  await page.getByLabel(/Advance amount/).fill("80000");
  await expect(page.getByText("Rs. 148,000")).toBeVisible();
  await page.getByRole("button", { name: "Record payment" }).click();

  await expect(page.getByRole("heading", { name: "Order created successfully!" })).toBeVisible();
  await expect(page.getByText("SO-000145")).toBeVisible();

  await page.getByRole("link", { name: "Go to orders" }).click();
  await expect(page.getByText("SO-000145").filter({ visible: true }).first()).toBeVisible();
});

test("advance cannot be more than the order total", async ({ page }) => {
  await page.goto("/catalog/LV-402");
  await page.getByRole("button", { name: "Add to order" }).click();
  await page.getByRole("button", { name: "New customer" }).click();
  await page.getByLabel(/Customer name/).fill("Test Customer");
  await page.getByLabel(/^Phone/).fill("0300-0000000");
  await page.getByLabel(/Expected delivery/).fill("2026-12-20");
  await page.getByRole("button", { name: "Save & receive advance" }).click();
  await page.getByLabel(/Advance amount/).fill("999999");
  await expect(page.getByText("can't be more than the order total")).toBeVisible();
  await expect(page.getByRole("button", { name: "Record payment" })).toBeDisabled();
});

test("manager sees the dashboard and finance pages", async ({ page }) => {
  await page.goto("/");
  await viewAs(page, "Manager");
  await expect(page.getByRole("heading", { name: "Showroom manager" })).toBeVisible();
  await expect(page.getByText("Rs. 1,285,000")).toBeVisible();

  await page.goto("/finance/cash-book");
  await expect(page.getByTestId("closing-cash")).toContainText("Rs. 178,000");

  await page.goto("/reports/profit-loss");
  await expect(page.getByTestId("net-profit")).toContainText("Rs. 300,000");
  await expect(page.getByText("36.7%")).toBeVisible();
});

test("admin sees the owner overview and users", async ({ page }) => {
  await page.goto("/");
  await viewAs(page, "Admin");
  await expect(page.getByRole("heading", { name: "Owner overview" })).toBeVisible();
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "Users & roles" })).toBeVisible();
});

const listPages = [
  ["/orders", "All orders"],
  ["/customers", "Customers"],
  ["/factory-orders", "Factory orders"],
  ["/receiving", "Receiving"],
  ["/deliveries", "Deliveries"],
  ["/expenses", "Expenses"],
] as const;

for (const [path, heading] of listPages) {
  test(`${path} loads without sideways scrolling`, async ({ page }) => {
    await page.goto("/");
    await viewAs(page, "Manager");
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
