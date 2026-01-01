import { Router } from 'express';
import { container } from '../../container';
import { authenticationMiddleware } from '../../common/middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/signup', container.authController.signup);
router.post('/login', container.authController.login);

// Protected routes
router.get('/profile', authenticationMiddleware, container.authController.getProfile);
router.post('/logout', authenticationMiddleware, container.authController.logout);

export { router as authRoutes };
