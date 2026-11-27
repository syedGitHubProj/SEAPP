import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, type APIRequestContext, type Page } from "@playwright/test";

/** The sample staff from the API's seed-dev command (local only). */
export const staff = {
  admin: { userName: "admin", fullName: "Owner (Admin)" },
  manager: { userName: "manager", fullName: "Imran (Manager)" },
  salesman: { userName: "03001234567", fullName: "Bilal (Salesman)" },
} as const;

export type StaffRole = keyof typeof staff;

/** The local-only sample password, read from the API's development settings. */
export function devPassword(): string {
  const file = path.join(__dirname, "../../api/src/SellEase.Api/appsettings.Development.json");
  return JSON.parse(readFileSync(file, "utf8")).DevSeed.Password as string;
}

export const stateFile = (role: StaffRole) => `e2e/.auth/${role}.json`;

export async function signInByApi(request: APIRequestContext, role: StaffRole) {
  const response = await request.post("/api/auth/sign-in", { data: { userName: staff[role].userName, password: devPassword() } });
  expect(response.ok()).toBeTruthy();
}

export async function signInByForm(page: Page, userName: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Username or phone number").fill(userName);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** A name nobody else will have, so tests can run again on the same database. */
export const unique = (prefix: string) => `${prefix} ${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

export const randomPhone = () => `0300-${Math.floor(1_000_000 + Math.random() * 8_999_999)}`;

/** A real 1×1 PNG, small enough for any upload check. */
export const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);
