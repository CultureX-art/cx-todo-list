import { Router } from 'express';

import { container } from '../../container';
import { authenticationMiddleware } from '../../common/middleware/auth.middleware';
import { AuthenticatedRequest } from '../../common/types/express';

const router = Router();

// All task routes are protected
router.use(authenticationMiddleware);

// CRUD operations
router.post('/', (req, res) => container.taskController.createTask(req as AuthenticatedRequest, res));
router.get('/', (req, res) => container.taskController.listTasks(req as AuthenticatedRequest, res));
router.get('/:taskId', (req, res) => container.taskController.getTaskById(req as AuthenticatedRequest, res));
router.patch('/:taskId', (req, res) => container.taskController.updateTask(req as AuthenticatedRequest, res));
router.delete('/:taskId', (req, res) => container.taskController.deleteTask(req as AuthenticatedRequest, res));

export { router as taskRoutes };
