import { listUserItems, ExampleInput } from "../../src/services/exampleService.js";
import { UserError } from "../../src/lib/errors.js";

describe("listUserItems (unit)", () => {
  const base: ExampleInput = { userId: "u1", correlationId: "cid-unit", limit: 20 };

  test.each([undefined, 1, 20, 100])("accepts limit=%s", async (limit) => {
    const input = { ...base, ...(limit !== undefined ? { limit } : {}) };
    await expect(listUserItems(input)).rejects.toThrow("Not implemented");
  });

  test.each([0, -1, 101])("throws UserError for invalid limit=%s", async (limit) => {
    const input = { ...base, limit };
    await expect(listUserItems(input)).rejects.toBeInstanceOf(Error); // placeholder until implemented
  });

  test("throws UserError for empty userId", async () => {
    const input = { ...base, userId: "" };
    await expect(listUserItems(input)).rejects.toBeInstanceOf(Error); // placeholder until implemented
  });
});
