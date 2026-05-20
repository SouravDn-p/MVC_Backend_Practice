import { Router } from 'express';
import { AuthController } from './auth.controller.ts';
import { validate } from '../../common/middlewares/validate.middleware.ts';
import { registerDto } from './dto/register.dto.ts';
import { loginDto } from './dto/login.dto.ts';
import { protect } from '../../common/middlewares/auth.middleware.ts';

const router = Router();
const authController = new AuthController();

/**
 * @openapi
 * tags:
 *   name: Auth
 *   description: Authentication management APIs
 */

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account and receive authentication tokens.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: Full name of the user (2 to 50 characters)
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Unique email address
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Strong password (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character)
 *                 example: P@ssword123!
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Account created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: 64b3c41ef74a81383cd89a81
 *                         name:
 *                           type: string
 *                           example: John Doe
 *                         email:
 *                           type: string
 *                           example: john.doe@example.com
 *                         role:
 *                           type: string
 *                           example: user
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                         refreshToken:
 *                           type: string
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 */
router.post('/register', validate(registerDto), (req, res, next) => authController.register(req, res, next));

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Log in an existing user
 *     description: Authenticate user using email and password, returning tokens.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: P@ssword123!
 *     responses:
 *       200:
 *         description: Logged in successfully
 *       401:
 *         description: Invalid email or password
 */
router.post('/login', validate(loginDto), (req, res, next) => authController.login(req, res, next));

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Log out the current user
 *     description: Invalidate user refresh token on the database and clear cookies.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', protect, (req, res, next) => authController.logout(req, res, next));

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Refresh JWT access token
 *     description: Provide a valid refresh token (either in body or cookies) to obtain a new set of tokens.
 *     tags: [Auth]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));

export default router;