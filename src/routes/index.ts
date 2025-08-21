import * as express from 'express';
import { Request, Response } from 'express';
import authRoutes from './auth';
import taskRoutes from './tasks';
import userRoutes from './user';
import { getHealth } from '../controllers/healthController';

const router = express.Router();

router.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'API is running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/auth',
      tasks: '/tasks',
      user: '/me'
    }
  });
});

router.get('/health', getHealth);

router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/', userRoutes);

export default router;