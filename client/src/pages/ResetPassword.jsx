import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { resetPasswordRequest } from '../services/api';

const ResetPassword = () => {
  const { token } = useParams();

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const { password, confirmPassword } = formData;

    if (!password || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true);
      const res = await resetPasswordRequest(token, { password, confirmPassword });
      setSuccess(
        res.data.message || 'Your password has been successfully reset! You can now log in.'
      );
      setFormData({ password: '', confirmPassword: '' });
    } catch (err) {
      setError(
        err.customMessage ||
          'Failed to reset password. The link may have expired or is invalid.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card-wrapper">
      <div className="auth-card">
        <h2 className="auth-title">Reset Password</h2>
        <p className="auth-subtitle">Choose a new, secure password for your account</p>

        {error && (
          <div className="alert alert-error">
            {error}
            <div style={{ marginTop: '8px' }}>
              <Link to="/forgot-password" style={{ color: 'inherit', fontWeight: 'bold' }}>
                Request a new password reset link &rarr;
              </Link>
            </div>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
            <div style={{ marginTop: '12px' }}>
              <Link to="/login" className="btn-primary btn-block">
                Sign In With New Password
              </Link>
            </div>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="password">New Password</label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                placeholder="Re-enter new password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Updating Password...' : 'Reset Password'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          Back to <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
