export const authPaths = {
  "/auth/register": {
    post: {
      summary: "Register a new user",
      description: "Create a new user account and receive authentication tokens.",
      tags: ["Auth"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name", "email", "password"],
              properties: {
                name: {
                  type: "string",
                  description: "Full name of the user (2 to 50 characters)",
                  example: "John Doe"
                },
                email: {
                  type: "string",
                  format: "email",
                  description: "Unique email address",
                  example: "john.doe@example.com"
                },
                password: {
                  type: "string",
                  format: "password",
                  description: "Strong password (min 8 characters)",
                  example: "P@ssword123!"
                }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: "Account created successfully"
        },
        400: {
          description: "Validation error"
        },
        409: {
          description: "Email already exists"
        }
      }
    }
  },
  "/auth/login": {
    post: {
      summary: "Log in an existing user",
      description: "Authenticate user using email and password, returning tokens.",
      tags: ["Auth"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "password"],
              properties: {
                email: {
                  type: "string",
                  format: "email",
                  example: "john.doe@example.com"
                },
                password: {
                  type: "string",
                  format: "password",
                  example: "P@ssword123!"
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: "Logged in successfully"
        },
        401: {
          description: "Invalid email or password"
        }
      }
    }
  },
  "/auth/logout": {
    post: {
      summary: "Log out the current user",
      description: "Invalidate user refresh token on the database and clear cookies.",
      tags: ["Auth"],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Logged out successfully"
        },
        401: {
          description: "Unauthorized"
        }
      }
    }
  },
  "/auth/refresh": {
    post: {
      summary: "Refresh JWT access token",
      description: "Provide a valid refresh token (either in body or cookies) to obtain a new set of tokens.",
      tags: ["Auth"],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                refreshToken: {
                  type: "string",
                  example: "eyJhbGciOiJIUzI1NiIsIn..."
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: "Token refreshed successfully"
        },
        401: {
          description: "Invalid or expired refresh token"
        }
      }
    }
  }
};
