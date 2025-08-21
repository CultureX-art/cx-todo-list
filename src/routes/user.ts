import * as express from 'express';
import { RequestHandler } from 'express';
import { getCurrentUser } from '../controllers/userController';
import { authenticate } from '../middlewares/authenticate';

const router = express.Router();

router.get('/me', authenticate, getCurrentUser as unknown as RequestHandler);

export default router;