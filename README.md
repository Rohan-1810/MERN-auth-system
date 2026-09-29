# MERN Authentication System

A secure, modular, student-level authentication application built from scratch using the **MERN Stack** (MongoDB, Express.js, React.js, Node.js). This project implements real-world authentication patterns including **JWT-based authorization**, **bcrypt password hashing**, **email verification**, **password reset via secure token links**, and **route protection** on both frontend and backend.

Designed specifically to demonstrate core full-stack security concepts for technical interviews.

---

## Features

- **User Registration**: Client and server-side validation, password confirmation check, duplicate email prevention, and bcrypt password hashing.
- **Email Verification**: Cryptographically secure random tokens (`crypto.randomBytes`) with 24-hour expiration sent via Nodemailer. Unverified accounts cannot log in.
- **User Login & JWT Generation**: Credential verification using `bcrypt.compare`, verification check, and signed JSON Web Token (JWT) generation.
- **Client-Side Authentication State**: React `AuthContext` preserving session across page refreshes via `localStorage` with Axios request interceptor for `Authorization: Bearer <token>` injection.
- **Protected Routes (Backend & Frontend)**:
  - Backend: Custom Express `protect` middleware verifying JWT signatures, extracting user ID, and attaching `req.user` (excluding password).
  - Frontend: React Router `ProtectedRoute` component redirecting unauthenticated users to `/login`.
- **Password Reset Flow**: Secure token-based password reset via email link with 1-hour expiration and automatic token invalidation upon successful reset.
- **Robust Error Handling**: Standard HTTP status codes (200, 201, 400, 401, 403, 404, 409, 500) and user-friendly error banners.

---

## Tech Stack

### Frontend
- **React.js**: Functional components and hooks (`useState`, `useEffect`, `useContext`) for responsive UI state management.
- **React Router v7**: Client-side routing and protected route wrappers.
- **Axios**: HTTP client configured with request interceptors to automatically attach Bearer tokens.
- **CSS**: Clean, custom styling with CSS variables, form feedback, and responsive layouts (no heavy UI frameworks).

### Backend
- **Node.js & Express.js**: RESTful API server architecture, routing, and custom middleware.
- **MongoDB & Mongoose**: Document database and schema modeling with validation and instance methods.

### Authentication & Security
- **jsonwebtoken (JWT)**: Stateless token issuance and cryptographic verification.
- **bcryptjs**: One-way salt hashing to protect user passwords against rainbow tables and brute-force attacks.
- **crypto (Node.js built-in)**: Cryptographically secure pseudo-random number generator (CSPRNG) for email and password reset tokens.
- **Nodemailer**: SMTP email transport supporting custom SMTP providers (e.g. Gmail, Mailtrap) and automated Ethereal test inboxes for local development.
- **CORS & dotenv**: Cross-Origin Resource Sharing control and environment variable isolation.

---

## Project Structure

```text
mern-authentication-system/
│
├── client/                     # Frontend React (Vite) Application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── Navbar.jsx      # Navigation bar with dynamic auth actions
│   │   │   └── ProtectedRoute.jsx # Guard redirecting unauthenticated visitors
│   │   ├── context/
│   │   │   └── AuthContext.jsx # React context managing user & token state
│   │   ├── pages/              # Authentication view pages
│   │   │   ├── Login.jsx       # User login page
│   │   │   ├── Register.jsx    # Registration with input validation
│   │   │   ├── VerifyEmail.jsx # Email verification landing page
│   │   │   ├── ForgotPassword.jsx # Request reset link
│   │   │   ├── ResetPassword.jsx  # Submit new password
│   │   │   └── Profile.jsx     # Protected user profile & live API test
│   │   ├── services/
│   │   │   └── api.js          # Axios instance with JWT interceptor
│   │   ├── App.jsx             # Route definitions
│   │   ├── main.jsx            # React root with providers
│   │   └── index.css           # Coherent modern styling
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/                     # Backend Express & Node.js API
│   ├── config/
│   │   └── db.js               # Mongoose database connection
│   ├── controllers/
│   │   └── authController.js   # Controllers for register, verify, login, reset, me
│   ├── middleware/
│   │   └── authMiddleware.js   # JWT verification & req.user attachment
│   ├── models/
│   │   └── User.js             # Mongoose user schema & methods
│   ├── routes/
│   │   └── authRoutes.js       # Express route endpoints
│   ├── utils/
│   │   └── sendEmail.js        # Nodemailer email transport utility
│   ├── test-auth.js            # Automated test suite (46 assertion checks)
│   ├── server.js               # Express application entry point
│   ├── .env                    # Local environment variables
│   ├── .env.example            # Environment template
│   └── package.json
│
├── .env.example                # Workspace environment template
├── .gitignore                  # Git ignore rules (node_modules, .env, etc.)
├── README.md                   # Project documentation
└── AUTHENTICATION_INTERVIEW_GUIDE.md # Technical interview preparation guide
```

---

## Setup & Installation

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **MongoDB** running locally on `mongodb://127.0.0.1:27017` or a MongoDB Atlas connection string.

