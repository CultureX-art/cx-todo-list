import * as express from 'express';
import { RequestHandler } from 'express';
import { getTasks, createTask, updateTask, deleteTask } from '../controllers/taskController';
import { authenticate } from '../middlewares/authenticate';
import { validateCreateTask, validateUpdateTask, validateTaskQuery } from '../validators/taskValidator';

const router = express.Router();

router.use(authenticate);

router.get('/', validateTaskQuery, getTasks as unknown as RequestHandler);
router.post('/', validateCreateTask, createTask as unknown as RequestHandler);
router.patch('/:taskId', validateUpdateTask, updateTask as unknown as RequestHandler);
router.delete('/:taskId', deleteTask as unknown as RequestHandler);

export default router;