import { Router } from 'express';
import { UsersController } from './users.controller.ts';
import { protect, restrictTo } from '../../common/middlewares/auth.middleware.ts';
import { validate } from '../../common/middlewares/validate.middleware.ts';
import { updateUserDto } from './dto/update-user.dto.ts';

const router = Router();
const usersController = new UsersController();

/**
 * @openapi
 * tags:
 *   name: Users
 *   description: User profile and management APIs
 */

/**
 * @openapi
 * /users/me:
 *   get:
 *     summary: Get currently authenticated user profile
 *     description: Retrieve details of the user associated with the active session token.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
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
 *                   example: User fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: 64b3c41ef74a81383cd89a81
 *                     name:
 *                       type: string
 *                       example: John Doe
 *                     email:
 *                       type: string
 *                       example: john.doe@example.com
 *                     role:
 *                       type: string
 *                       example: user
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - missing or invalid token
 */
router.get('/me', protect, (req, res, next) => usersController.getMe(req, res, next));

/**
 * @openapi
 * /users/me:
 *   patch:
 *     summary: Update currently authenticated user profile
 *     description: Update name or email for the active user session.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe Updated
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.updated@example.com
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid input details
 *       401:
 *         description: Unauthorized
 */
router.patch('/me', protect, validate(updateUserDto), (req, res, next) => usersController.updateMe(req, res, next));

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Get all users (Admin only)
 *     description: Retrieve a list of all registered users.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User list retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 */
router.get('/', protect, restrictTo('admin'), (req, res, next) => usersController.getAllUsers(req, res, next));

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Get user details by ID (Admin only)
 *     description: Retrieve details of a specific user.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: User MongoDB ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *       404:
 *         description: User not found
 */
router.get('/:id', protect, restrictTo('admin'), (req, res, next) => usersController.getUserById(req, res, next));

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     summary: Update user details by ID (Admin only)
 *     description: Modify user roles, status, name, or email as an administrator.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: User MongoDB ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 */
router.patch('/:id', protect, restrictTo('admin'), validate(updateUserDto), (req, res, next) => usersController.updateUser(req, res, next));

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Delete user by ID (Admin only)
 *     description: Remove a user permanently from the database.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: User MongoDB ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 */
router.delete('/:id', protect, restrictTo('admin'), (req, res, next) => usersController.deleteUser(req, res, next));

export default router;
