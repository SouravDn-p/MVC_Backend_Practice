# 🎨 Professional Swagger OpenAPI Architecture Guide

This guide explains the highly organized, modular, and type-safe Swagger setup implemented in this project to generate and serve the interactive **OpenAPI 3.0** documentation panel at `/api/docs`.

---

## 🏗️ Modular Path Merging Architecture

Instead of cluttering route mappings and controller files with hundreds of lines of inline JSDoc comments, this codebase employs an elegant **Object-based Modular Merge pattern**.

```
                           ┌───────────────────────────┐
                           │   auth/auth.swagger.ts    │
                           │   (Exports authPaths)     │
                           └─────────────┬─────────────┘
                                         │
                                         ▼ (Imported & Spread)
┌───────────────────────────┐     ┌──────────────┐     ┌───────────────────────────┐
│ users/docs/users.swagger.t│ ──> │swagger.config│ <── │   Express 5 App Mount     │
│  (Exports usersPaths)     │     │   .ts        │     │  (swaggerUi.serve/setup)  │
└───────────────────────────┘     └──────────────┘     └───────────────────────────┘
```

### 1. The Route Spec Segment files
Each module holds its Swagger specifications in a dedicated file:
- **[`src/app/modules/auth/auth.swagger.ts`](file:///home/sourav16541/Desktop/Projects/Sourav/servers/MVC_Backend_Practice/src/app/modules/auth/auth.swagger.ts)**: Exports an `authPaths` object containing OpenAPI endpoint JSON templates for register, login, logout, and token refresh.
- **[`src/app/modules/users/docs/users.swagger.ts`](file:///home/sourav16541/Desktop/Projects/Sourav/servers/MVC_Backend_Practice/src/app/modules/users/docs/users.swagger.ts)**: Exports a `usersPaths` object detailing administrative operations and self-profile capabilities.

### 2. The Configuration Compiler
Inside [`src/config/swagger.config.ts`](file:///home/sourav16541/Desktop/Projects/Sourav/servers/MVC_Backend_Practice/src/config/swagger.config.ts), we import these modules and merge them using the JavaScript object spread operator:

```typescript
import swaggerJsdoc from "swagger-jsdoc";
import { usersPaths } from "../app/modules/users/docs/users.swagger.ts";
import { authPaths } from "../app/modules/auth/auth.swagger.ts";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "MVC API Documentation",
      version: "1.0.0",
      description: "Production Ready Node.js MVC API Documentation featuring full Session Auth and User Profiles.",
    },
    servers: [
      {
        url: "http://localhost:5000/api/v1",
        description: "Development Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    paths: {
      ...authPaths,
      ...usersPaths, // Beautiful modular merge!
    },
  },
  apis: [], // Keep it clean from JSDoc file scans
});
```

---

## 🚀 Serving Documentation in Express 5

In [`src/app.ts`](file:///home/sourav16541/Desktop/Projects/Sourav/servers/MVC_Backend_Practice/src/app.ts), the Swagger UI is mounted at `/docs` using `swagger-ui-express` middlewares:

```typescript
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.config.ts";

// Mount Swagger Panel
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);
```

### Trailing Slash Graceful Redirects
Because Express 5 handles paths with absolute precision:
1. Navigating to `http://localhost:5000/docs` redirects the browser with an HTML redirection header to the normalized trailing-slash directory `http://localhost:5000/docs/`.
2. Hitting `http://localhost:5000/docs/` serves the complete static bundle (HTML, styles, scripts) instantly from memory.

---

## 🔑 Testing Protected Routes with Bearer Authorization

To run test requests against restricted routes (e.g. `GET /users/me` or `GET /users`) directly within the interactive Swagger panel, follow these steps:

### Step 1: Register or Log In
1. Expand the `Auth` section inside the Swagger panel.
2. Click **Try it out** under `POST /auth/login`.
3. Fill in your credentials and click **Execute**.
4. Copy the returned `accessToken` string from the JSON response body.

### Step 2: Authorize in Swagger
1. Scroll back to the top of the Swagger panel.
2. Click the green **Authorize 🔓** button in the top-right corner.
3. Paste your token under **Value** like this:
   ```
   Bearer <your_copied_access_token>
   ```
   *(Ensure you include the word "Bearer" followed by a space before pasting your JWT token)*.
4. Click **Authorize** and close the pop-up modal.

### Step 3: Run Protected Requests
1. Expand the `Users` section.
2. Open any protected route (like `GET /users/me`).
3. Click **Try it out** and then **Execute**.
4. The requests will now automatically pass through our `protect` route guards and return your authenticated session profile!
