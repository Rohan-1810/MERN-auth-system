# Technical Interview Preparation Guide: MERN Authentication System

This guide is the definitive source of truth for discussing this project in technical interviews. It is directly mapped to the actual implementation in this repository.

---

## 1. Project Overview

### What the Project Does
A production-grade, modular authentication application built using the MERN stack (MongoDB, Express.js, React.js, Node.js). It provides end-to-end user identity management: secure account registration with input validation, password hashing with bcrypt, email verification via cryptographically secure tokens, token re-issuance (resend verification), JWT-based stateless login, authorization middleware for protecting API routes, client-side session persistence via localStorage and Axios interceptors, and a secure password reset workflow.

### Why It Was Built
To implement and master the foundational cryptographic, architectural, and security principles of web authentication without relying on third-party "black-box" authentication providers (like Firebase or Auth0). The goal is to deeply understand every stage of credential handling, token signing, session lifecycle, token invalidation, and route authorization.

### 30-Second Elevator Pitch
> *"I built a full-stack MERN authentication system that secures user identity from registration to protected route access. It hashes passwords using bcrypt, issues cryptographically random tokens for email verification, resends tokens on demand, handles password resets via Nodemailer, and provides stateless authorization using JSON Web Tokens. On the frontend, a React application manages auth state using React Context and Axios interceptors, while on the backend, custom Express middleware verifies signatures and protects private routes."*

### 1-Minute Comprehensive Explanation
> *"In this project, I implemented a complete, secure authentication lifecycle using MongoDB, Express, React, and Node.js. When a user registers, their password is salted and hashed using bcrypt before being saved to MongoDB, and an unverified account is created alongside a secure 32-byte crypto token sent via email. After the user verifies their email via a single-use expiring link, they can log in.
>
> If a token expires before verification, users can trigger the resend verification endpoint, which replaces and invalidates the old token with a fresh 24-hour token.
>
> Upon login, the backend validates credentials with `bcrypt.compare` and issues a signed JSON Web Token containing the user's ID. On the client, React stores the JWT in localStorage, and an Axios request interceptor automatically attaches it as a Bearer token in the Authorization header. On protected backend routes like `/api/auth/me`, custom middleware intercepts the request, verifies the JWT signature and expiration, retrieves the user from MongoDB while stripping the password, and attaches it to `req.user`. I also built a complete password reset flow with token invalidation to prevent replay attacks."*

---

## 2. Architecture & Data Flow

```text
+-----------------------------------------------------------------------------------+
|                                  BROWSER (React)                                  |
|   +-------------------+       +--------------------+       +------------------+   |
|   | Pages & Forms     | ----> | AuthContext        | ----> | Axios Instance   |   |
|   | (Login, Register) |       | (User/Token State) |       | (api.js + Inter) |   |
+---+-------------------+-------+--------------------+-------+------------------+---+
                                                                      |
                                        HTTP Request (Bearer Token)   |
                                                                      v
+-----------------------------------------------------------------------------------+
|                                BACKEND (Express.js)                               |
|   +-------------------------+       +-------------------+       +-------------+   |
|   | Express Server (CORS,   | ----> | authMiddleware    | ----> | Controller  |   |
|   | JSON Body Parser)       |       | (JWT Verification)|       | (Business)  |   |
+---+-------------------------+-------+-------------------+-------+-------------+---+
                                                                         |
                                                                         v
                                                              +---------------------+
                                                              | Mongoose Model      |
                                                              | (User.js)           |
                                                              +---------------------+
                                                                         |
                                                                         v
                                                              +---------------------+
                                                              | MongoDB Database    |
                                                              +---------------------+
```

---

## 3. Project Structure

