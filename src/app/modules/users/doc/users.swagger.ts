export const usersPaths = {
  '/users/me': {
    get: {
      tags: ['Users'],
      summary: 'Own profile',
      security: [{ cookieAuth: [] }],
      responses: { 200: { description: 'Profile without password' } },
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
                name: { type: 'string' },
                photo: { type: 'string', description: 'Image URL. Send null to clear.' },
                location: { type: 'string' },
              },
            },
          },
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                location: { type: 'string' },
                photo: { type: 'string', format: 'binary' },
              },
            },
          },
        },
      },
      responses: { 200: { description: 'Updated' } },
    },
  },
  '/users/admin/users': {
    get: {
      tags: ['Users'],
      summary: 'Admin: list users',
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'limit', in: 'query', schema: { type: 'integer' } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'role', in: 'query', schema: { type: 'string', enum: ['USER', 'ADMIN'] } },
      ],
      responses: { 200: { description: 'Paginated users' }, 403: { description: 'Not admin' } },
    },
  },
  '/users/admin/users/{userId}/status': {
    patch: {
      tags: ['Users'],
      summary: 'Admin: activate / deactivate',
      security: [{ cookieAuth: [] }],
      parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['isActive'],
              properties: { isActive: { type: 'boolean' } },
            },
          },
        },
      },
      responses: { 200: { description: 'Status updated' } },
    },
  },
};
