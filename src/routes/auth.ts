import * as express from 'express';
import { RequestHandler } from 'express';
import { signup, login } from '../controllers/authController';
import { validateSignup, validateLogin } from '../validators/authValidator';

const router = express.Router();

router.post('/signup', validateSignup, signup as unknown as RequestHandler);
router.post('/login', validateLogin, login as unknown as RequestHandler);

export default router;