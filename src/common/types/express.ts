/**
 * Express.js Type Definitions
 *
 * Strict typing for Express middleware and error handlers.
 */

import { Request, Response, NextFunction } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { ParsedQs } from "qs";

// ============================================================================
// EXPRESS MIDDLEWARE TYPES
// ============================================================================

export interface TypedRequest<
  TBody = Record<string, string | number | boolean>,
  TQuery = ParsedQs,
  TParams = ParamsDictionary,
> extends Request<TParams, Record<string, never>, TBody, TQuery> {
  body: TBody;
  query: TQuery;
  params: TParams;
}

export interface TypedResponse<
  TData = Record<string, string | number | boolean | null>,
> extends Response {
  json: (body: TData) => this;
}

// ============================================================================
// ERROR HANDLER TYPES
// ============================================================================

export interface ExpressError {
  message: string;
  stack?: string;
  status?: number;
  statusCode?: number;
  name?: string;
  code?: string | number;
  [key: string]: string | number | boolean | null | undefined;
}

export type ExpressErrorHandler = (
  error: ExpressError,
  req: Request,
  res: Response,
  next: NextFunction,
) => void;

// ============================================================================
// ROUTE HANDLER TYPES
// ============================================================================

export type RouteHandler<TReq = Request, TRes = Response> = (
  req: TReq,
  res: TRes,
  next?: NextFunction,
) => void | Promise<void>;

export type AsyncRouteHandler<
  TBody = Record<string, string | number | boolean>,
  TQuery = ParsedQs,
  TParams = ParamsDictionary,
  TData = Record<string, string | number | boolean | null>,
> = (
  req: TypedRequest<TBody, TQuery, TParams>,
  res: TypedResponse<TData>,
  next: NextFunction,
) => Promise<void>;

// ============================================================================
// MIDDLEWARE TYPES
// ============================================================================

export type Middleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

export type AsyncMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface RequestWithUser extends Request {
  user?: {
    id: number;
    email: string;
  };
}

export interface AuthenticatedRequest<
  TBody = Record<string, string | number | boolean>,
> extends TypedRequest<TBody> {
  user: {
    id: number;
    email: string;
  };
}
