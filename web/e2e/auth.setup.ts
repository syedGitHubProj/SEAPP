import { test as setup } from "@playwright/test";
import { signInByApi, stateFile, type StaffRole } from "./helpers";

// Signs in once per role and saves the session cookie for the other tests.
for (const role of ["salesman", "manager", "admin"] as StaffRole[]) {
  setup(`sign in as ${role}`, async ({ request }) => {
    await signInByApi(request, role);
    await request.storageState({ path: stateFile(role) });
  });
}
