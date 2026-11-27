import { describe, expect, it } from "vitest";
import { describeChanges, fieldLabel } from "./audit";

describe("fieldLabel", () => {
  it("splits field names into words", () => {
    expect(fieldLabel("BasePrice")).toBe("Base price");
    expect(fieldLabel("IsActive")).toBe("Is active");
    expect(fieldLabel("role")).toBe("Role");
  });
});

describe("describeChanges", () => {
  it("shows a change as from → to", () => {
    expect(describeChanges('{"Name":{"from":"Sofa","to":"Sofas"},"IsActive":{"from":true,"to":false}}')).toEqual([
      { field: "Name", from: "Sofa", to: "Sofas" },
      { field: "Is active", from: "yes", to: "no" },
    ]);
  });

  it("lists a new record's values but hides internal ids and housekeeping", () => {
    const json = JSON.stringify({ Id: "x", BranchId: "y", Name: "Ahmed", Phone: "0300", Address: null, CreatedAt: "2026-11-27" });
    expect(describeChanges(json)).toEqual([
      { field: "Name", to: "Ahmed" },
      { field: "Phone", to: "0300" },
      { field: "Address", to: "—" },
    ]);
  });

  it("copes with named actions and empty rows", () => {
    expect(describeChanges('{"from":"Salesman","to":"Manager"}')).toEqual([{ field: "", from: "Salesman", to: "Manager" }]);
    expect(describeChanges('{"role":"Salesman"}')).toEqual([{ field: "Role", to: "Salesman" }]);
    expect(describeChanges(null)).toEqual([]);
  });
});