```text
mern-authentication-system/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx              # Navigation with dynamic links & logout
│   │   │   └── ProtectedRoute.jsx      # Guards private routes on client
│   │   ├── context/
│   │   │   └── AuthContext.jsx         # Global user & token state management
│   │   ├── pages/
│   │   │   ├── Login.jsx               # Login form & resend verification trigger
│   │   │   ├── Register.jsx            # Sign-up form with input checks
│   │   │   ├── VerifyEmail.jsx         # Handles token link, activates account, fallback resend
│   │   │   ├── ForgotPassword.jsx      # Requests reset link
│   │   │   ├── ResetPassword.jsx       # Sets new password with valid token
│   │   │   └── Profile.jsx             # Displays protected user info & live JWT demo
│   │   ├── services/
│   │   │   └── api.js                  # Axios instance with Bearer interceptor & API calls
│   │   ├── App.jsx                     # Route declarations
│   │   └── index.css                   # Custom CSS styling
├── server/
│   ├── config/
│   │   └── db.js                       # Mongoose connection logic
│   ├── controllers/
│   │   └── authController.js           # Auth logic (register, verify, resend, login, reset, me)
│   ├── middleware/
│   │   └── authMiddleware.js           # protect middleware verifying Bearer tokens
│   ├── models/
│   │   └── User.js                     # User schema, methods, and indices
│   ├── routes/
│   │   └── authRoutes.js               # Route routing to controllers
│   ├── utils/
│   │   └── sendEmail.js                # Nodemailer transport (SMTP / Ethereal + dev logging)
│   ├── test-auth.js                    # Automated test suite (52 checks)
│   └── server.js                       # Express app bootstrap & error handlers
```

---

## 4. User Registration Flow

1. **Client Submission**: User submits `name`, `email`, `password`, and `confirmPassword` from `Register.jsx`.
2. **Frontend Validation**: Verifies all fields are present, passwords match, and password length $\ge 6$.
3. **API Request**: Axios sends `POST /api/auth/register`.
4. **Backend Validation**: `register` in `authController.js`:
   - Checks presence of fields (returns `400` if missing).
   - Validates `password === confirmPassword` (returns `400` if mismatch).
   - Validates `password.length >= 6` (returns `400` if too short).
   - Checks if email is already in MongoDB (`User.findOne({ email: email.toLowerCase() })`). If found, returns `409 Conflict`.
5. **Password Hashing**: Generates salt with `bcrypt.genSalt(10)` and hashes password via `bcrypt.hash(password, salt)`.
6. **Token Generation**: Generates 32 random bytes via `crypto.randomBytes(32).toString('hex')`. Sets expiration to `Date.now() + 24 * 60 * 60 * 1000` (24 hours).
7. **Database Storage**: User is created with `isVerified: false`, `verificationToken`, and `verificationTokenExpiry`.
8. **Email Dispatch**: Calls `sendEmail()` sending a clickable link: `${CLIENT_URL}/verify-email/${verificationToken}`.
9. **Terminal Logging**: In development mode, the terminal prints the Ethereal preview link and the verification URL.
10. **Response**: Returns `201 Created` with success message.

---

## 5. Email Verification Flow

1. **Token Link**: User receives email and clicks `http://localhost:5173/verify-email/<token>`.
2. **Component Mount**: `VerifyEmail.jsx` reads `:token` from URL parameters and triggers `GET /api/auth/verify-email/:token`.
3. **Backend Query**: `verifyEmail` in `authController.js` queries:
   ```javascript
   const user = await User.findOne({
     verificationToken: token,
     verificationTokenExpiry: { $gt: Date.now() }
   });
   ```
4. **Verification Check**:
   - If user not found or expired $\rightarrow$ Returns `400 Bad Request` ("Invalid or expired verification token").
   - If found $\rightarrow$ Sets `user.isVerified = true`.
5. **Token Invalidation**: `user.verificationToken = undefined` and `user.verificationTokenExpiry = undefined` are cleared so the token cannot be reused (preventing replay attacks).
6. **Persistence**: `await user.save()` persists the activation.
7. **Response**: Returns `200 OK`. Frontend displays success badge with a link to login.

---

## 6. Resend Verification Email Flow

### Problem Solved
If a user registers but the 24-hour verification token expires before they click it, the user is trapped:
- Account exists in MongoDB.
- Login is blocked (`403 Forbidden`).
- Registration rejects the email (`409 Conflict`).
- The user needs an official, secure way to request a fresh token without direct database intervention.

