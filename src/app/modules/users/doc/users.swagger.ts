import { MESSAGES } from '../../../common/constants/messages.constants.ts';
import {
  exampleUser,
  exampleUserId,
  jsonError,
  jsonResponse,
  successBody,
} from '../../../common/docs/swagger.examples.ts';

export const usersPaths = {
  '/users/me': {
    get: {
      tags: ['Users'],
      summary: 'Own profile',
      security: [{ cookieAuth: [] }],
      responses: {
        200: jsonResponse(
          'Profile without password',
          successBody(MESSAGES.USER.FETCHED, { user: exampleUser }),
        ),
        401: jsonError('Missing or invalid access cookie', MESSAGES.AUTH.UNAUTHORIZED),
      },
    },
    patch: {
      tags: ['Users'],
      summary: 'Update name, location, or photo (JSON URL or multipart file via Cloudinary)',
      security: [{ cookieAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Saimor' },
                photo: {
                  type: 'string',
                  nullable: true,
                  example: 'https://res.cloudinary.com/demo/image/upload/avatar.jpg',
                  description: 'Image URL. Send null to clear.',
                },
                location: { type: 'string', example: 'Dhaka' },
              },
            },
            example: { name: 'Saimor', location: 'Dhaka' },
          },
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Saimor' },
                location: { type: 'string', example: 'Dhaka' },
                photo: { type: 'string', format: 'binary' },
              },
            },
          },
        },
      },
      responses: {
        200: jsonResponse(
          'Updated',
          successBody(MESSAGES.USER.UPDATED, {
            user: { ...exampleUser, location: 'Dhaka' },
          }),
        ),
        400: jsonError('Nothing to update', MESSAGES.USER.NOTHING_TO_UPDATE),
        401: jsonError('Missing or invalid access cookie', MESSAGES.AUTH.UNAUTHORIZED),
      },
    },
  },
  '/users/admin/users': {
    get: {
      tags: ['Users'],
      summary: 'Admin: list users',
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', example: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', example: 20 } },
        { name: 'search', in: 'query', schema: { type: 'string', example: 'saimor' } },
        {
          name: 'role',
          in: 'query',
          schema: { type: 'string', enum: ['USER', 'ADMIN'], example: 'USER' },
        },
      ],
      responses: {
        200: jsonResponse('Paginated users', {
          success: true,
          message: 'All users retrieved successfully',
          data: {
            users: [
              {
                id: exampleUserId,
                name: 'Saimor',
                email: 'saimor@example.com',
                role: 'USER',
                isActive: true,
                emailVerified: true,
                createdAt: '2026-09-02T09:34:18.530Z',
                updatedAt: '2026-09-02T09:34:31.054Z',
                photo: null,
                location: 'Dhaka',
              },
            ],
            total: 1,
            page: 1,
            limit: 20,
          },
        }),
        401: jsonError('Missing or invalid access cookie', MESSAGES.AUTH.UNAUTHORIZED),
        403: jsonError('Not admin', MESSAGES.AUTH.FORBIDDEN),
      },
    },
  },
  '/users/admin/users/{userId}/status': {
    patch: {
      tags: ['Users'],
      summary: 'Admin: activate / deactivate',
      security: [{ cookieAuth: [] }],
      parameters: [
        {
          name: 'userId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid', example: exampleUserId },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['isActive'],
              properties: { isActive: { type: 'boolean', example: false } },
            },
            example: { isActive: false },
          },
        },
      },
      responses: {
        200: jsonResponse('Status updated', {
          success: true,
          message: 'User deactivated successfully',
          data: {
            user: {
              id: exampleUserId,
              name: 'Saimor',
              email: 'saimor@example.com',
              role: 'USER',
              isActive: false,
            },
          },
        }),
        400: jsonError(
          'Cannot change your own status',
          'You cannot update your own active status',
        ),
        401: jsonError('Missing or invalid access cookie', MESSAGES.AUTH.UNAUTHORIZED),
        403: jsonError('Not admin, or target is an admin', MESSAGES.AUTH.FORBIDDEN),
        404: jsonError('User not found', MESSAGES.USER.NOT_FOUND),
      },
    },
  },
};
