export const usersPaths = {
  "/users/me": {
    get: {
      summary: "Get currently authenticated user profile",
      description: "Retrieve details of the user associated with the active session token.",
      tags: ["Users"],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "User profile retrieved successfully",
        },
        401: {
          description: "Unauthorized - missing or invalid token",
        },
      },
    },

    patch: {
      summary: "Update currently authenticated user profile",
      description: "Update name or email for the active user session.",
      tags: ["Users"],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  example: "John Doe Updated",
                },
                email: {
                  type: "string",
                  format: "email",
                  example: "john.updated@example.com",
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Profile updated successfully",
        },
        400: {
          description: "Invalid input details",
        },
        401: {
          description: "Unauthorized",
        },
      },
    },
  },

  "/users": {
    get: {
      summary: "Get all users (Admin only)",
      description: "Retrieve a list of all registered users in the database.",
      tags: ["Users"],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "User list retrieved successfully",
        },
        401: {
          description: "Unauthorized",
        },
        403: {
          description: "Forbidden - requires admin role",
        },
      },
    },
  },

  "/users/{id}": {
    get: {
      summary: "Get user details by ID (Admin only)",
      description: "Retrieve complete profile details of a specific user by MongoDB ID.",
      tags: ["Users"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          description: "User MongoDB ID",
          schema: {
            type: "string"
          }
        }
      ],
      responses: {
        200: {
          description: "User details retrieved successfully"
        },
        401: {
          description: "Unauthorized"
        },
        403: {
          description: "Forbidden - requires admin role"
        },
        404: {
          description: "User not found"
        }
      }
    },

    patch: {
      summary: "Update user details by ID (Admin only)",
      description: "Modify user roles, status, name, or email as an administrator.",
      tags: ["Users"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          description: "User MongoDB ID",
          schema: {
            type: "string"
          }
        }
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: {
                  type: "string"
                },
                email: {
                  type: "string"
                },
                role: {
                  type: "string",
                  enum: ["user", "admin"]
                },
                isActive: {
                  type: "boolean"
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: "User updated successfully"
        },
        401: {
          description: "Unauthorized"
        },
        403: {
          description: "Forbidden - requires admin role"
        },
        404: {
          description: "User not found"
        }
      }
    },

    delete: {
      summary: "Delete user by ID (Admin only)",
      description: "Remove a user permanently from the database.",
      tags: ["Users"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          description: "User MongoDB ID",
          schema: {
            type: "string"
          }
        }
      ],
      responses: {
        200: {
          description: "User deleted successfully"
        },
        401: {
          description: "Unauthorized"
        },
        403: {
          description: "Forbidden - requires admin role"
        },
        404: {
          description: "User not found"
        }
      }
    }
  }
};