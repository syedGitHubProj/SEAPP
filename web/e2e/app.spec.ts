import { expect, test } from "@playwright/test";
import { devPassword, randomPhone, signInByForm, staff, stateFile, tinyPng, unique } from "./helpers";

// Most tests run signed in as the salesman (see playwright.config.ts); others switch role below.

test.describe("signing in", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("signed-out visitors are sent to sign-in, and a wrong password is refused", async ({ page }) => {
    await page.goto("/customers");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fcustomers/);
    await signInByForm(page, "nobody-here", "wrong-password");
    await expect(page.getByText("That username or password is not right.")).toBeVisible();
  });

  test("a salesman signs in with a phone number typed with a dash, and signs out", async ({ page }) => {
    await page.goto("/catalog");
    await page.getByLabel("Username or phone number").fill("0300-1234567");
    await page.getByLabel("Password").fill(devPassword());
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/catalog$/);
    await expect(page.getByRole("heading", { name: "Furniture catalogue", level: 1 })).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).first().click();
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

test("salesman creates a Sale Order, then a linked factory order", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Bilal/ })).toBeVisible();

  // Sale Order: design and options. A salesman sees no catalogue prices and types the agreed price.
  await page.goto("/catalog");
  await page.getByRole("link", { name: "Select Royal Sofa Set" }).click();
  await expect(page.getByRole("heading", { name: "Royal Sofa Set" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "3 seater sofa" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Centre table" })).not.toBeChecked();
  await page.getByRole("checkbox", { name: "Centre table" }).check();
  await page.getByRole("checkbox", { name: "Side table" }).check();
  await page.getByRole("button", { name: "More: Side table" }).click();
  await expect(page.getByLabel("How many: Side table")).toHaveText("2");
  await expect(page.getByText("6 items chosen")).toBeVisible();
  // No catalogue price and no option prices; only the total of the typed agreed price shows.
  await expect(page.getByText("Catalogue price")).toHaveCount(0);
  await expect(page.getByText("Rs.")).toHaveText(["Rs. 0"]);
  const agreed = page.getByLabel(/Agreed selling price/);
  await expect(agreed).toHaveValue("");
  const add = page.getByRole("button", { name: "Add to Sale Order" });
  await expect(add).toBeDisabled();
  await agreed.fill("220000");
  await expect(page.getByText("Discount from catalogue")).toHaveCount(0);
  await add.click();

  await expect(page).toHaveURL(/\/orders\/new$/);
  const next = page.getByRole("button", { name: "Save & receive advance" });
  await expect(next).toBeDisabled();
  // Part of the number finds nobody; the full number, typed any way, finds the customer.
  const phone = page.getByLabel(/Customer's phone number/);
  await phone.fill("4567890");
  await page.getByRole("button", { name: "Find" }).click();
  await expect(page.getByText("No customer has this number.")).toBeVisible();
  await phone.fill("+92 321 4567890");
  await page.getByRole("button", { name: "Find" }).click();
  await page.getByRole("list", { name: "Customer with this number" }).getByRole("button", { name: /Mr\. Imran Khan/ }).click();
  await expect(page.getByRole("button", { name: "Change" })).toBeVisible();
  await page.getByLabel(/Expected delivery/).fill("2026-12-20");
  await next.click();

  await expect(page.getByRole("heading", { name: "Receive advance" })).toBeVisible();
  await page.getByLabel(/Advance amount/).fill("80000");
  await expect(page.getByText("Rs. 140,000")).toBeVisible();
  await page.getByRole("button", { name: "Record payment" }).click();

  await expect(page.getByRole("heading", { name: "Sale Order created successfully!" })).toBeVisible();
  await expect(page.getByText("SO-000145")).toBeVisible();

  // Factory order against that Sale Order, using a factory from the database.
  await page.getByRole("link", { name: "Create factory order" }).click();
  await expect(page.getByRole("combobox", { name: /For Sale Order/ })).toHaveValue("SO-000145");
  await page.getByLabel(/Factory cost per piece for Royal Sofa Set/).fill("140000");
  await page.getByRole("combobox", { name: /^Factory/ }).selectOption("Chiniot Royal Works");
  await page.getByLabel(/Expected completion/).fill("2026-12-10");
  await expect(page.getByText("Rs. 80,000").first()).toBeVisible(); // margin on these items
  await page.getByRole("button", { name: "Create factory order" }).click();

  await expect(page.getByRole("heading", { name: "Sale Order SO-000145" })).toBeVisible();
  await expect(page.getByRole("link", { name: "PO-000037" }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText("Factory ordered").filter({ visible: true }).first()).toBeVisible();
});

test.describe("as manager, a Sale Order", () => {
  test.use({ storageState: stateFile("manager") });
  test("can be split across factories", async ({ page }) => {
  await page.goto("/factory-orders/new?so=SO-000144");
  await expect(page.getByRole("combobox", { name: /For Sale Order/ })).toHaveValue("SO-000144");
  await page.getByLabel(/Factory cost per piece for Luxury Bedroom Set/).fill("150000");
  await page.getByRole("combobox", { name: /^Factory/ }).selectOption("Gujrat Furniture House");
  await page.getByLabel(/Expected completion/).fill("2026-12-15");
  await page.getByRole("button", { name: "Create factory order" }).click();
  await expect(page.getByRole("heading", { name: "Sale Order SO-000144" })).toBeVisible();
  await expect(page.getByText("Rs. 90,000").filter({ visible: true }).first()).toBeVisible(); // 240,000 - 150,000
  });
});

test("a customer not found by phone is added during the Sale Order, and found next time", async ({ page }) => {
  const name = unique("Walk-in");
  const number = randomPhone();
  await page.goto("/catalog/LV-402");
  await page.getByLabel(/Agreed selling price/).fill("42000");
  await page.getByRole("button", { name: "Add to Sale Order" }).click();
  await page.getByLabel(/Customer's phone number/).fill(number);
  await page.getByRole("button", { name: "Find" }).click();
  await page.getByRole("button", { name: "Add as new customer" }).click();
  await expect(page.getByLabel(/^Phone/)).toHaveValue(number);
  await page.getByLabel(/Customer name/).fill(name);
  await page.getByLabel(/Expected delivery/).fill("2026-12-20");
  await page.getByRole("button", { name: "Save & receive advance" }).click();

  await page.getByLabel(/Advance amount/).fill("999999");
  await expect(page.getByText("can't be more than the Sale Order total")).toBeVisible();
  await expect(page.getByRole("button", { name: "Record payment" })).toBeDisabled();
  await page.getByLabel(/Advance amount/).fill("10000");
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByRole("heading", { name: "Sale Order created successfully!" })).toBeVisible();

  await page.goto("/catalog/LV-402");
  await page.getByLabel(/Agreed selling price/).fill("42000");
  await page.getByRole("button", { name: "Add to Sale Order" }).click();
  await page.getByLabel(/Customer's phone number/).fill(number.replace("-", " "));
  await page.getByRole("button", { name: "Find" }).click();
  await expect(page.getByRole("list", { name: "Customer with this number" }).getByRole("button", { name: new RegExp(name) })).toHaveCount(1);
});

test("salesman adds an other item (a mirror) to the Sale Order without seeing its price", async ({ page }) => {
  await page.goto("/catalog");
  await page.getByRole("button", { name: /^Other items/ }).click();
  await page.getByRole("link", { name: "Select Mirror" }).click();
  await expect(page.getByRole("heading", { name: "Mirror" })).toBeVisible();
  await expect(page.getByText("Catalogue price")).toHaveCount(0);
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByLabel(/Agreed selling price/).fill("7000");
  await expect(page.getByText("Rs. 14,000")).toBeVisible();
  await page.getByRole("button", { name: "Add to Sale Order" }).click();
  await expect(page).toHaveURL(/\/orders\/new$/);
  await expect(page.getByText("Mirror", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Rs. 14,000").first()).toBeVisible();
});

test("salesman has no customer list", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Customers" })).toHaveCount(0);
  await page.goto("/customers");
  await expect(page.getByText("Your role isn't allowed to do this.")).toBeVisible();
  expect((await page.request.get("/api/customers")).status()).toBe(403);
});

test("salesman can't add designs or manage factories", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page.getByRole("link", { name: "Select Royal Sofa Set" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Add design" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^Edit design/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Factories" })).toHaveCount(0);
  await page.goto("/factories");
  await expect(page.getByText("Only Managers and Admin can manage factories.")).toBeVisible();
});

test.describe("as manager", () => {
  test.use({ storageState: stateFile("manager") });

  test("sees the dashboard and finance pages", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Showroom manager" })).toBeVisible();
    await page.goto("/finance/cash-book");
    await expect(page.getByTestId("closing-cash")).toContainText("Rs. 178,000");
    await page.goto("/reports/profit-loss");
    await expect(page.getByTestId("net-profit")).toContainText("Rs. 300,000");
  });

  test("edits customers but cannot add one from the customer list", async ({ page }) => {
    const name = unique("Aa Test Buyer");
    const created = await page.request.post("/api/customers", { data: { name, phone: randomPhone() } });
    expect(created.ok()).toBeTruthy();

    await page.goto("/customers");
    await expect(page.getByRole("heading", { name: "Customers", level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /Add customer/ })).toHaveCount(0);
    await page.getByRole("searchbox", { name: "Search", exact: true }).fill(name);
    await expect(page.getByText(/CU-\d{6}/).filter({ visible: true }).first()).toBeVisible();
    await page.getByRole("button", { name: `Edit ${name}` }).filter({ visible: true }).click();
    await page.getByLabel(/^Phone/).fill("12");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Enter a full phone number")).toBeVisible();
    await page.getByLabel(/^Phone/).fill(randomPhone());
    await page.getByLabel(/^Address/).fill("Gulberg III");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Gulberg III").filter({ visible: true })).toBeVisible();
  });

  test("a switched-off customer is not found on new Sale Orders until switched on", async ({ page }) => {
    const name = unique("Aa Leaver");
    const number = randomPhone();
    const created = await page.request.post("/api/customers", { data: { name, phone: number } });
    expect(created.ok()).toBeTruthy();

    await page.goto("/customers");
    await page.getByRole("searchbox", { name: "Search", exact: true }).fill(name);
    page.once("dialog", (d) => void d.accept());
    await page.getByRole("button", { name: `Switch off: ${name}` }).filter({ visible: true }).click();
    await expect(page.getByText("No customers found.").filter({ visible: true })).toBeVisible();

    await page.goto("/catalog/LV-402");
    await page.getByRole("button", { name: "Add to Sale Order" }).click();
    await page.getByLabel(/Customer's phone number/).fill(number);
    await page.getByRole("button", { name: "Find" }).click();
    await expect(page.getByText("No customer has this number.")).toBeVisible();

    await page.goto("/customers");
    await page.getByRole("searchbox", { name: "Search", exact: true }).fill(name);
    await page.getByLabel("Show switched-off records").check();
    await page.getByRole("button", { name: `Switch on: ${name}` }).filter({ visible: true }).click();
    await page.getByLabel("Show switched-off records").uncheck();
    await expect(page.getByRole("button", { name: `Switch off: ${name}` }).filter({ visible: true })).toBeVisible();
  });

  test("adds a factory and can order from it", async ({ page }) => {
    const name = unique("Sialkot Wood");
    await page.goto("/factories");
    await page.getByRole("button", { name: "Add factory" }).click();
    await page.getByLabel(/^Factory name/).fill(name);
    await page.getByLabel(/^Phone/).fill(randomPhone());
    await page.getByLabel(/^City/).fill("Sialkot");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(name).filter({ visible: true })).toBeVisible();

    await page.goto("/factory-orders/new?so=SO-000144");
    await page.getByRole("combobox", { name: /^Factory/ }).selectOption(name);

    // Switched off, it is no longer offered for new factory orders.
    await page.goto("/factories");
    page.once("dialog", (d) => void d.accept());
    await page.getByRole("button", { name: `Switch off: ${name}` }).filter({ visible: true }).click();
    await expect(page.getByText(name).filter({ visible: true })).toHaveCount(0);
    await page.goto("/factory-orders/new?so=SO-000144");
    await expect(page.getByRole("combobox", { name: /^Factory/ }).getByRole("option", { name })).toHaveCount(0);
  });

  test("adds, renames and switches off a catalogue category", async ({ page }) => {
    const name = unique("Outdoor");
    await page.goto("/catalog");
    await page.getByRole("link", { name: "Categories" }).click();
    await expect(page.getByRole("heading", { name: "Catalogue categories", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Add category" }).click();
    await page.getByLabel(/^Name/).fill(name);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(name).filter({ visible: true })).toBeVisible();

    await page.getByRole("button", { name: `Edit ${name}` }).filter({ visible: true }).click();
    await page.getByLabel(/^Name/).fill(`${name} Garden`);
    await page.getByRole("button", { name: "Save" }).click();
    await page.goto("/catalog");
    await expect(page.getByRole("button", { name: new RegExp(`${name} Garden`) })).toBeVisible();

    await page.goto("/catalog/categories");
    page.once("dialog", (d) => void d.accept());
    await page.getByRole("button", { name: `Switch off: ${name} Garden` }).filter({ visible: true }).click();
    await expect(page.getByRole("button", { name: `Switch on: ${name} Garden` }).filter({ visible: true })).toBeVisible();
    await page.goto("/catalog");
    await expect(page.getByRole("heading", { name: "Furniture catalogue" })).toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(`${name} Garden`) })).toHaveCount(0);
  });

  test("adds a design with items, options and a photo, and a salesman can sell it", async ({ page, browser }) => {
    const code = `T-${Date.now().toString().slice(-6)}`;
    const chair = unique("Lounge chair");
    const cushion = unique("Cushion");

    // The Living category's item list gets two new items.
    await page.goto("/catalog/categories");
    await page.getByRole("button", { name: "Items for Living" }).filter({ visible: true }).click();
    const items = page.getByRole("region", { name: "Items for Living" });
    for (const name of [chair, cushion]) {
      await items.getByRole("button", { name: "Add item" }).click();
      await page.getByLabel(/^Item name/).fill(name);
      await page.getByRole("button", { name: "Save" }).click();
      await expect(items.getByText(name)).toBeVisible();
    }

    await page.goto("/catalog");
    await page.getByRole("link", { name: "Add design" }).click();
    await expect(page.getByLabel(/^Base price/)).toHaveCount(0);
    await expect(page.getByLabel(/^Dimensions/)).toHaveCount(0);
    await page.getByLabel(/^Design code/).fill(code);
    await page.getByLabel(/^Design name/).fill(`Test Chair ${code}`);
    await page.getByLabel(/^Category/).selectOption({ label: "Living" });
    await page.getByRole("checkbox", { name: chair, exact: true }).check();
    await page.getByLabel(`Price for ${chair}`).fill("50000");
    await page.getByLabel(`Ticked by default: ${chair}`).check();
    await page.getByRole("checkbox", { name: cushion, exact: true }).check();
    await page.getByLabel(`Price for ${cushion}`).fill("2000");
    await expect(page.getByText("Rs. 50,000")).toBeVisible(); // price of the items ticked by default
    await page.getByRole("button", { name: "Add material" }).click();
    await page.getByRole("textbox", { name: "Material" }).fill("Leather");
    await page.getByRole("textbox", { name: "Extra charge" }).fill("5000");
    await page.getByRole("button", { name: "Save design" }).click();

    // Saved: the editor reopens for the new design so photos can be added.
    await expect(page.getByRole("heading", { name: `Edit ${code}` })).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles({ name: "chair.png", mimeType: "image/png", buffer: tinyPng });
    await expect(page.getByAltText("Main photo")).toBeVisible();

    // The manager sees the catalogue price of the chosen items.
    await page.goto(`/catalog/${code}`);
    await expect(page.getByRole("checkbox", { name: chair })).toBeChecked();
    await page.getByRole("checkbox", { name: cushion }).check();
    await page.getByRole("button", { name: `More: ${cushion}` }).click();
    await expect(page.getByLabel(/Agreed selling price/)).toHaveValue("59000"); // 50,000 + 2 × 2,000 + 5,000 leather

    // A salesman sees it with its photo, but no prices.
    const salesman = await browser.newContext({ storageState: stateFile("salesman") });
    const sp = await salesman.newPage();
    await sp.goto(`/catalog/${code}`);
    await expect(sp.getByRole("heading", { name: `Test Chair ${code}` })).toBeVisible();
    await expect(sp.getByRole("img", { name: `Test Chair ${code}` }).first()).toBeVisible();
    await expect(sp.getByRole("checkbox", { name: chair })).toBeChecked();
    await sp.getByRole("checkbox", { name: cushion }).check();
    await expect(sp.getByLabel(/Agreed selling price/)).toHaveValue("");
    await expect(sp.getByText("Catalogue price")).toHaveCount(0);
    await expect(sp.getByText("Rs.")).toHaveText(["Rs. 0"]);
    await salesman.close();
  });

  test("a duplicate design code is refused with a clear message", async ({ page }) => {
    await page.goto("/catalog/edit");
    await page.getByLabel(/^Design code/).fill("SF-310");
    await page.getByLabel(/^Design name/).fill("Copy");
    await page.getByLabel(/^Category/).selectOption({ label: "Sofa" });
    await page.getByRole("button", { name: "Save design" }).click();
    await expect(page.getByText("Please check the highlighted fields.")).toBeVisible(); // no items yet
    await page.getByRole("checkbox", { name: "3 seater sofa", exact: true }).check();
    await page.getByLabel("Price for 3 seater sofa").fill("1000");
    await page.getByRole("button", { name: "Save design" }).click();
    await expect(page.getByText("That name or code is already used.")).toBeVisible();
  });

  test("adds, prices and switches off an other item", async ({ page }) => {
    const name = unique("Wall clock");
    await page.goto("/catalog");
    await page.getByRole("link", { name: "Other items" }).click();
    await expect(page.getByRole("heading", { name: "Other items", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Add item" }).click();
    await page.getByLabel(/^Name/).fill(name);
    await page.getByLabel(/^Price/).fill("4,500");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(name).filter({ visible: true })).toBeVisible();
    await expect(page.getByText("Rs. 4,500").filter({ visible: true }).first()).toBeVisible();

    page.once("dialog", (d) => void d.accept());
    await page.getByRole("button", { name: `Switch off: ${name}` }).filter({ visible: true }).click();
    await expect(page.getByRole("button", { name: `Switch on: ${name}` }).filter({ visible: true })).toBeVisible();
    await page.goto("/catalog");
    await page.getByRole("button", { name: /^Other items/ }).click();
    await expect(page.getByRole("link", { name: "Select Mirror" })).toBeVisible();
    await expect(page.getByRole("link", { name: `Select ${name}` })).toHaveCount(0);
  });

  test("can't open staff accounts, settings or the audit log", async ({ page }) => {
    for (const path of ["/admin/users", "/admin/settings", "/admin/audit"]) {
      await page.goto(path);
      await expect(page.getByText("Your role isn't allowed to do this.")).toBeVisible();
    }
  });
});

test.describe("as admin", () => {
  test.use({ storageState: stateFile("admin") });

  test("sees the owner overview and every screen", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Owner overview" })).toBeVisible();
    await page.goto("/catalog");
    await expect(page.getByRole("link", { name: "Add design" })).toBeVisible();
    await page.goto("/factories");
    await expect(page.getByRole("button", { name: "Add factory" })).toBeVisible();
    await page.goto("/orders");
    await expect(page.getByRole("link", { name: "New Sale Order" }).filter({ visible: true }).first()).toBeVisible();
  });

  test("settings check the currency code and save", async ({ page }) => {
    // Saves the same values back, so tests running at the same time still see "Rs.".
    await page.goto("/admin/settings");
    const code = page.getByLabel(/^Currency code/);
    await expect(code).toHaveValue("PKR");
    await code.fill("rupees");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Not valid")).toBeVisible();
    await code.fill("PKR");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved. Amounts now show like Rs. 228,000.")).toBeVisible();
    await expect(page.getByText("Asia/Karachi")).toBeVisible();
  });

  test("the audit log shows who changed a customer", async ({ page }) => {
    const name = unique("Audited Buyer");
    const created = await page.request.post("/api/customers", { data: { name, phone: randomPhone() } });
    expect(created.ok()).toBeTruthy();

    await page.goto("/admin/audit");
    await page.getByLabel("Kind of record").selectOption("Customer");
    await page.getByLabel("Changed by").selectOption(staff.admin.userName);
    const entry = page.getByRole("listitem").filter({ hasText: name }).first();
    await expect(entry).toContainText("Added Customer");
    await expect(entry).toContainText(/CU-\d{6}/);
    await expect(entry).toContainText(staff.admin.userName);
  });

  test("creates a staff account that can then sign in", async ({ page, browser }) => {
    const fullName = unique("New Salesman");
    const userName = `staff${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
    const password = `pw-${Date.now().toString(36)}`;
    await page.goto("/admin/users");
    await expect(page.getByText(staff.admin.fullName).filter({ visible: true })).toBeVisible();
    await page.getByRole("button", { name: "Add staff member" }).click();
    await page.getByLabel(/^Full name/).fill(fullName);
    await page.getByLabel(/^Username or phone number/).fill(userName);
    await page.getByLabel(/^First password/).fill(password);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(fullName).filter({ visible: true })).toBeVisible();

    const fresh = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const fp = await fresh.newPage();
    await signInByForm(fp, userName, password);
    await expect(fp.getByRole("heading", { name: new RegExp(fullName.split(" ")[0]) })).toBeVisible();
    await fresh.close();
  });
});

const listPages = [
  ["/orders", "All Sale Orders"],
  ["/customers", "Customers"],
  ["/factories", "Factories"],
  ["/catalog", "Furniture catalogue"],
  ["/factory-orders", "Factory orders"],
  ["/receiving", "Receiving"],
  ["/deliveries", "Deliveries"],
  ["/expenses", "Expenses"],
  ["/admin/users", "Users & roles"],
  ["/admin/settings", "Settings"],
  ["/admin/audit", "Audit log"],
  ["/catalog/categories", "Catalogue categories"],
  ["/catalog/other-items", "Other items"],
] as const;

test.describe("layout", () => {
  test.use({ storageState: stateFile("admin") });
  for (const [path, heading] of listPages) {
    test(`${path} loads without sideways scrolling`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
