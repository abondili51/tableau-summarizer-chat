/**
 * Chat Agent API Service
 * Handles communication with the Tableau chat agent backend
 */

// Backend API URLs
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
const CHAT_AGENT_URL = import.meta.env.VITE_CHAT_AGENT_URL || 'http://localhost:8000';

/**
 * Authenticate with the chat agent using PAT or standard credentials
 * 
 * @param {Object} credentials - Authentication credentials
 * @param {string} credentials.authMethod - 'pat', 'standard', or 'oauth'
 * @param {string} credentials.serverUrl - Tableau server URL
 * @param {string} credentials.siteContentUrl - Site content URL (optional)
 * @param {Object} credentials.authData - Auth-specific data (PAT, username/password, etc.)
 * @returns {Promise<string>} - JWT access token
 */
export async function authenticateChatAgent(credentials) {
  try {
    const { authMethod, serverUrl, siteContentUrl = '', authData } = credentials;
    
    let endpoint = '';
    let payload = {};
    
    switch (authMethod) {
      case 'pat':
        endpoint = '/api/auth/pat';
        payload = {
          pat_name: authData.patName,
          pat_secret: authData.patSecret,
          site_content_url: siteContentUrl || '',
          server_url: serverUrl,
          skip_ssl_verification: authData.skipSslVerification || false
        };
        break;
        
      case 'standard':
        endpoint = '/api/auth/login';
        payload = {
          username: authData.username,
          password: authData.password,
          site_content_url: siteContentUrl,
          server_url: serverUrl,
          skip_ssl_verification: authData.skipSslVerification || false
        };
        break;
        
      case 'oauth':
        endpoint = '/api/auth/oauth/login';
        payload = {
          client_id: authData.clientId,
          auth_code: authData.authCode,
          redirect_uri: authData.redirectUri,
          site_content_url: siteContentUrl,
          server_url: serverUrl,
          tableau_auth_method: authData.tableauAuthMethod || 'eas'
        };
        break;
        
      default:
        throw new Error(`Unsupported auth method: ${authMethod}`);
    }
    
    console.log('→ Authenticating with chat agent');
    console.log('  Chat Agent URL:', CHAT_AGENT_URL);
    console.log('  Endpoint:', endpoint);
    console.log('  Auth method:', authMethod);
    console.log('  Server URL:', serverUrl);
    
    const response = await fetch(`${CHAT_AGENT_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Authentication failed');
      console.error('  Status:', response.status);
      console.error('  Response:', data);
      throw new Error(data.detail || 'Authentication failed');
    }
    
    console.log('✓ Authentication successful');
    console.log('  User ID:', data.user_id);
    console.log('  Site ID:', data.site_id);
    console.log('  Token expires in:', data.expires_in, 'seconds');
    
    if (data.success && data.access_token) {
      return {
        token: data.access_token,
        expiresIn: data.expires_in,
        userId: data.user_id,
        siteId: data.site_id,
        authMethod: data.auth_method
      };
    } else {
      throw new Error('Authentication failed - no token received');
    }
  } catch (error) {
    console.error('Chat agent authentication error:', error);
    throw new Error(error.message || 'Failed to authenticate with chat agent');
  }
}

/**
 * Send a question to the chat agent
 * 
 * @param {Object} params - Query parameters
 * @param {string} params.question - The user's question
 * @param {string} params.datasourceId - Tableau datasource LUID
 * @param {string} params.accessToken - JWT access token from authentication
 * @param {string} params.sessionId - Optional session ID for conversation continuity
 * @param {Object} params.additionalContext - Optional additional context
 * @param {string} params.summaryContext - Optional summary to provide as context
 * @returns {Promise<Object>} - Response with answer and metadata
 */
export async function sendChatQuery(params) {
  try {
    const {
      question,
      datasourceId,
      accessToken,
      sessionId = null,
      additionalContext = null,
      summaryContext = null
    } = params;
    
    const payload = {
      question,
      datasource_id: datasourceId,
      session_id: sessionId
    };
    
    // Add additional context if provided
    if (additionalContext || summaryContext) {
      payload.additional_context_override = {
        unstructured_context: [
          summaryContext ? `Dashboard Summary Context:\n${summaryContext}` : null,
          additionalContext ? `Additional Context:\n${additionalContext}` : null
        ].filter(Boolean).join('\n\n')
      };
    }
    
    console.log('→ Sending query to chat agent');
    console.log('  Chat Agent URL:', CHAT_AGENT_URL);
    console.log('  Datasource ID being sent:', datasourceId);
    console.log('  Question:', question.substring(0, 50) + '...');
    console.log('  Access Token present:', !!accessToken);
    if (accessToken) {
      console.log('  Token preview:', accessToken.substring(0, 20) + '...');
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
    
    const response = await fetch(`${CHAT_AGENT_URL}/api/agent/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Chat agent request failed');
      console.error('  Status:', response.status);
      console.error('  Response data:', data);
      
      // Handle authentication errors specifically
      if (response.status === 401) {
        throw new Error('Authentication failed. Please re-authenticate with the chat agent.');
      }
      
      // For 422 validation errors, show detailed field errors
      if (response.status === 422 && data.detail) {
        console.error('Validation error:', data.detail);
        if (Array.isArray(data.detail)) {
          const errors = data.detail.map(err => 
            `${err.loc?.join('.')} - ${err.msg}`
          ).join('; ');
          throw new Error(`Validation error: ${errors}`);
        }
      }
      throw new Error(data.detail || data.error || data.message || 'Query failed');
    }
    
    // Validate we have the expected fields
    if (typeof data !== 'object' || data === null) {
      console.error('Invalid response type:', data);
      throw new Error('Invalid response format - expected object');
    }
    
    // Check for answer field
    if (!data.answer && data.answer !== '') {
      console.error('Missing answer field in response');
      throw new Error('No answer field in response');
    }
    
    // Handle the response - the backend returns the data directly without a wrapper
    return {
      answer: String(data.answer || 'No answer received'),
      status: data.status || 'unknown',
      reasoningProcess: Array.isArray(data.reasoning_process) ? data.reasoning_process : [],
      queryMetadata: data.query_metadata || {},
      conversationId: data.conversation_id || null,
      executionTime: typeof data.execution_time_seconds === 'number' ? data.execution_time_seconds : 0
    };
  } catch (error) {
    console.error('Chat query error:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    
    throw new Error(error.message || 'Failed to process question');
  }
}

/**
 * Send a streaming query to the chat agent (for real-time responses)
 * 
 * @param {Object} params - Query parameters (same as sendChatQuery)
 * @param {Function} onChunk - Callback for each chunk received
 * @returns {Promise<void>}
 */
export async function sendStreamingChatQuery(params, onChunk) {
  try {
    const {
      question,
      datasourceId,
      accessToken,
      sessionId = null,
      additionalContext = null,
      summaryContext = null
    } = params;
    
    const payload = {
      question,
      datasource_id: datasourceId,
      session_id: sessionId
    };
    
    // Add additional context if provided
    if (additionalContext || summaryContext) {
      payload.additional_context_override = {
        unstructured_context: [
          summaryContext ? `Dashboard Summary Context:\n${summaryContext}` : null,
          additionalContext ? `Additional Context:\n${additionalContext}` : null
        ].filter(Boolean).join('\n\n')
      };
    }
    
    const response = await fetch(`${CHAT_AGENT_URL}/api/agent/query/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || 'Streaming query failed');
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const chunk = JSON.parse(line);
            onChunk(chunk);
          } catch (e) {
            console.error('Failed to parse streaming chunk:', e);
          }
        }
      }
    }
  } catch (error) {
    console.error('Streaming query error:', error);
    throw new Error(error.message || 'Failed to process streaming question');
  }
}

/**
 * Check chat agent health status
 * 
 * @returns {Promise<Object>} - Health status
 */
export async function checkChatAgentHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${CHAT_AGENT_URL}/health`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const data = await response.json();
    
    return {
      healthy: data.status === 'healthy',
      version: data.version,
      services: data.services || {},
      timestamp: data.timestamp
    };
  } catch (error) {
    console.error('Error checking chat agent health:', error);
    return {
      healthy: false,
      error: error.message
    };
  }
}

/**
 * Store auth credentials securely (in sessionStorage for now)
 */
export function storeAuthCredentials(credentials) {
  try {
    sessionStorage.setItem('chat_agent_credentials', JSON.stringify(credentials));
  } catch (error) {
    console.error('Failed to store credentials:', error);
  }
}

/**
 * Retrieve stored auth credentials
 */
export function getStoredAuthCredentials() {
  try {
    const stored = sessionStorage.getItem('chat_agent_credentials');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to retrieve credentials:', error);
    return null;
  }
}

/**
 * Clear stored auth credentials
 */
export function clearAuthCredentials() {
  try {
    sessionStorage.removeItem('chat_agent_credentials');
  } catch (error) {
    console.error('Failed to clear credentials:', error);
  }
}

