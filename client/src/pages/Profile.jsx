import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMe } from '../services/api';

const Profile = () => {
  const { user, token, logout } = useAuth();
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const handleTestProtectedEndpoint = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await getMe();
      setTestResult({
        status: res.status,
        statusText: res.statusText,
        data: res.data
      });
    } catch (err) {
      setTestResult({
        status: err.response?.status || 500,
        error: err.customMessage || 'Protected route request failed'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <div className="avatar-circle">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="profile-header-info">
            <h2>{user?.name}</h2>
            <p className="user-email-text">{user?.email}</p>
            <div className="badge-row">
              {user?.isVerified ? (
                <span className="badge badge-verified">&#10003; Email Verified</span>
              ) : (
                <span className="badge badge-unverified">&#9888; Unverified</span>
              )}
              <span className="badge badge-role">Standard User</span>
            </div>
          </div>
        </div>

        <div className="profile-details-grid">
          <div className="detail-item">
            <span className="detail-label">User ID (MongoDB _id)</span>
            <span className="detail-value code-font">{user?.id || user?._id || 'N/A'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Email Address</span>
            <span className="detail-value">{user?.email}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Account Created</span>
            <span className="detail-value">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active'}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Authentication Type</span>
            <span className="detail-value">JWT (Bearer Token)</span>
          </div>
        </div>

        <div className="demo-section">
          <h3>Authentication Demonstration</h3>
          <p className="demo-description">
            This section demonstrates how your JWT token is managed in the client and verified by the backend middleware.
          </p>

          <div className="token-box">
            <div className="token-box-header">
              <span className="token-label">Current JWT Token (localStorage)</span>
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="btn-text"
              >
                {showToken ? 'Hide Token' : 'Reveal Token'}
              </button>
            </div>
            <div className="token-display">
              {token ? (
                showToken ? (
                  token
                ) : (
                  `${token.substring(0, 24)}... [${token.length} chars total]`
                )
              ) : (
                'No token present'
              )}
            </div>
          </div>

          <div className="api-test-box">
            <div className="test-header">
              <div>
                <strong>Test Backend Protection:</strong> <code>GET /api/auth/me</code>
                <p className="test-subtext">
                  Sends request with <code>Authorization: Bearer &lt;token&gt;</code>
                </p>
              </div>
              <button
                onClick={handleTestProtectedEndpoint}
                className="btn-secondary"
                disabled={testing}
              >
                {testing ? 'Testing...' : 'Send Protected Request'}
              </button>
            </div>

            {testResult && (
              <div className="response-preview">
                <span className="preview-label">HTTP {testResult.status} Response:</span>
                <pre>{JSON.stringify(testResult, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>

        <div className="profile-actions">
          <button onClick={logout} className="btn-danger">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
