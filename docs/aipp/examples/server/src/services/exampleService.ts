import { UserError, SystemError } from "../lib/errors.js";

export type CorrelationId = string;

export interface ExampleInput {
  userId: string;
  limit?: number; // 1..100 default 20
  correlationId: CorrelationId;
}

export interface ExampleOutput {
  items: Array<{ id: string; title: string; createdAt: string }>;
  nextCursor?: string;
}

/**
 * STAGE 3: Function signature & docstring only. Do NOT implement here.
 *
 * Fetches items for a user with pagination.
 * Preconditions:
 *  - userId is non-empty string
 *  - if provided, limit is between 1 and 100
 * Postconditions:
 *  - items length <= limit (default 20)
 * Errors:
 *  - UserError on invalid input
 *  - SystemError on transient DB failure
 */
export async function listUserItems(_input: ExampleInput): Promise<ExampleOutput> {
  throw new Error("Not implemented (Stage 3)");
}
