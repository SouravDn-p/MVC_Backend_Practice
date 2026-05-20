import swaggerJsdoc from "swagger-jsdoc";
import { ENV } from "./env.config.ts";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "MVC API Documentation",
      version: "1.0.0",
      description: "Production Ready Node.js MVC API",
    },

    servers: [
      {
        url: `http://localhost:${ENV.PORT}/api/v1`,
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

    security: [
      {
        bearerAuth: [],
      },
    ],
  },

  apis: [
    "./src/app/modules/**/*.ts",
  ],
};

export const swaggerSpec = swaggerJsdoc(options);