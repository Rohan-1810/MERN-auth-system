import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { loginUser, resendVerificationEmail } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showResend, setShowResend] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
    setShowResend(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setShowResend(false);

    const { email, password } = formData;

    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    try {
      setLoading(true);
      const res = await loginUser({ email, password });
      login(res.data.token, res.data.user);

      // Redirect to intended route or default to profile
      const redirectPath = location.state?.from?.pathname || '/profile';
      navigate(redirectPath, { replace: true });
    } catch (err) {
      const msg = err.customMessage || 'Login failed. Please check your credentials.';
      setError(msg);
      // Check if user is unverified
      if (msg.toLowerCase().includes('verify') || err.response?.status === 403) {
        setShowResend(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!formData.email) {
      setError('Please enter your email address to resend verification.');
      return;
    }

    try {
      setResending(true);
      setError('');
      setSuccess('');
      const res = await resendVerificationEmail(formData.email);
      setSuccess(
        res.data.message ||
          'Verification email resent successfully! Please check your inbox or terminal.'
      );
      setShowResend(false);
    } catch (err) {
      setError(err.customMessage || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-card-wrapper">
      <div className="auth-card">
        <h2 className="auth-title">Welcome Back</h2>
        <p className="auth-subtitle">Log in with your credentials to access your account</p>

        {error && (
          <div className="alert alert-error">
            <div>{error}</div>
            {showResend && (
              <div style={{ marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={handleResend}
                  className="btn-text"
                  disabled={resending}
                  style={{ color: '#b91c1c', fontWeight: 'bold' }}
                >
                  {resending ? 'Sending new verification link...' : 'Resend verification email \u2192'}
                </button>
              </div>
            )}
          </div>
        )}

        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="password">Password</label>
              <Link to="/forgot-password" className="form-link">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
