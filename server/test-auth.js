const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const User = require('./models/User');

const API_BASE = 'http://localhost:5000/api/auth';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('    MERN AUTHENTICATION SYSTEM - COMPLETE TEST SUITE');
  console.log('====================================================\n');

  // Connect to DB directly for state assertions
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mern_auth_db');

  const testEmail = `student_${Date.now()}@example.com`;
  const originalPassword = 'SecurePassword123!';
  const newPassword = 'NewSecurePassword456!';

  // Clean up any previous test user with this email
  await User.deleteOne({ email: testEmail });

  // ----------------------------------------------------
  // 1. REGISTRATION TESTS
  // ----------------------------------------------------
  console.log('--- 1. Testing Registration ---');

  // Test 1.1: Password mismatch
  {
    const res = await request('/register', {
      method: 'POST',
      body: { name: 'Test User', email: testEmail, password: 'password1', confirmPassword: 'password2' }
    });
    assert(res.status === 400 && res.data.message.includes('Passwords do not match'),
      'Registration rejects mismatched passwords with 400');
  }

  // Test 1.2: Password too short (< 6 chars)
  {
    const res = await request('/register', {
      method: 'POST',
      body: { name: 'Test User', email: testEmail, password: '123', confirmPassword: '123' }
    });
    assert(res.status === 400 && res.data.message.includes('at least 6 characters'),
      'Registration rejects passwords shorter than 6 characters with 400');
  }

  // Test 1.3: Missing required fields
  {
    const res = await request('/register', {
      method: 'POST',
      body: { name: '', email: testEmail, password: 'password123', confirmPassword: 'password123' }
    });
    assert(res.status === 400, 'Registration rejects missing fields with 400');
  }

  // Test 1.4: Valid registration
  let verificationToken = '';
  {
    const res = await request('/register', {
      method: 'POST',
      body: { name: 'Rohan Gupta', email: testEmail, password: originalPassword, confirmPassword: originalPassword }
    });
    assert(res.status === 201 && res.data.success === true,
      'Valid registration succeeds with 201 Created and success flag');

    const createdUser = await User.findOne({ email: testEmail });
    assert(createdUser !== null, 'User is stored in MongoDB');
    assert(createdUser.isVerified === false, 'New user is unverified (isVerified: false)');
    assert(createdUser.password.startsWith('$2'), 'User password in MongoDB is hashed with bcrypt');
    assert(createdUser.password !== originalPassword, 'Plaintext password is never stored');
    assert(typeof createdUser.verificationToken === 'string' && createdUser.verificationToken.length > 20,
      'Secure random verification token generated and stored');
    assert(createdUser.verificationTokenExpiry > new Date(), 'Verification token has future expiry time');

    verificationToken = createdUser.verificationToken;
  }

  // Test 1.5: Duplicate email registration
  {
    const res = await request('/register', {
      method: 'POST',
      body: { name: 'Duplicate User', email: testEmail, password: originalPassword, confirmPassword: originalPassword }
    });
    assert(res.status === 409, 'Registration rejects duplicate email with 409 Conflict');
  }

  // ----------------------------------------------------
  // 2. LOGIN TESTS (PRE-VERIFICATION)
  // ----------------------------------------------------
  console.log('\n--- 2. Testing Login (Unverified Account) ---');

  // Test 2.1: Login with incorrect password
  {
    const res = await request('/login', {
      method: 'POST',
      body: { email: testEmail, password: 'WrongPassword123' }
    });
    assert(res.status === 401 && res.data.message.includes('Invalid email or password'),
      'Login with incorrect password rejected with 401');
  }

  // Test 2.2: Login with non-existent email
  {
    const res = await request('/login', {
      method: 'POST',
      body: { email: 'nonexistent_user_999@example.com', password: 'AnyPassword123' }
    });
    assert(res.status === 401 && res.data.message.includes('Invalid email or password'),
      'Login with non-existent email rejected with 401');
  }

  // Test 2.3: Login with unverified email
  {
    const res = await request('/login', {
      method: 'POST',
      body: { email: testEmail, password: originalPassword }
    });
    assert(res.status === 403 && res.data.message.includes('verify your email'),
      'Login for unverified account rejected with 403 Forbidden');
  }

  // ----------------------------------------------------
  // 3. EMAIL VERIFICATION TESTS
  // ----------------------------------------------------
  console.log('\n--- 3. Testing Email Verification ---');

  // Test 3.1: Invalid verification token
  {
    const res = await request('/verify-email/fake_token_12345');
    assert(res.status === 400 && res.data.message.includes('Invalid or expired'),
      'Invalid verification token rejected with 400');
  }

  // Test 3.2: Expired verification token
  {
    // Temporarily set token expiry to past
    await User.updateOne({ email: testEmail }, { verificationTokenExpiry: new Date(Date.now() - 10000) });
    const res = await request(`/verify-email/${verificationToken}`);
    assert(res.status === 400, 'Expired verification token rejected with 400');

    // Restore future expiry for valid test
    await User.updateOne({ email: testEmail }, { verificationTokenExpiry: new Date(Date.now() + 100000) });
  }

  // Test 3.3: Resend verification with non-existent email
  {
    const res = await request('/resend-verification', {
      method: 'POST',
      body: { email: 'nonexistent_resend@example.com' }
    });
    assert(res.status === 404 && res.data.message.includes('No account found'),
      'Resend verification rejects non-existent email with 404');
  }

  // Test 3.4: Resend verification for unverified account generates fresh token
  let newVerificationToken = '';
  {
    const res = await request('/resend-verification', {
      method: 'POST',
      body: { email: testEmail }
    });
    assert(res.status === 200 && res.data.success === true,
      'Resend verification returns 200 OK');

    const updatedUser = await User.findOne({ email: testEmail });
    assert(updatedUser.verificationToken !== verificationToken,
      'Old verification token was replaced by a fresh token');
    assert(updatedUser.verificationTokenExpiry > new Date(),
      'New verification token has a fresh future expiry time');

    newVerificationToken = updatedUser.verificationToken;
  }

  // Test 3.5: Old verification token is now rejected (invalidated)
  {
    const res = await request(`/verify-email/${verificationToken}`);
    assert(res.status === 400, 'Old verification token is rejected with 400 after replacement');
  }

  // Test 3.6: New verification token successfully verifies account
  {
    const res = await request(`/verify-email/${newVerificationToken}`);
    assert(res.status === 200 && res.data.success === true,
      'New verification token succeeds with 200 OK');

    const verifiedUser = await User.findOne({ email: testEmail });
    assert(verifiedUser.isVerified === true, 'User is marked verified (isVerified: true) in MongoDB');
    assert(verifiedUser.verificationToken === undefined, 'Verification token is cleared/invalidated in MongoDB');
    assert(verifiedUser.verificationTokenExpiry === undefined, 'Verification token expiry is cleared in MongoDB');
  }

  // Test 3.7: Reused new verification token is rejected
  {
    const res = await request(`/verify-email/${newVerificationToken}`);
    assert(res.status === 400, 'Reused verification token rejected with 400 (Token invalidation)');
  }

  // Test 3.8: Resend verification on already verified account is rejected
  {
    const res = await request('/resend-verification', {
      method: 'POST',
      body: { email: testEmail }
    });
    assert(res.status === 400 && res.data.message.includes('already been verified'),
      'Resend verification for already verified user rejected with 400');
  }

  // ----------------------------------------------------
  // 4. LOGIN TESTS (POST-VERIFICATION) & JWT
  // ----------------------------------------------------
  console.log('\n--- 4. Testing Login & JWT Authentication ---');

  let authToken = '';
  {
    const res = await request('/login', {
      method: 'POST',
      body: { email: testEmail, password: originalPassword }
    });
    assert(res.status === 200 && res.data.success === true,
      'Verified user login succeeds with 200 OK');
    assert(typeof res.data.token === 'string' && res.data.token.length > 30,
      'JWT token returned in login response');
    assert(res.data.user.email === testEmail, 'Authenticated user details returned');
    assert(res.data.user.password === undefined, 'Password is NOT exposed in login response');

    authToken = res.data.token;
  }

  // ----------------------------------------------------
  // 5. PROTECTED ROUTE TESTS (/api/auth/me)
  // ----------------------------------------------------
  console.log('\n--- 5. Testing Protected Route (/api/auth/me) ---');

  // Test 5.1: Missing JWT
  {
    const res = await request('/me');
    assert(res.status === 401 && res.data.message.includes('no token provided'),
      'Protected route rejects request without token with 401');
  }

  // Test 5.2: Invalid JWT
  {
    const res = await request('/me', {
      headers: { Authorization: 'Bearer this_is_an_invalid_token' }
    });
    assert(res.status === 401 && res.data.message.includes('token invalid or expired'),
      'Protected route rejects malformed token with 401');
  }

  // Test 5.3: Expired JWT
  {
    const expiredToken = jwt.sign(
      { id: new mongoose.Types.ObjectId() },
      process.env.JWT_SECRET || 'supersecretjwtkey_mern_auth_system_2026_dev_key',
      { expiresIn: '-1s' }
    );
    const res = await request('/me', {
      headers: { Authorization: `Bearer ${expiredToken}` }
    });
    assert(res.status === 401, 'Protected route rejects expired JWT with 401');
  }

  // Test 5.4: Valid JWT
  {
    const res = await request('/me', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(res.status === 200 && res.data.success === true,
      'Protected route with valid JWT succeeds with 200 OK');
    assert(res.data.user.email === testEmail, 'Protected route returns current authenticated user');
    assert(res.data.user.password === undefined, 'Protected route never returns password field');
  }

  // ----------------------------------------------------
  // 6. PASSWORD RESET FLOW TESTS
  // ----------------------------------------------------
  console.log('\n--- 6. Testing Password Reset Flow ---');

  // Test 6.1: Forgot password with non-existent email
  {
    const res = await request('/forgot-password', {
      method: 'POST',
      body: { email: 'does_not_exist@example.com' }
    });
    assert(res.status === 404, 'Forgot password rejects non-existent email with 404');
  }

  // Test 6.2: Forgot password with valid email
  let resetToken = '';
  {
    const res = await request('/forgot-password', {
      method: 'POST',
      body: { email: testEmail }
    });
    assert(res.status === 200 && res.data.success === true,
      'Forgot password with valid email returns 200 OK');

    const userWithReset = await User.findOne({ email: testEmail });
    assert(typeof userWithReset.resetPasswordToken === 'string' && userWithReset.resetPasswordToken.length > 20,
      'Secure random reset token stored in MongoDB');
    assert(userWithReset.resetPasswordTokenExpiry > new Date(), 'Reset token has valid future expiration');

    resetToken = userWithReset.resetPasswordToken;
  }

  // Test 6.3: Reset password with invalid token
  {
    const res = await request('/reset-password/fake_reset_token', {
      method: 'POST',
      body: { password: newPassword, confirmPassword: newPassword }
    });
    assert(res.status === 400 && res.data.message.includes('Invalid or expired'),
      'Reset password with invalid token rejected with 400');
  }

  // Test 6.4: Reset password with expired token
  {
    await User.updateOne({ email: testEmail }, { resetPasswordTokenExpiry: new Date(Date.now() - 5000) });
    const res = await request(`/reset-password/${resetToken}`, {
      method: 'POST',
      body: { password: newPassword, confirmPassword: newPassword }
    });
    assert(res.status === 400, 'Reset password with expired token rejected with 400');

    // Restore valid expiry for subsequent test
    await User.updateOne({ email: testEmail }, { resetPasswordTokenExpiry: new Date(Date.now() + 60000) });
  }

  // Test 6.5: Reset password with mismatching passwords
  {
    const res = await request(`/reset-password/${resetToken}`, {
      method: 'POST',
      body: { password: newPassword, confirmPassword: 'DifferentPassword123' }
    });
    assert(res.status === 400 && res.data.message.includes('Passwords do not match'),
      'Reset password rejects mismatched passwords with 400');
  }

  // Test 6.6: Valid password reset
  {
    const res = await request(`/reset-password/${resetToken}`, {
      method: 'POST',
      body: { password: newPassword, confirmPassword: newPassword }
    });
    assert(res.status === 200 && res.data.success === true,
      'Valid password reset succeeds with 200 OK');

    const updatedUser = await User.findOne({ email: testEmail });
    assert(updatedUser.resetPasswordToken === undefined, 'Reset password token is invalidated in MongoDB');
    assert(updatedUser.resetPasswordTokenExpiry === undefined, 'Reset token expiry cleared in MongoDB');
    assert(await bcrypt.compare(newPassword, updatedUser.password), 'New password is properly hashed with bcrypt');
  }

  // Test 6.7: Old password fails at login
  {
    const res = await request('/login', {
      method: 'POST',
      body: { email: testEmail, password: originalPassword }
    });
    assert(res.status === 401, 'Old password fails authentication with 401');
  }

  // Test 6.8: New password succeeds at login
  {
    const res = await request('/login', {
      method: 'POST',
      body: { email: testEmail, password: newPassword }
    });
    assert(res.status === 200 && res.data.success === true,
      'New password succeeds authentication with 200 OK and returns new JWT');
  }

  // ----------------------------------------------------
  // 7. SECURITY & INTEGRITY CHECKS
  // ----------------------------------------------------
  console.log('\n--- 7. Testing Security & Config Integrity ---');

  // Test 7.1: .gitignore contains .env
  {
    const gitignorePath = path.join(__dirname, '..', '.gitignore');
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    assert(gitignoreContent.includes('.env'), '.gitignore properly ignores .env files');
  }

  // Test 7.2: .env.example exists and contains template keys
  {
    const envExamplePath = path.join(__dirname, '..', '.env.example');
    assert(fs.existsSync(envExamplePath), '.env.example exists in root repository');
  }

  console.log('\n====================================================');
  console.log(`TEST RUN FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test Suite encountered fatal error:', err);
  process.exit(1);
});
