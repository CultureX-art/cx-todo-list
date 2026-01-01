import { Router } from 'express';
import { authRoutes } from '../auth/routes/auth.routes';
import { healthRoutes } from '../health/routes/health.routes';
import { taskRoutes } from '../task/routes/task.routes';

const api = Router();

// Health check routes
api.use('/health', healthRoutes);

// V1 routes
const v1 = Router();
v1.use('/auth', authRoutes);
v1.use('/tasks', taskRoutes);

// Mount v1 routes under /v1 prefix
api.use('/v1', v1);

export { api as apiRoutes };
