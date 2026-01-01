/**
 * Express Request Type Extensions
 *
 * This declaration file extends the global Express Request interface to include
 * custom properties attached by middleware, ensuring type safety throughout the
 * application.
 */

import { JwtPayload } from "../../auth/api/types";

declare global {
  namespace Express {
    export interface Request {
      /**
       * A unique identifier for tracing a request through the system.
       * Attached by the correlationIdMiddleware.
       */
      correlationId: string;

      /**
       * The decoded JWT payload for an authenticated user.
       * Attached by the authenticationMiddleware.
       */
      user?: JwtPayload;
    }
  }
}