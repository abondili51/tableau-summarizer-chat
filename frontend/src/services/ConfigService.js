/**
 * Configuration Service
 * Loads and provides access to application configuration
 */

// Import the config file
import config from '../../config.json';

/**
 * Get the full configuration object
 * @returns {Object} Configuration object
 */
export function getConfig() {
  return config;
}

/**
 * Get API configuration
 * @returns {Object} API configuration (backend_url, chat_agent_url)
 */
export function getApiConfig() {
  return config.api;
}

/**
 * Get timeout configuration
 * @returns {Object} Timeout configuration in milliseconds
 */
export function getTimeouts() {
  return config.timeouts;
}

/**
 * Get parameter names configuration
 * @returns {Object} Parameter names for Tableau parameters
 */
export function getParameterNames() {
  return config.parameters;
}

/**
 * Get backend API URL
 * @returns {string} Backend API base URL
 */
export function getBackendUrl() {
  return config.api.backend_url;
}

/**
 * Get chat agent API URL
 * @returns {string} Chat agent API base URL
 */
export function getChatAgentUrl() {
  return config.api.chat_agent_url;
}

export default {
  getConfig,
  getApiConfig,
  getTimeouts,
  getParameterNames,
  getBackendUrl,
  getChatAgentUrl
};

