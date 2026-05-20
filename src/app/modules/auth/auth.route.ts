import { Router } from 'express';
import { AuthController } from './auth.controller.ts';
import { validate } from '../../common/guards/validate.middleware.ts';
import { registerDto } from './dto/register.dto.ts';
import { loginDto } from './dto/login.dto.ts';
import { protect } from '../../common/middlewares/auth.middleware.ts';

const router = Router();
const authController = new AuthController();

// Authentication Endpoints
router.post('/register', validate(registerDto), (req, res, next) => authController.register(req, res, next));
router.post('/login', validate(loginDto), (req, res, next) => authController.login(req, res, next));
router.post('/logout', protect, (req, res, next) => authController.logout(req, res, next));
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));

export default router;