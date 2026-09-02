const error = (description: string) => ({ description });

const userProperties = {
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string' },
  email: { type: 'string', format: 'email' },
  role: { type: 'string', example: 'USER' },
  isActive: { type: 'boolean' },
};

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
          },
        },
      },
      responses: {
        201: { description: 'Account created — verify email' },
        400: error('Validation error'),
        409: error('Email already exists'),
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
                email: { type: 'string' },
                otp: { type: 'string', example: '123456' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Sets accessToken + refreshToken cookies' },
        400: error('Invalid OTP'),
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
              properties: { email: { type: 'string' } },
            },
          },
        },
      },
      responses: { 200: { description: 'OTP sent' }, 429: error('Too soon') },
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
              properties: { email: { type: 'string' } },
            },
          },
        },
      },
      responses: { 200: { description: 'If the account exists, a reset OTP was emailed' } },
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
                email: { type: 'string' },
                otp: { type: 'string' },
                newPassword: { type: 'string' },
              },
            },
          },
        },
      },
      responses: { 200: { description: 'Password updated' }, 400: error('Invalid OTP') },
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
                email: { type: 'string' },
                password: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Logged in',
          headers: {
            'Set-Cookie': {
              schema: { type: 'string' },
              description: 'accessToken and refreshToken HttpOnly cookies',
            },
          },
        },
        401: error('Invalid credentials'),
        403: error('Unverified or deactivated'),
      },
    },
  },
  '/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Logout this device',
      security: [{ cookieAuth: [] }],
      responses: { 200: { description: 'Cookies cleared' } },
    },
  },
  '/auth/logout-all': {
    post: {
      tags: ['Auth'],
      summary: 'Logout every device',
      security: [{ cookieAuth: [] }],
      responses: { 200: { description: 'All refresh sessions deleted' } },
    },
  },
  '/auth/sessions': {
    get: {
      tags: ['Auth'],
      summary: 'List active refresh sessions',
      security: [{ cookieAuth: [] }],
      responses: { 200: { description: 'Session list' } },
    },
  },
  '/auth/sessions/{sessionId}': {
    delete: {
      tags: ['Auth'],
      summary: 'Revoke one session',
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Session revoked' } },
    },
  },
  '/auth/refresh-token': {
    post: {
      tags: ['Auth'],
      summary: 'Rotate refresh cookie; no access cookie required',
      responses: { 200: { description: 'New cookie pair' }, 401: error('Invalid refresh') },
    },
  },
  '/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Current user from access cookie',
      security: [{ cookieAuth: [] }],
      responses: {
        200: {
          description: 'Profile',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: { user: { type: 'object', properties: userProperties } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  '/auth/google': {
    get: {
      tags: ['Auth'],
      summary: 'Start Google OAuth',
      responses: { 302: { description: 'Redirect to Google' } },
    },
  },
  '/auth/google/callback': {
    get: {
      tags: ['Auth'],
      summary: 'Google callback — sets cookies, redirects to FRONTEND_URL',
      responses: { 302: { description: 'Redirect to SPA' } },
    },
  },
};
