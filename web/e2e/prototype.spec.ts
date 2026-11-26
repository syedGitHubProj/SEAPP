import { expect, test, type Page } from "@playwright/test";

async function viewAs(page: Page, role: "Salesman" | "Manager" | "Admin") {
  await page.getByRole("combobox", { name: "Viewing as" }).first().selectOption({ label: role });
}

test("salesman creates a sales order, then a linked factory (purchase) order", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Good afternoon, Ali/ })).toBeVisible();

  // Sales order: design, options and an agreed price below the catalogue price.
  await page.goto("/catalog");
  await page.getByRole("link", { name: "Select Royal Sofa Set" }).click();
  await expect(page.getByRole("heading", { name: "Royal Sofa Set" })).toBeVisible();
  await page.getByRole("checkbox", { name: "Centre table" }).check();
  await page.getByRole("checkbox", { name: "Side tables (pair)" }).check();
  const agreed = page.getByLabel(/Agreed selling price/);
  await expect(agreed).toHaveValue("228000");
  await agreed.fill("220000");
  await expect(page.getByText("Discount from catalogue")).toBeVisible();
  await page.getByRole("button", { name: "Add to order" }).click();

  await expect(page).toHaveURL(/\/orders\/new$/);
  const next = page.getByRole("button", { name: "Save & receive advance" });
  await expect(next).toBeDisabled();
  await page.getByRole("combobox", { name: /Choose customer/ }).selectOption({ label: "Mr. Imran Khan — 0321-4567890" });
  await page.getByLabel(/Expected delivery/).fill("2026-12-20");
  await next.click();

  await expect(page.getByRole("heading", { name: "Receive advance" })).toBeVisible();
  await page.getByLabel(/Advance amount/).fill("80000");
  await expect(page.getByText("Rs. 140,000")).toBeVisible();
  await page.getByRole("button", { name: "Record payment" }).click();

  await expect(page.getByRole("heading", { name: "Order created successfully!" })).toBeVisible();
  await expect(page.getByText("SO-000145")).toBeVisible();

  // Purchase order against that sales order.
  await page.getByRole("link", { name: "Create factory order" }).click();
  await expect(page.getByRole("heading", { name: "New factory order" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: /For sales order/ })).toHaveValue("SO-000145");
  const create = page.getByRole("button", { name: "Create factory order" });
  await expect(create).toBeDisabled();
  await page.getByLabel(/Factory cost per piece for Royal Sofa Set/).fill("140000");
  await page.getByRole("combobox", { name: /^Factory/ }).selectOption("Chiniot Royal Works");
  await page.getByLabel(/Expected completion/).fill("2026-12-10");
  await expect(page.getByText("Rs. 80,000").first()).toBeVisible(); // margin on these items
  await create.click();

  // Back on the sales order: the line now shows its factory order and cost.
  await expect(page.getByRole("heading", { name: "Sales order SO-000145" })).toBeVisible();
  await expect(page.getByRole("link", { name: "PO-000037" }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText("Factory ordered").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Create factory order" })).toHaveCount(0);

  // The factory orders list shows the link back to the sales order.
  await page.goto("/factory-orders");
  await expect(page.getByText("PO-000037").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "SO-000145" }).filter({ visible: true }).first()).toBeVisible();
});

test("an existing sales order can be split across factories", async ({ page }) => {
  await page.goto("/factory-orders/new?so=SO-000144");
  await expect(page.getByRole("combobox", { name: /For sales order/ })).toHaveValue("SO-000144");
  await page.getByLabel(/Factory cost per piece for Luxury Bedroom Set/).fill("150000");
  await page.getByRole("combobox", { name: /^Factory/ }).selectOption("Gujrat Furniture House");
  await page.getByLabel(/Expected completion/).fill("2026-12-15");
  await page.getByRole("button", { name: "Create factory order" }).click();
  await expect(page.getByRole("heading", { name: "Sales order SO-000144" })).toBeVisible();
  await expect(page.getByText("Rs. 90,000").filter({ visible: true }).first()).toBeVisible(); // 240,000 - 150,000
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
