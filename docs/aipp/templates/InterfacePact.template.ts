/**
 * Interface Pact (frozen after Stage 3)
 * - Pre-conditions:
 * - Post-conditions:
 * - Errors:
 * - Examples:
 */

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
 * Fetches items for a user with pagination.
 * @throws UserError on invalid input; SystemError on transient failures.
 */
export async function listUserItems(input: ExampleInput): Promise<ExampleOutput> {
  // IMPLEMENTATION COMES IN STAGE 5
  throw new Error("Not implemented");
}
