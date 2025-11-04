# Node.js Modular MVC Architecture

This project demonstrates how to structure a Node.js backend application using the Modular MVC (Model-View-Controller) pattern.  
The modular approach improves scalability, reusability, and maintainability by keeping each feature self-contained.

---


## Project Structure

<!-- src/
├── app.js
├── app.ts
├── server.ts
├── globalErrorHandler.ts
├── config/db.js
├── utils/
├── middlewares/authGuards/
└── modules/
├── auth/
│   ├── auth.controller.ts
│   ├── auth.model.ts
│   ├── auth.routes.ts
│   └── auth.service.ts
└── product/
├── product.controller.ts
├── product.model.ts
├── product.routes.ts
└── product.service.ts -->


### Folder Overview
- **modules/**: Each feature (auth, product, etc.) is contained within its own folder.  
- **controllers**: Handle incoming HTTP requests and send responses.  
- **services**: Contain business logic and interact with models.  
- **models**: Define database schemas and perform database operations.  
- **routes**: Define API endpoints and map them to corresponding controllers.  
- **middlewares**: Include authentication guards, validation, and error-handling logic.  
- **utils**: Reusable helper functions and utilities.  
- **config**: Database connection and environment variable setup.

---

## Technologies Used
- Node.js (JavaScript runtime)
- Express.js (Web framework)
- MongoDB (NoSQL database)
- Mongoose (MongoDB object modeling)
- TypeScript (Static typing)
- dotenv (Environment variable management)
- bcrypt / jsonwebtoken (Password hashing and JWT authentication)
- Joi or Zod (Input validation)

---

## Getting Started

### Clone the repository
```bash
git clone https://github.com/your-username/nodejs-modular-mvc.git
cd nodejs-modular-mvc

---

## npm install
```bash
npm install

### Clone the repository
PORT=5000
MONGO_URI=mongodb://localhost:27017/mvc_project
JWT_SECRET=your_secret_key

### Clone the repository
npm run dev
