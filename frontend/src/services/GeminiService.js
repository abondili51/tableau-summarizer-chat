/**
 * Google Gemini API Service via Vertex AI
 * Handles communication with the backend API for Gemini summarization
 */

import { getBackendUrl, getTimeouts } from './ConfigService';

// Backend API URL from configuration
const API_BASE_URL = getBackendUrl();
const TIMEOUTS = getTimeouts();

/**
 * Generate summary using Google Gemini via Vertex AI
 * 
 * @param {Object} payload - Contains sheets_data, metadata, and context
 * @returns {Promise} - Resolved with summary text
 */
export async function generateSummary(payload) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS.summary_generation_ms);

    const response = await fetch(`${API_BASE_URL}/api/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || data.error || 'Failed to generate summary');
    }

    if (data.success) {
      return {
        summary: data.summary,
        timestamp: data.timestamp
      };
    } else {
      throw new Error(data.error || 'Failed to generate summary');
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again with less data.');
    }
    
    throw new Error(error.message || 'Failed to generate summary');
  }
}

/**
 * Test prompt generation without calling Gemini
 * Useful for debugging
 * 
 * @param {Object} payload - Contains sheets_data, metadata, and context
 * @returns {Promise} - Resolved with generated prompt
 */
export async function testPrompt(payload) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/test-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || data.error || 'Failed to generate test prompt');
    }

    if (data.success) {
      return {
        prompt: data.prompt
      };
    } else {
      throw new Error(data.error || 'Failed to generate test prompt');
    }
  } catch (error) {
    console.error('Error testing prompt:', error);
    throw error;
  }
}

/**
 * Check backend health status
 * 
 * @returns {Promise} - Resolved with health status
 */
export async function checkHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS.health_check_ms);

    const response = await fetch(`${API_BASE_URL}/health`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    return {
      healthy: data.status === 'healthy',
      vertexAiConfigured: data.vertex_ai_configured,
      projectId: data.project_id,
      location: data.location,
      timestamp: data.timestamp
    };
  } catch (error) {
    console.error('Error checking backend health:', error);
    return {
      healthy: false,
      vertexAiConfigured: false,
      error: error.message
    };
  }
}

