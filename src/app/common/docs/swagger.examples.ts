export const exampleUserId = '0193c0a1-8b2e-7d4f-9c11-4e6a2b8d1f03';
export const exampleSessionId = '0193c0a2-1d4a-7e8b-a012-9f3c6d7e8a11';

export const exampleUser = {
  id: exampleUserId,
  name: 'Saimor',
  email: 'saimor@example.com',
  photo: null,
  imagePublicId: null,
  role: 'USER',
  location: 'Dhaka',
  isActive: true,
  emailVerified: true,
  provider: 'local',
  providerId: null,
  createdAt: '2026-09-02T09:34:18.530Z',
  updatedAt: '2026-09-02T09:34:31.054Z',
};

export const successBody = (message: string, data?: unknown) => ({
  success: true,
  message,
  ...(data !== undefined ? { data } : {}),
});

export const errorBody = (message: string) => ({
  success: false,
  message,
});

export const jsonResponse = (description: string, example: unknown) => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: { type: 'object' },
        },
      },
      example,
    },
  },
});

export const jsonError = (description: string, message: string) =>
  jsonResponse(description, errorBody(message));

export const setCookieHeaders = {
  'Set-Cookie': {
    schema: { type: 'string' },
    description: 'HttpOnly accessToken and refreshToken cookies. Tokens are never in the JSON body.',
    example:
      'accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Path=/; HttpOnly; SameSite=Lax',
  },
};