### 2. Configure Environment Variables
In the `server/` directory, create a `.env` file based on `.env.example`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/mern_auth_db
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:5173

# Optional custom SMTP configuration (defaults to Ethereal test inbox if empty)
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM="MERN Auth System" <no-reply@mernauth.dev>
```

> **Note on Email:** If `EMAIL_HOST`, `EMAIL_USER`, and `EMAIL_PASSWORD` are left blank, Nodemailer automatically creates a free **Ethereal test account**, outputs the preview URL in the terminal, and logs the direct verification/reset links to the backend console.

### 3. Install Dependencies
Install server dependencies:
```bash
cd server
npm install
```

Install client dependencies:
```bash
cd ../client
npm install
```

### 4. Run the Application
Start the backend server (runs on `http://localhost:5000`):
```bash
cd server
npm run dev
```

In a second terminal, start the frontend client (runs on `http://localhost:5173`):
```bash
cd client
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## API Endpoints

| Method | Endpoint | Authentication | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | None (Public) | Validates input, hashes password, saves user as unverified, and sends verification email. |
| `GET` | `/api/auth/verify-email/:token` | None (Public) | Verifies email token, marks `isVerified = true`, and invalidates token. |
| `POST` | `/api/auth/login` | None (Public) | Verifies email & password, verifies account is activated, and returns signed JWT. |
| `GET` | `/api/auth/me` | **Bearer JWT** (Private) | Verifies JWT via middleware and returns current authenticated user profile. |
| `POST` | `/api/auth/forgot-password` | None (Public) | Generates 1-hour reset token and emails secure reset link. |
| `POST` | `/api/auth/reset-password/:token` | None (Public) | Validates reset token, hashes new password with bcrypt, and invalidates token. |

---

## Authentication Flow

```text
User Enters Info
      ↓
[POST /api/auth/register]
      ↓
Password Hashed (bcrypt) + Random Token Generated (crypto)
      ↓
User Saved with isVerified: false
      ↓
Verification Email Sent (Link with Token)
      ↓
User Clicks Link -> [GET /api/auth/verify-email/:token]
      ↓
Backend Checks Expiration & Marks isVerified: true (Token Cleared)
      ↓
User Logs In -> [POST /api/auth/login]
      ↓
bcrypt.compare() Matches Password + Verification Check Passes
      ↓
JWT Signed with User ID and Returned to Frontend
      ↓
Frontend Stores JWT in localStorage + Sets Auth State
      ↓
Axios Interceptor Injects 'Authorization: Bearer <token>'
      ↓
Protected Request -> [GET /api/auth/me]
      ↓
authMiddleware Verifies JWT Signature -> req.user Populated -> Profile Rendered
```

---

## Password Reset Flow

```text
User Requests Reset -> [POST /api/auth/forgot-password]
      ↓
Backend Finds User by Email
      ↓
Generates Secure Random 32-Byte Token + 1-Hour Expiry
      ↓
Token Stored on User Document in MongoDB
      ↓
Reset Email Sent with Link: /reset-password/:token
      ↓
User Opens Link & Enters New Password
      ↓
[POST /api/auth/reset-password/:token]
      ↓
Backend Matches Token & Verifies Expiry (> Date.now())
      ↓
New Password Hashed with bcrypt Salt (10 rounds)
      ↓
Tokens Cleared & User Saved
      ↓
Old Password No Longer Works, New Password Successfully Logs In
```

---

## Security Implementation

1. **Password Hashing (bcryptjs)**:
   - Passwords are never stored in plaintext.
   - Salt rounds: 10 (adaptive work factor preventing rainbow table lookups).
   - Comparison uses constant-time comparison inside `bcrypt.compare` to prevent timing attacks.
2. **Stateless JWT Authorization**:
   - Token contains minimal payload (`{ id: user._id }`).
   - Cryptographically signed with HMAC SHA-256 using server-only `JWT_SECRET`.
   - Bounded token lifespan (`JWT_EXPIRES_IN=1d`).
3. **Defense-in-Depth Token Invalidation**:
   - Both verification and password reset tokens are explicitly cleared (`undefined`) after successful use to prevent replay attacks.
   - Tokens have strict expiration bounds (24 hours for email verification, 1 hour for password reset).
4. **Data Sanitization & Exposure Prevention**:
   - Queries use `.select('-password')` to ensure hashed passwords are never returned in profile responses.
   - Emails are converted to lowercase and trimmed to avoid collision issues.
5. **CORS & Environment Isolation**:
   - CORS is strictly configured to permit requests only from the specified client origin.
   - All credentials, secrets, and connection strings are managed via `.env` and kept out of version control via `.gitignore`.

---

## Automated Test Suite

The repository includes a comprehensive test suite in `server/test-auth.js` covering 46 specific assertions across all authentication and security flows.

To run the test suite:
```bash
cd server
node test-auth.js
```

All 46 assertions test valid flows, failure edge cases (duplicate email, mismatched passwords, expired tokens, unverified login blocks, invalid JWTs), and security integrity.