### How Resend Verification Works
1. **Trigger**: When login fails with `403` or on `/verify-email` with an expired link, the user clicks **"Resend verification email"**.
2. **Request**: `POST /api/auth/resend-verification` with `{ email }`.
3. **Validation & Checks** (`resendVerification` in `authController.js`):
   - Normalizes email: `email.toLowerCase().trim()`.
   - Checks if user exists: If not found $\rightarrow$ Returns `404 Not Found`.
   - Checks `user.isVerified`: If already verified $\rightarrow$ Returns `400 Bad Request` (`'This account has already been verified. Please log in.'`).
4. **Token Invalidation & Fresh Generation**:
   ```javascript
   const verificationToken = crypto.randomBytes(32).toString('hex');
   user.verificationToken = verificationToken;
   user.verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
   await user.save();
   ```
   **Crucial Interview Point**: Replacing `user.verificationToken` immediately invalidates the previous token. Any attempt to use the older link will fail with `400 Bad Request`.
5. **Email Dispatch**: Calls `sendEmail()` with `emailType: 'VERIFICATION'` and `actionUrl: verificationUrl`.
6. **Development Terminal Output**: Prints the new Ethereal preview URL and new verification link.
7. **Response**: Returns `200 OK` (`'A new verification email has been sent. Please check your inbox or terminal.'`).

---

## 7. Login Flow

1. **Client Submission**: User submits `email` and `password` on `Login.jsx`.
2. **API Request**: Axios sends `POST /api/auth/login`.
3. **User Lookup**: `login` in `authController.js` searches MongoDB for user by normalized lowercase email. If not found $\rightarrow$ Returns `401 Unauthorized` ("Invalid email or password").
4. **Password Verification**: Uses `bcrypt.compare(password, user.password)`. If false $\rightarrow$ Returns `401 Unauthorized` ("Invalid email or password").
   *(Note: The exact same message is returned for missing user and incorrect password to prevent user enumeration).*
5. **Verification Check**: Checks `if (!user.isVerified)`. If false $\rightarrow$ Returns `403 Forbidden` ("Please verify your email address before logging in"). The frontend detects this and offers the **"Resend verification email"** button.
6. **JWT Generation**: Signs a token with payload `{ id: user._id }`, `JWT_SECRET`, and expiration `1d`.
7. **Response**: Returns `200 OK` with `{ success: true, token, user: { id, name, email, isVerified } }`. Password is not returned.
8. **Client Storage**: `AuthContext.jsx` stores token in `localStorage.setItem('token', token)` and updates application state.

---

## 8. Password Security & bcrypt

### Why Passwords Must Be Hashed
Storing plaintext passwords is a catastrophic security vulnerability. If the database is compromised, attackers gain immediate access to user accounts across services (credential stuffing).

### Hashing vs. Encryption
- **Encryption** is two-way: given a ciphertext and a secret key, the plaintext can be decrypted.
- **Hashing** is one-way: given a plain password, a mathematical function produces a fixed-length digest that cannot be mathematically inverted.

### What is a Salt?
A salt is a cryptographically random string appended to the password before hashing. It ensures:
1. Two users with identical passwords will produce completely different hashes.
2. Attackers cannot use precomputed dictionary attacks like **Rainbow Tables**.

### What bcrypt Does
1. Automatically generates a unique, cryptographically secure salt.
2. Incorporates an **adaptive work factor (cost parameter)**. We use 10 rounds, which means $2^{10} = 1024$ iterations of the key derivation function. As hardware speeds up, the cost factor can be increased without changing the underlying code.
3. Uses a timing-safe comparison in `bcrypt.compare()` to protect against side-channel timing attacks.

---

## 9. JSON Web Tokens (JWT)

### Structure of a JWT
A JWT consists of three Base64URL-encoded parts separated by dots (`.`):
`header.payload.signature`

1. **Header**: Contains the algorithm and token type:
   ```json
   { "alg": "HS256", "typ": "JWT" }
   ```
