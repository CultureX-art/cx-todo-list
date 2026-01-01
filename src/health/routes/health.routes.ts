import { Router } from 'express';
import { container } from '../../container';

const router = Router();

// Health check routes
router.get('/', container.healthController.getHealth);

export { router as healthRoutes };
