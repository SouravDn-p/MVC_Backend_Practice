import { MESSAGES } from '../../../common/constants/messages.constants.ts';
import {
  exampleSessionId,
  exampleUser,
  exampleUserId,
  jsonError,
  jsonResponse,
  setCookieHeaders,
  successBody,
} from '../../../common/docs/swagger.examples.ts';

export const authpaths = {
  '/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Register — OTP emailed, no cookies yet',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'email', 'password'],
              properties: {
                name: { type: 'string', example: 'Saimor' },
                email: { type: 'string', example: 'saimor@example.com' },
                password: { type: 'string', example: 'StrongPass1!' },
              },
            },
            example: {
              name: 'Saimor',
              email: 'saimor@example.com',
              password: 'StrongPass1!',
            },
          },
        },
      },
      responses: {
        201: jsonResponse(
          'Account created — verify email',
          successBody(MESSAGES.AUTH.REGISTER_SUCCESS, {
            user: {
              id: exampleUserId,
              email: 'saimor@example.com',
              name: 'Saimor',
            },
          }),
        ),
        400: jsonError(
          'Validation error',
          'name length must be at least 2 characters long, email must be a valid email, Password must contain uppercase, lowercase, number, and special character',
        ),
        409: jsonError('Email already exists', MESSAGES.AUTH.EMAIL_EXISTS),
      },
    },
  },
  '/auth/verify-email': {
    post: {
      tags: ['Auth'],
      summary: 'Verify OTP and open a session (sets cookies)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'otp'],
              properties: {
                email: { type: 'string', example: 'saimor@example.com' },
                otp: { type: 'string', example: '123456' },
              },
            },
            example: { email: 'saimor@example.com', otp: '123456' },
          },
        },
      },
      responses: {
        200: {
          ...jsonResponse(
            'Email verified. Sets accessToken + refreshToken cookies.',
            successBody(MESSAGES.AUTH.OTP_VERIFIED, { user: exampleUser }),
          ),
          headers: setCookieHeaders,
        },
        400: jsonError('Invalid OTP', MESSAGES.AUTH.OTP_INVALID),
        409: jsonError('Already verified', MESSAGES.AUTH.EMAIL_ALREADY_VERIFIED),
      },
    },
  },
  '/auth/resend-otp': {
    post: {
      tags: ['Auth'],
      summary: 'Resend verification OTP (60s throttle)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email'],
              properties: { email: { type: 'string', example: 'saimor@example.com' } },
            },
            example: { email: 'saimor@example.com' },
          },
        },
      },
      responses: {
        200: jsonResponse('OTP sent', successBody(MESSAGES.AUTH.OTP_SENT)),
        409: jsonError('Already verified', MESSAGES.AUTH.EMAIL_ALREADY_VERIFIED),
        429: jsonError('Too soon', 'Please wait 42s before requesting another code'),
      },
    },
  },
  '/auth/forgot-password': {
    post: {
      tags: ['Auth'],
      summary: 'Always 200 — does not reveal whether the email exists',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email'],
              properties: { email: { type: 'string', example: 'saimor@example.com' } },
            },
            example: { email: 'saimor@example.com' },
          },
        },
      },
      responses: {
        200: jsonResponse(
          'If the account exists, a reset OTP was emailed',
          successBody(MESSAGES.AUTH.PASSWORD_RESET_SENT),
        ),
      },
    },
  },
  '/auth/reset-password': {
    post: {
      tags: ['Auth'],
      summary: 'Reset password and revoke every session',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'otp', 'newPassword'],
              properties: {
                email: { type: 'string', example: 'saimor@example.com' },
                otp: { type: 'string', example: '123456' },
                newPassword: { type: 'string', example: 'NewStrong1!' },
              },
            },
            example: {
              email: 'saimor@example.com',
              otp: '123456',
              newPassword: 'NewStrong1!',
            },
          },
        },
      },
      responses: {
        200: jsonResponse(
          'Password updated',
          successBody(MESSAGES.AUTH.PASSWORD_RESET_SUCCESS),
        ),
        400: jsonError('Invalid OTP', MESSAGES.AUTH.OTP_INVALID),
      },
    },
  },
  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Login — cookies only, tokens not in JSON',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', example: 'saimor@example.com' },
                password: { type: 'string', example: 'StrongPass1!' },
              },
            },
            example: { email: 'saimor@example.com', password: 'StrongPass1!' },
          },
        },
      },
      responses: {
        200: {
          ...jsonResponse(
            'Logged in. Sets accessToken + refreshToken cookies.',
            successBody(MESSAGES.AUTH.LOGIN_SUCCESS, { user: exampleUser }),
          ),
          headers: setCookieHeaders,
        },
        401: jsonError('Invalid credentials', MESSAGES.AUTH.INVALID_CREDENTIALS),
        403: jsonError('Unverified or deactivated', MESSAGES.AUTH.EMAIL_NOT_VERIFIED),
      },
    },
  },
  '/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Logout this device',
      security: [{ cookieAuth: [] }],
      responses: {
        200: jsonResponse('Cookies cleared', successBody(MESSAGES.AUTH.LOGOUT_SUCCESS)),
        401: jsonError('Missing or invalid access cookie', MESSAGES.AUTH.UNAUTHORIZED),
      },
    },
  },
  '/auth/logout-all': {
    post: {
      tags: ['Auth'],
      summary: 'Logout every device',
      security: [{ cookieAuth: [] }],
      responses: {
        200: jsonResponse(
          'All refresh sessions deleted',
          successBody(MESSAGES.AUTH.LOGOUT_ALL_SUCCESS),
        ),
        401: jsonError('Missing or invalid access cookie', MESSAGES.AUTH.UNAUTHORIZED),
      },
    },
  },
  '/auth/sessions': {
    get: {
      tags: ['Auth'],
      summary: 'List active refresh sessions',
      security: [{ cookieAuth: [] }],
      responses: {
        200: jsonResponse(
          'Session list',
          successBody(MESSAGES.USER.FETCHED, {
            sessions: [
              {
                id: exampleSessionId,
                ipAddress: '127.0.0.1',
                userAgent: 'Mozilla/5.0',
                lastUsedAt: '2026-09-02T09:34:31.054Z',
                createdAt: '2026-09-02T09:34:31.054Z',
              },
            ],
          }),
        ),
        401: jsonError('Missing or invalid access cookie', MESSAGES.AUTH.UNAUTHORIZED),
      },
    },
  },
  '/auth/sessions/{sessionId}': {
    delete: {
      tags: ['Auth'],
      summary: 'Revoke one session',
      security: [{ cookieAuth: [] }],
      parameters: [
        {
          name: 'sessionId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid', example: exampleSessionId },
        },
      ],
      responses: {
        200: jsonResponse('Session revoked', successBody(MESSAGES.AUTH.LOGOUT_SUCCESS)),
        401: jsonError('Missing or invalid access cookie', MESSAGES.AUTH.UNAUTHORIZED),
      },
    },
  },
  '/auth/refresh-token': {
    post: {
      tags: ['Auth'],
      summary: 'Rotate refresh cookie; no access cookie required',
      responses: {
        200: {
          ...jsonResponse(
            'New cookie pair',
            successBody(MESSAGES.AUTH.TOKEN_REFRESHED, { user: exampleUser }),
          ),
          headers: setCookieHeaders,
        },
        401: jsonError('Invalid refresh', MESSAGES.AUTH.TOKEN_INVALID),
      },
    },
  },
  '/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Current user from access cookie',
      security: [{ cookieAuth: [] }],
      responses: {
        200: jsonResponse(
          'Profile',
          successBody(MESSAGES.USER.FETCHED, { user: exampleUser }),
        ),
        401: jsonError('Missing or invalid access cookie', MESSAGES.AUTH.UNAUTHORIZED),
      },
    },
  },
  '/auth/google': {
    get: {
      tags: ['Auth'],
      summary: 'Start Google OAuth',
      responses: {
        302: {
          description: 'Redirect to Google',
          headers: {
            Location: {
              schema: { type: 'string', example: 'https://accounts.google.com/o/oauth2/v2/auth' },
            },
          },
        },
        400: jsonError('Google OAuth is not configured', MESSAGES.AUTH.GOOGLE_NOT_CONFIGURED),
      },
    },
  },
  '/auth/google/callback': {
    get: {
      tags: ['Auth'],
      summary: 'Google callback — sets cookies, redirects to FRONTEND_URL',
      responses: {
        302: {
          description: 'Redirect to SPA. Success: FRONTEND_URL?success=true. Failure: FRONTEND_URL/login?error=auth_failed',
          headers: {
            Location: {
              schema: { type: 'string', example: 'http://localhost:3000?success=true' },
            },
          },
        },
      },
    },
  },
};
