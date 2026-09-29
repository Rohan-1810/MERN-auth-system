import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { verifyEmailToken } from '../services/api';

const VerifyEmail = () => {
  const { token: paramToken } = useParams();
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get('token');
  const token = paramToken || queryToken;

  const [status, setStatus] = useState('idle'); // 'idle' | 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [manualToken, setManualToken] = useState('');

  const performVerification = async (tokenToVerify) => {
    if (!tokenToVerify) return;

    setStatus('verifying');
    setMessage('Verifying your email address, please wait...');

    try {
      const res = await verifyEmailToken(tokenToVerify);
      setStatus('success');
      setMessage(res.data.message || 'Email verified successfully! You can now log in.');
    } catch (err) {
      setStatus('error');
      setMessage(err.customMessage || 'Invalid or expired verification token.');
    }
  };

  useEffect(() => {
    if (token) {
      performVerification(token);
    }
  }, [token]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualToken.trim()) {
      performVerification(manualToken.trim());
    }
  };

  return (
    <div className="auth-card-wrapper">
      <div className="auth-card">
        <h2 className="auth-title">Email Verification</h2>

        {status === 'verifying' && (
          <div className="verification-state">
            <div className="spinner"></div>
            <p className="auth-subtitle">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="verification-state">
            <div className="status-icon success-icon">&#10003;</div>
            <div className="alert alert-success">{message}</div>
            <Link to="/login" className="btn-primary btn-block">
              Proceed to Sign In
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="verification-state">
            <div className="status-icon error-icon">&#10007;</div>
            <div className="alert alert-error">{message}</div>
            <div className="action-row">
              <Link to="/login" className="btn-secondary">
                Back to Login
              </Link>
              <Link to="/register" className="btn-primary">
                Register Again
              </Link>
            </div>
          </div>
        )}

        {status === 'idle' && !token && (
          <div>
            <p className="auth-subtitle">
              Paste the verification token from your email link below to verify your account:
            </p>
            <form onSubmit={handleManualSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="token">Verification Token</label>
                <input
                  id="token"
                  type="text"
                  placeholder="Paste verification token"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn-primary">
                Verify Email
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
