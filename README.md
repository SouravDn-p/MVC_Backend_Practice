# 🚀 Node.js TypeScript MVC Backend

A production-ready, highly secure, and modern MVC backend template built with **Node.js**, **Express 5**, **TypeScript**, and **MongoDB (Mongoose)**. This project leverages contemporary tooling including `tsx` for high-performance ESM execution and includes a professionally configured Swagger OpenAPI documentation panel.

---

## 📂 Project Architecture & Structure

The repository implements a modular Model-View-Controller (MVC) directory layout, enforcing separation of concerns, strict type-safety, and modular feature encapsulation.

```
├── .env                              # Environment variable configuration
├── package.json                      # Scripts, dependencies, and metadata
├── tsconfig.json                     # TypeScript compiler & ts-node configuration
├── src/
│   ├── main.ts                       # Server entry point (bootstraps DB & HTTP server)
│   ├── app.ts                        # Express application configuration & routing
│   ├── config/                       # System-wide configuration files
│   │   ├── db/
│   │   │   └── database.config.ts    # MongoDB (Mongoose) connection setup
│   │   ├── env.config.ts             # Type-safe environmental variable validation
│   │   └── swagger.config.ts         # OpenAPI/Swagger compilation settings
│   └── app/
│       ├── common/                   # Shared system utilities and middlewares
│       │   ├── constants/            # Global constant stores (HTTP status, messages)
│       │   ├── exceptions/           # Centralized error handlers & AppError classes
│       │   ├── interceptors/         # Response formatters (sendSuccess, sendError)
│       │   ├── middlewares/          # Route guards (protect, restrictTo, validate)
│       │   ├── types/                # Global TypeScript declarations (Express request augmentation)
│       │   └── utils/                # General helpers (JWT, encryption)
│       └── modules/                  # Functional domain-driven modules
│           ├── auth/                 # Authentication features (Login, Register, Session)
│           │   ├── dto/              # Data Transfer Objects (Joi schemas)
│           │   ├── interfaces/       # Type declarations
│           │   ├── auth.controller.ts# Auth request router handles
│           │   ├── auth.route.ts     # Auth HTTP endpoints & Swagger JSDocs
│           │   └── auth.service.ts   # Core authentication business logic
│           └── users/                # User profile management features
│               ├── dto/              # User-specific Joi validators
│               ├── interfaces/       # TypeScript IUser interface
│               ├── schemas/          # Mongoose Schema & User hooks (Bcrypt)
│               ├── users.controller.ts# User endpoint controllers
│               ├── users.module.ts   # Export manager for user routes
│               ├── users.routes.ts   # User HTTP endpoints & Swagger JSDocs
│               └── users.service.ts  # User management business logic
```

---

## ⚙️ Core Behaviors & Implementation Details

### 🔐 1. Authentication Flow
The system implements a double-layered, state-of-the-art token authentication system:
- **Access Tokens**: Short-lived (15 minutes), passed either in the `Authorization: Bearer <token>` header or as an HTTP-only cookie.
- **Refresh Tokens**: Long-lived (7 days), stored securely in the database to support active revocation (e.g., on logout or force-disconnect) and passed in an HTTP-only cookie.
- **Password Security**: Automatic hashing of user passwords before saving utilizing `bcryptjs` with a cost factor of `12` (configured inside `users.schema.ts` pre-save hooks).

### 👥 2. Role-Based Access Control (RBAC)
Endpoints are restricted using two main middlewares:
- `protect`: Ensures a valid JWT session exists.
- `restrictTo(...roles)`: Enforces that the authenticated user possesses the correct role (e.g., `'admin'`) to access specific administrative resources.

### 🛡️ 3. Enhanced Security Middlewares
- **Helmet**: Secures the application by setting various HTTP headers (XSS filters, Frame options, CSP, etc.).
- **Rate Limiting**: Custom limiters are applied globally (100 requests per 15 minutes) and strictly on auth routes (10 authentication requests per 15 minutes) to protect against Brute Force attacks.
- **HPP & Mongo Sanitize**: Protects against HTTP Parameter Pollution and NoSQL injection attacks.

---

## 📥 Standardized API Responses

The application guarantees consistent JSON envelopes for all success and error responses.

### 🟢 Success Response
All successful requests return a `200` or `201` status code with the following JSON structure:

```json
{
  "success": true,
  "message": "Resource fetched successfully",
  "data": {
    "id": "64b3c41ef74a81383cd89a81",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "role": "user"
  }
}
```

### 🔴 Error Response
Operational and syntax errors are intercepted by our centralized global `errorHandler` middleware:

```json
{
  "success": false,
  "message": "An account with this email already exists"
}
```

#### Supported Error Types:
| HTTP Status | Class/Handler | Typical Trigger |
|---|---|---|
| **400 Bad Request** | `AppError` via `validate()` | Joi schema validation failed (e.g., weak password) |
| **401 Unauthorized**| `AppError` via `protect` | Missing, expired, or malformed JWT access token |
| **403 Forbidden**   | `AppError` via `restrictTo` | Standard user trying to access admin endpoints |
| **404 Not Found**   | `AppError` via 404 Route | Requesting undefined API endpoint |
| **409 Conflict**    | Mongoose Duplicate Handler | Registering with an email that already exists |
| **422 Unprocessable**| Mongoose Validation | Saving model properties that fail DB-level schemas |
| **500 Server Error**| Global Error Handler | Unknown programmer or server-side exception |

---

## 📝 Modern ESM Development Environment

The project's execution pipeline has been modernized to use **`tsx`** (TypeScript Execute):
- **Native ESM Support**: Complies and runs ESM TypeScript natively without loader warnings.
- **Fast Hot Reloads**: Leverages modern watches to monitor file changes and reload instantly.

To manage the server, the following scripts are available:

```bash
# Start development server with file watching
npm run dev

# Compile TypeScript to production-ready JS
npm run build

# Start compiled server in production mode
npm start

# Automatically format code with Prettier
npm run format
```

---

## 🎨 Professional Swagger OpenAPI Panel

The OpenAPI documentation is served dynamically at `/api/docs`. It has been built to be visually stunning, perfectly structured, and completely compliant with OpenAPI 3.0.0.

### 🔑 Security Integration
The documentation panel integrates **Bearer JWT Authentication**:
1. Click the **Authorize 🔓** button in the top-right of the Swagger UI.
2. Enter your JWT token as: `Bearer <your_token>`.
3. All protected requests (e.g., `/users/me`) will automatically include this token in their authorization headers.

### 🌐 Endpoints Scanned
Swagger is configured to parse all modular route files under `src/app/modules/` and render:
- **`Auth` Module**: Detailed models, inputs, and tokens for `/register`, `/login`, `/logout`, and `/refresh`.
- **`Users` Module**: Admin management and user self-profiling endpoints, complete with standard parameters and detailed response schemas.
