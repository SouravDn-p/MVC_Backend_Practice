import swaggerJsdoc from 'swagger-jsdoc';
import { ENV } from './env.config.ts';
import { authpaths } from '../app/modules/auth/doc/auth.swagger.ts';
import { usersPaths } from '../app/modules/users/doc/users.swagger.ts';

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MVC Starter API',
      version: '1.0.0',
      description:
        'Auth uses HttpOnly cookies (accessToken, refreshToken). Tokens are never returned in JSON. Profile photos upload to Cloudinary. Mail is sent with Brevo.',
    },
    servers: [
      { url: `${ENV.BACKEND_URL}/api/v1`, description: ENV.NODE_ENV },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
          description: 'HttpOnly access token set on login / verify-email / refresh',
        },
      },
      schemas: {
        ApiSuccess: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Logged in successfully' },
            data: { type: 'object' },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Invalid email or password' },
          },
        },
      },
    },
    paths: {
      ...authpaths,
      ...usersPaths,
    },
  },
  apis: [],
});
