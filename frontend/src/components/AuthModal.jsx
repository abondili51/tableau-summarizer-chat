import React, { useState } from 'react';

/**
 * AuthModal Component
 * Modal for authenticating with the chat agent
 */
function AuthModal({ isOpen, onClose, onAuthenticated, serverUrl, siteContentUrl }) {
  const [authMethod, setAuthMethod] = useState('pat');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // PAT fields
  const [patName, setPatName] = useState('');
  const [patSecret, setPatSecret] = useState('');
  
  // Standard auth fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Common fields
  const [skipSslVerification, setSkipSslVerification] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { authenticateChatAgent, storeAuthCredentials } = await import('../services/ChatService');
      
      let authData = {};
      
      switch (authMethod) {
        case 'pat':
          if (!patName || !patSecret) {
            throw new Error('Please provide both PAT name and secret');
          }
          authData = {
            patName,
            patSecret,
            skipSslVerification
          };
          break;
          
        case 'standard':
          if (!username || !password) {
            throw new Error('Please provide both username and password');
          }
          authData = {
            username,
            password,
            skipSslVerification
          };
          break;
          
        default:
          throw new Error('Unsupported authentication method');
      }
      
      const result = await authenticateChatAgent({
        authMethod,
        serverUrl: serverUrl || window.location.origin,
        siteContentUrl: siteContentUrl || '',
        authData
      });
      
      // Store credentials for later use
      storeAuthCredentials({
        token: result.token,
        expiresIn: result.expiresIn,
        userId: result.userId,
        siteId: result.siteId,
        authMethod: result.authMethod,
        timestamp: Date.now()
      });
      
      onAuthenticated(result.token);
      onClose();
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Authenticate for Chat
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Auth Method Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Authentication Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAuthMethod('pat')}
                className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                  authMethod === 'pat'
                    ? 'border-tableau-blue bg-blue-50 text-tableau-blue font-medium'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                Personal Access Token
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod('standard')}
                className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                  authMethod === 'standard'
                    ? 'border-tableau-blue bg-blue-50 text-tableau-blue font-medium'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                Username/Password
              </button>
            </div>
          </div>

          {/* PAT Fields */}
          {authMethod === 'pat' && (
            <>
              <div>
                <label htmlFor="patName" className="block text-sm font-medium text-gray-700 mb-1">
                  PAT Name
                </label>
                <input
                  id="patName"
                  type="text"
                  value={patName}
                  onChange={(e) => setPatName(e.target.value)}
                  placeholder="Enter your PAT name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tableau-blue focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label htmlFor="patSecret" className="block text-sm font-medium text-gray-700 mb-1">
                  PAT Secret
                </label>
                <input
                  id="patSecret"
                  type="password"
                  value={patSecret}
                  onChange={(e) => setPatSecret(e.target.value)}
                  placeholder="Enter your PAT secret"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tableau-blue focus:border-transparent"
                  required
                />
              </div>
            </>
          )}

          {/* Standard Auth Fields */}
          {authMethod === 'standard' && (
            <>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your Tableau username"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tableau-blue focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your Tableau password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tableau-blue focus:border-transparent"
                  required
                />
              </div>
            </>
          )}

          {/* Server Info Display */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="text-gray-600">
              <span className="font-medium">Server:</span> {serverUrl || 'Not detected'}
            </p>
            {siteContentUrl && (
              <p className="text-gray-600 mt-1">
                <span className="font-medium">Site:</span> {siteContentUrl}
              </p>
            )}
          </div>

          {/* SSL Verification Toggle */}
          <div className="flex items-center">
            <input
              id="skipSsl"
              type="checkbox"
              checked={skipSslVerification}
              onChange={(e) => setSkipSslVerification(e.target.checked)}
              className="rounded border-gray-300 text-tableau-blue focus:ring-tableau-blue"
            />
            <label htmlFor="skipSsl" className="ml-2 text-sm text-gray-700">
              Skip SSL verification (for self-signed certificates)
            </label>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-tableau-blue hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authenticating...
                </>
              ) : (
                'Authenticate'
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <p className="text-xs text-gray-600">
            Your credentials are used only to authenticate with the Tableau server and are not stored permanently.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthModal;