2. **Payload**: Contains the claims (in our project, the user's MongoDB ID and expiration):
   ```json
   { "id": "67401a...", "iat": 1718000000, "exp": 1718086400 }
   ```
3. **Signature**: Cryptographic hash generated by signing `Base64URL(header) + "." + Base64URL(payload)` with `process.env.JWT_SECRET` using HMAC-SHA256:
   ```text
   HMACSHA256(base64UrlEncode(header) + "." + base64UrlEncode(payload), secret)
   ```

### Signing and Verification
- **Signing**: Done in `generateToken()` via `jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1d' })`.
- **Verification**: Done in `authMiddleware.js` via `jwt.verify(token, process.env.JWT_SECRET)`. If the payload is modified even by one character, the cryptographic signature check fails and throws `JsonWebTokenError`.
- **Expiration**: Checked automatically by `jwt.verify`. If `Date.now() > exp`, it throws `TokenExpiredError`.

### Storage & Security Tradeoff in this Project
- We store the JWT in `localStorage` and transmit it via `Authorization: Bearer <token>`.
- **Tradeoff**:
  - *Advantage*: Completely stateless, avoids complex cross-domain cookie issues, works universally across web and mobile clients.
  - *Risk*: Vulnerable to Cross-Site Scripting (XSS) if an attacker can execute malicious scripts in the client context.
  - *Alternative*: HTTP-only cookies protect against XSS token theft, but introduce Cross-Site Request Forgery (CSRF) risks requiring SameSite configurations and anti-CSRF tokens.

---

## 10. Authentication Middleware (`protect`)

Located in: `server/middleware/authMiddleware.js`

When a request arrives at a protected endpoint (e.g. `GET /api/auth/me`):
1. **Reads Header**: Inspects `req.headers.authorization`.
2. **Format Check**: Confirms the header begins with `'Bearer '`.
3. **Token Extraction**: Splits the string and extracts `<token>`. If missing $\rightarrow$ Returns `401 Unauthorized` (`'Not authorized, no token provided'`).
4. **Signature & Expiry Verification**: Calls `jwt.verify(token, process.env.JWT_SECRET)`. If invalid or expired $\rightarrow$ Catches error and returns `401 Unauthorized` (`'Not authorized, token invalid or expired'`).
5. **Database Lookup**: Uses decoded payload ID:
   ```javascript
   const user = await User.findById(decoded.id).select('-password');
   ```
   If user was deleted from the database $\rightarrow$ Returns `401 Unauthorized` (`'Not authorized, user not found'`).
6. **Context Attachment**: Attaches user document to `req.user`.
7. **Control Hand-off**: Calls `next()` to proceed to the controller.

---

## 11. Protected Routes

### Backend Route Protection
Implemented in `server/routes/authRoutes.js`:
```javascript
router.get('/me', protect, getMe);
```
Any request without a valid, unexpired Bearer token is immediately rejected before reaching `getMe`.

### Frontend Route Protection
Implemented in `client/src/components/ProtectedRoute.jsx`:
```jsx
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};
```
If an unauthenticated user enters `/profile` in the address bar, React Router intercepts the render and redirects them to `/login`, storing their intended destination in location state.

---

## 12. Password Reset Flow

1. **Request Reset**: User enters email at `/forgot-password`.
2. **Token Generation**: `forgotPassword` in `authController.js`:
   - Finds user. If not found $\rightarrow$ Returns `404 Not Found`.
   - Generates 32-byte hex token: `crypto.randomBytes(32).toString('hex')`.
   - Sets `resetPasswordToken = token` and `resetPasswordTokenExpiry = Date.now() + 60 * 60 * 1000` (1 hour).
   - Saves user to MongoDB.
3. **Email Delivery**: Sends email containing `${CLIENT_URL}/reset-password/${token}`. In development, logs the Ethereal preview and reset link.
4. **Submission**: User navigates to link, inputs `password` and `confirmPassword` on `ResetPassword.jsx`.
5. **Backend Verification**: `resetPassword` in `authController.js`:
   - Queries `User.findOne({ resetPasswordToken: token, resetPasswordTokenExpiry: { $gt: Date.now() } })`.
   - If not found or expired $\rightarrow$ Returns `400 Bad Request` ("Invalid or expired password reset token").
   - Hashes new password with `bcrypt.genSalt(10)` and `bcrypt.hash()`.
   - **Invalidates Token**: `user.resetPasswordToken = undefined` and `user.resetPasswordTokenExpiry = undefined`.
   - Saves user.
6. **Result**: The old password immediately stops working; user can log in with the new password.

---

## 13. MongoDB & User Schema

Located in `server/models/User.js`:

```javascript
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 50 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  verificationTokenExpiry: { type: Date },
  resetPasswordToken: { type: String },
  resetPasswordTokenExpiry: { type: Date }
}, { timestamps: true });
```

---

## 14. Development Email Logging & Ethereal

Located in: `server/utils/sendEmail.js`

### Why This Mechanism Exists
Ethereal Email is a simulated test SMTP service. It does not deliver messages to real Gmail or Yahoo inboxes. For developers and interviewers running the project locally:
1. `nodemailer.createTestAccount()` generates a disposable test SMTP account on the fly.
2. `nodemailer.getTestMessageUrl(info)` retrieves the public web preview URL on Ethereal.
3. The server prints a structured block in development mode:

```text
========================================
EMAIL SENT - VERIFICATION
========================================
Preview URL:
https://ethereal.email/message/...

Verification Link:
http://localhost:5173/verify-email/...
========================================
```

This allows immediate, one-click manual testing directly from the terminal console without needing real third-party credentials.

---

## 15. Important Files to Study

| Priority | File | Role & Why It Exists | Key Functions |
| :---: | :--- | :--- | :--- |
| **1** | `server/controllers/authController.js` | Core authentication business logic | `register`, `verifyEmail`, `resendVerification`, `login`, `getMe`, `forgotPassword`, `resetPassword` |
| **2** | `server/middleware/authMiddleware.js` | JWT verification and user authorization | `protect` |
| **3** | `server/models/User.js` | Mongoose schema definition and instance methods | `matchPassword`, Schema validation |
| **4** | `server/utils/sendEmail.js` | Nodemailer email transport & formatted dev logging | `sendEmail` |
| **5** | `client/src/services/api.js` | Axios instance with JWT request interceptor | Request Interceptor, API wrappers |
| **6** | `client/src/context/AuthContext.jsx` | React global authentication state management | `login`, `logout`, session initialization |
| **7** | `client/src/pages/Login.jsx` | Login page with unverified resend trigger | `handleSubmit`, `handleResend` |
| **8** | `server/test-auth.js` | Complete 52-test automated verification suite | `runTests`, assertions |

---

## 16. Technical "Why" Questions

### Why MongoDB?
MongoDB provides flexible document modeling (BSON) mapping directly to JavaScript objects. It easily supports embedded auth fields (tokens, expirations) without requiring complex table joins.

### Why Express?
Express is a minimalist, unopinionated Node.js framework providing full control over the HTTP request/response pipeline and custom middleware chaining (e.g. `protect`).

### Why Resend Verification Instead of Allowing Re-Registration?
Allowing re-registration on an existing email can overwrite previous account data or lead to race conditions. A dedicated resend verification endpoint validates identity ownership, respects account creation timestamps, and issues a fresh, time-bounded token while invalidating stale tokens.

### Why Invalidate Old Tokens on Resend?
If a user requests multiple verification emails, allowing previous tokens to remain valid increases the attack surface (token hoarding or leaked old tokens). Overwriting the token ensures only the latest link can activate the account.

### Why JWT over Server-Side Sessions?
Server-side sessions require a stateful session store (like Redis or memory) on the server, which complicates horizontal scaling. JWTs are stateless: all necessary claims are cryptographically signed in the token itself, allowing any server instance to verify identity without a database session lookup.

### Why bcrypt instead of SHA-256 or MD5?
SHA-256 and MD5 are general-purpose cryptographic hash functions designed to be fast. Fast hashing is dangerous for passwords because modern GPUs can compute billions of hashes per second, making brute-force attacks trivial. bcrypt is intentionally slow and includes an adjustable work factor (salt rounds).

---

## 17. Failure Scenarios & Error Handling

| Scenario | HTTP Status | Backend Response / Behavior |
| :--- | :---: | :--- |
| **Wrong Email on Login** | `401` | `{ success: false, message: 'Invalid email or password' }` |
| **Wrong Password on Login** | `401` | `{ success: false, message: 'Invalid email or password' }` |
| **Duplicate Registration** | `409` | `{ success: false, message: 'An account with this email address already exists' }` |
| **Unverified Account Login**| `403` | `{ success: false, message: 'Please verify your email address before logging in...' }` |
| **Resend for Non-existent Email**| `404`| `{ success: false, message: 'No account found with this email address' }` |
| **Resend for Already Verified Account**| `400`| `{ success: false, message: 'This account has already been verified. Please log in.' }` |
| **Old Verification Token Clicked After Resend** | `400` | `{ success: false, message: 'Invalid or expired verification token' }` |
| **Missing JWT on Protected Route** | `401` | `{ success: false, message: 'Not authorized, no token provided' }` |
| **Malformed / Invalid JWT** | `401` | `{ success: false, message: 'Not authorized, token invalid or expired' }` |
| **Expired JWT** | `401` | `{ success: false, message: 'Not authorized, token invalid or expired' }` |
| **Invalid Verification Token** | `400` | `{ success: false, message: 'Invalid or expired verification token' }` |
| **Expired Verification Token** | `400` | `{ success: false, message: 'Invalid or expired verification token' }` |
| **Invalid Reset Token** | `400` | `{ success: false, message: 'Invalid or expired password reset token' }` |
| **Expired Reset Token** | `400` | `{ success: false, message: 'Invalid or expired password reset token' }` |

---

## 18. Sample Interview Questions & Answers

### Beginner Level
**Q: What is the difference between authentication and authorization in this project?**
> *"Authentication is verifying who you are (e.g., verifying credentials on `/api/auth/login` and issuing a JWT). Authorization is verifying what you are allowed to access (e.g., `authMiddleware.js` checking the JWT Bearer token before allowing access to `/api/auth/me`)."*

**Q: What happens if an unverified user tries to log in?**
> *"The backend checks `user.isVerified`. If false, it returns a 403 Forbidden response with a prompt to verify the email. On the frontend, the Login page catches this and presents a 'Resend verification email' option."*

### Intermediate Level
**Q: How does `POST /api/auth/resend-verification` prevent token reuse?**
> *"When a resend request is approved, the controller generates a brand new 32-byte crypto token and overwrites `user.verificationToken` in MongoDB. Because `verifyEmail` queries for matching token equality, the previous token no longer matches the database document and is rejected immediately with a 400 Bad Request."*

**Q: How does `bcrypt.compare()` know which salt was used?**
> *"bcrypt encodes the cost factor and the salt directly into the output hash string (e.g. `$2a$10$N9qo8uLOickgx2ZMRZoMye...`). When `bcrypt.compare(plaintext, hash)` is called, it extracts the salt from the stored hash, hashes the incoming plaintext with that same salt and cost factor, and performs a constant-time comparison."*

### Advanced Level
**Q: Why do we use Ethereal in development instead of real SMTP?**
> *"Real SMTP providers (like Gmail or SendGrid) require API keys, app passwords, or paid tiers, which can easily fail in local student or CI environments due to rate limits or IP restrictions. Ethereal provides an automated, zero-config sandbox that catches emails and provides public web preview URLs via `nodemailer.getTestMessageUrl()`, allowing end-to-end verification flow testing without network dependencies."*

---

## 19. Implementation Status Boundary

To maintain complete integrity during technical interviews, here is the exact separation between what is implemented and what could be added in future iterations:

### IMPLEMENTED
- User registration with field validation and password confirmation.
- 10-round bcrypt password hashing with unique salt generation.
- Duplicate email prevention (`409 Conflict`).
- Cryptographically random 32-byte email verification tokens (`crypto.randomBytes`).
- 24-hour verification token expiry and single-use token invalidation.
- Email verification blocking unverified users from logging in (`403 Forbidden`).
- Resend verification email endpoint (`POST /api/auth/resend-verification`) replacing old tokens with fresh 24h tokens.
- Frontend resend verification action in `Login.jsx` and `VerifyEmail.jsx`.
- Formatted development terminal output displaying Ethereal preview URLs and direct localhost action links.
- User login with `bcrypt.compare` and JWT token generation.
- Stateless JWT authentication with HMAC SHA-256 signature verification.
- Backend authentication middleware (`protect`) attaching `req.user` without password.
- Protected backend route (`GET /api/auth/me`).
- Password reset flow with secure 32-byte token and 1-hour expiration.
- Password reset token invalidation upon completion.
- Client-side session management via React Context (`AuthContext`).
- Axios request interceptor injecting `Authorization: Bearer <token>`.
- Client-side protected route guard (`ProtectedRoute`).
- Automated test suite covering 52 assertions across all authentication and security flows.

### NOT IMPLEMENTED
- Refresh tokens with sliding session expiration.
- Two-Factor Authentication (2FA / TOTP).
- Rate limiting / IP-based brute-force throttling (e.g. `express-rate-limit`).
- OAuth / Social login (Google, GitHub).
- Role-Based Access Control (RBAC) (e.g. Admin, Moderator, User).

### POSSIBLE IMPROVEMENTS
- Implementing an HTTP-only refresh token in a cookie alongside a short-lived in-memory access token.
- Adding `express-rate-limit` on `/api/auth/login` and `/api/auth/resend-verification` to thwart brute-force attacks and email spam.
- Adding password complexity regex requirements (uppercase, numbers, special characters).

---

## 20. Resume Claim Verification

| Resume Claim | Implemented? | Evidence (File & Function/Route) |
| :--- | :---: | :--- |
| **User Registration** | **Yes** | `server/controllers/authController.js` $\rightarrow$ `register()`<br>`server/routes/authRoutes.js` $\rightarrow$ `POST /api/auth/register`<br>`client/src/pages/Register.jsx` |
| **User Login** | **Yes** | `server/controllers/authController.js` $\rightarrow$ `login()`<br>`server/routes/authRoutes.js` $\rightarrow$ `POST /api/auth/login`<br>`client/src/pages/Login.jsx` |
| **Protected Routes** | **Yes** | `server/middleware/authMiddleware.js` $\rightarrow$ `protect`<br>`server/routes/authRoutes.js` $\rightarrow$ `GET /api/auth/me`<br>`client/src/components/ProtectedRoute.jsx`<br>`client/src/pages/Profile.jsx` |
| **JWT-Based Authentication** | **Yes** | `server/controllers/authController.js` $\rightarrow$ `generateToken()`, `login()`<br>`server/middleware/authMiddleware.js` $\rightarrow$ `jwt.verify()`<br>`client/src/services/api.js` $\rightarrow$ Request Interceptor |
| **Email Verification & Resend** | **Yes** | `server/controllers/authController.js` $\rightarrow$ `register()`, `verifyEmail()`, `resendVerification()`<br>`server/routes/authRoutes.js` $\rightarrow$ `GET /api/auth/verify-email/:token`, `POST /api/auth/resend-verification`<br>`client/src/pages/VerifyEmail.jsx`, `client/src/pages/Login.jsx` |
| **Password Reset** | **Yes** | `server/controllers/authController.js` $\rightarrow$ `forgotPassword()`, `resetPassword()`<br>`server/routes/authRoutes.js` $\rightarrow$ `POST /api/auth/forgot-password`, `POST /api/auth/reset-password/:token`<br>`client/src/pages/ForgotPassword.jsx`, `client/src/pages/ResetPassword.jsx` |
| **MongoDB Storage** | **Yes** | `server/models/User.js` $\rightarrow$ `mongoose.model('User', userSchema)`<br>`server/config/db.js` $\rightarrow$ `connectDB()` |
| **bcrypt Password Hashing** | **Yes** | `server/controllers/authController.js` $\rightarrow$ `bcrypt.hash()` in `register` and `resetPassword`<br>`server/models/User.js` $\rightarrow `userSchema.methods.matchPassword` with `bcrypt.compare()` |
| **Authentication Middleware**| **Yes** | `server/middleware/authMiddleware.js` $\rightarrow `protect` function extracting `Bearer` token and attaching `req.user` |
