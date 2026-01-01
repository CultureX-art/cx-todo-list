import "../../../types/express.d.ts";
import { Request, Response, NextFunction } from "express";
import { IAuthService } from "../services/auth.service";
import { LoginRequest, SignupRequest } from "../api/types";
import { ServiceContext } from "../../common/types/service";
import { createSuccessResponse } from "../../common/factory/response.factory";

export class AuthController {
  constructor(private readonly authService: IAuthService) {}

  signup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signupRequest: SignupRequest = req.body;
      const context: ServiceContext = {
        correlationId: req.correlationId,
        // No user context during signup
        timestamp: new Date(),
      };

      const signupResponse = await this.authService.signup(
        signupRequest,
        context,
      );

      res.status(201).json(createSuccessResponse(signupResponse));
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const loginRequest: LoginRequest = req.body;
      const context: ServiceContext = {
        correlationId: req.correlationId,
        timestamp: new Date(),
      };

      const loginResponse = await this.authService.login(loginRequest, context);

      res.status(200).json(createSuccessResponse(loginResponse));
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // The user ID is extracted from the validated JWT payload by the auth middleware
      const userId = req.user?.sub;
      if (!userId) {
        // This should theoretically not be reached if auth middleware is working
        return res.status(401).json({ error: "Unauthorized" });
      }

      const context: ServiceContext = {
        correlationId: req.correlationId,
        user: req.user,
        timestamp: new Date(),
      };

      const userProfile = await this.authService.getUserProfile(
        userId,
        context,
      );

      if (!userProfile) {
        // This case might occur if the user was deleted after the token was issued
        return res.status(404).json({ error: "User not found" });
      }

      return res.status(200).json(createSuccessResponse(userProfile));
    } catch (error) {
      return next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokenJti = req.user?.jti;
      if (!tokenJti) {
        // This should not be reached if auth middleware is working
        return res.status(400).json({ error: "Invalid token" });
      }

      const context: ServiceContext = {
        correlationId: req.correlationId,
        user: req.user,
        timestamp: new Date(),
      };

      await this.authService.revokeToken(tokenJti, context);

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };
}