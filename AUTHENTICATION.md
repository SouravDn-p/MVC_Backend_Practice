# Authentication Implementation

This document explains the authentication system implemented in this backend application, which uses access tokens and refresh tokens for secure user authentication.

## Features

1. **Access Tokens**: Short-lived tokens (15 minutes) for immediate authentication
2. **Refresh Tokens**: Long-lived tokens (7 days) for generating new access tokens
3. **Token Storage**: Refresh tokens are stored in the user document in the database
4. **Route Protection**: Auth guard middleware to protect routes
5. **Automatic Token Refresh**: Client-side implementation for seamless user experience

## API Endpoints

### Authentication Routes

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and receive tokens
- `POST /api/auth/refresh` - Refresh access token using refresh token
- `POST /api/auth/logout` - Logout and invalidate refresh token (protected route)

### Protected Routes

Any route that requires authentication should use the `authGuard` middleware.

## Implementation Details

### 1. User Model

The User model has been extended to include a `refreshTokens` array to store refresh tokens:

```typescript
interface IUser {
  name: string;
  email: string;
  password: string;
  refreshTokens?: string[];
}
```

### 2. Auth Service

The auth service handles token generation and validation:

- **Login**: Generates both access (15min) and refresh (7days) tokens
- **Refresh**: Validates refresh token and generates new access token
- **Logout**: Removes refresh token from user's token list

### 3. Auth Guard Middleware

The `authGuard` middleware protects routes by validating the access token:

```typescript
export const authGuard = (req: Request, res: Response, next: NextFunction) => {
  // Extract and verify token from Authorization header
  // Attach user info to request object
  // Call next() if valid, return 401 if invalid
}
```

## Frontend Usage

See [frontend-auth-guide.ts](frontend-auth-guide.ts) for a complete TypeScript implementation of:

1. Token management
2. Authentication service
3. HTTP client with automatic token refresh
4. Protected route guard
5. Usage examples

## Security Considerations

1. **Token Expiration**: Short-lived access tokens minimize damage from token theft
2. **Refresh Token Rotation**: Refresh tokens are stored server-side and can be invalidated
3. **HTTPS Only**: In production, tokens should only be transmitted over HTTPS
4. **HttpOnly Cookies**: For web applications, consider storing tokens in HttpOnly cookies

## Environment Variables

Make sure to set the following environment variables:

```
JWT_SECRET=your_jwt_secret_here
MONGO_URI=your_mongodb_connection_string
```