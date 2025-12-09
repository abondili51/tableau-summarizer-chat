import React, { useState, useEffect } from 'react';
import SheetSelector from './components/SheetSelector';
import ContextInput from './components/ContextInput';
import SummaryPanel from './components/SummaryPanel';
import ChatInterface from './components/ChatInterface';
import AuthModal from './components/AuthModal';
import { initializeTableau, getSheets, extractSheetData, getDashboardMetadata, getDatasourceMetadata, subscribeToFilterChanges, subscribeToParameterChanges, getTableauServerInfo, getPrimaryDatasourceId, getAllDatasources, saveSettings, loadSettings } from './services/TableauConnector';
import { generateSummary } from './services/GeminiService';
import { getStoredAuthCredentials } from './services/ChatService';

// Default system prompt (matches backend's get_system_instruction())
const DEFAULT_SYSTEM_PROMPT = `You are a business intelligence analyst. Analyze this Tableau dashboard and provide a concise, executive-ready summary in less than 200 words.

Focus on:
- Key trends and patterns
- Notable insights or anomalies
- Use field definitions and descriptions to provide context-aware interpretations

Format: Follow any instructions in Business Context section, otherwise use clear bullet points. Be concise and business-friendly.`;

function App() {
  // State management
  const [isInitialized, setIsInitialized] = useState(false);
  const [sheets, setSheets] = useState([]);
  const [selectedSheets, setSelectedSheets] = useState([]);
  const [context, setContext] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Chat mode state
  const [mode, setMode] = useState('summary'); // 'summary' or 'chat'
  const [chatAccessToken, setChatAccessToken] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [serverInfo, setServerInfo] = useState(null);
  const [datasources, setDatasources] = useState([]);
  const [selectedDatasource, setSelectedDatasource] = useState(null);

  // Initialize Tableau Extension on mount
  useEffect(() => {
    initializeExtension();
  }, []);

  // Subscribe to filter and parameter changes for auto-refresh
  useEffect(() => {
    if (isInitialized && autoRefresh && selectedSheets.length > 0 && summary) {
      const unsubscribeFilter = subscribeToFilterChanges(handleFilterChange);
      const unsubscribeParam = subscribeToParameterChanges(handleFilterChange);
      return () => {
        if (unsubscribeFilter) unsubscribeFilter();
        if (unsubscribeParam) unsubscribeParam();
      };
    }
  }, [isInitialized, autoRefresh, selectedSheets, summary]);

  // Auto-save system prompt when author changes it
  useEffect(() => {
    if (isInitialized && serverInfo?.mode === 'authoring') {
      setSavingSettings(true);
      const timeoutId = setTimeout(async () => {
        try {
          await saveSettings({ systemPrompt });
          setSavingSettings(false);
        } catch (err) {
          console.warn('Could not save system prompt:', err);
          setSavingSettings(false);
        }
      }, 1000);

      return () => {
        clearTimeout(timeoutId);
        setSavingSettings(false);
      };
    }
  }, [systemPrompt, isInitialized, serverInfo]);

  /**
   * Initialize the Tableau extension and load available sheets
   */
  const initializeExtension = async () => {
    try {
      setLoading(true);
      await initializeTableau();
      const availableSheets = await getSheets();
      setSheets(availableSheets);
      
      // Get server info for chat authentication
      const info = getTableauServerInfo();
      setServerInfo(info);
      
      // Get all datasources
      const allDatasources = await getAllDatasources();
      console.log('All datasources found:', allDatasources);
      setDatasources(allDatasources);
      
      // Set primary datasource as default
      if (allDatasources.length > 0) {
        console.log('Setting default datasource:', allDatasources[0]);
        setSelectedDatasource(allDatasources[0]);
      }
      
      // Check for stored auth credentials
      const storedCreds = getStoredAuthCredentials();
      if (storedCreds && storedCreds.token) {
        // Check if token is still valid (simple expiry check)
        const tokenAge = Date.now() - storedCreds.timestamp;
        if (tokenAge < storedCreds.expiresIn * 1000) {
          setChatAccessToken(storedCreds.token);
        }
      }
      
      // Load saved system prompt (author-configured)
      try {
        const savedSettings = loadSettings();
        if (savedSettings && savedSettings.systemPrompt) {
          setSystemPrompt(savedSettings.systemPrompt);
        } else {
          // Pre-populate with default on first load
          setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
        }
      } catch (err) {
        console.warn('Could not load saved settings:', err);
        // Pre-populate with default on error
        setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
      }
      
      setIsInitialized(true);
      setError(null);
    } catch (err) {
      console.error('Failed to initialize Tableau extension:', err);
      setError('Failed to initialize Tableau extension. Please reload the dashboard.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle filter change events for auto-refresh
   */
  const handleFilterChange = async () => {
    if (autoRefresh && selectedSheets.length > 0) {
      console.log('Filter changed, auto-refreshing summary...');
      await handleGenerateSummary();
    }
  };

  /**
   * Generate summary from selected sheets
   */
  const handleGenerateSummary = async () => {
    if (selectedSheets.length === 0) {
      setError('Please select at least one sheet to summarize.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSummary('');

      // Extract data from all selected sheets
      const sheetsData = [];
      for (const sheetName of selectedSheets) {
        const sheetData = await extractSheetData(sheetName);
        sheetsData.push(sheetData);
      }

      // Get dashboard metadata (filters, title, etc.)
      const metadata = await getDashboardMetadata();

      // Get comprehensive datasource metadata
      const datasources = await getDatasourceMetadata();
      console.log('Datasource metadata collected:', datasources);

      // Call Gemini API through backend
      // Send system_prompt only if it's not empty (backend will use default if null/empty)
      const result = await generateSummary({
        sheets_data: sheetsData,
        metadata: metadata,
        datasources: datasources,
        context: context,
        system_prompt: systemPrompt.trim() || undefined
      });

      setSummary(result.summary);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Failed to generate summary:', err);
      setError(err.message || 'Failed to generate summary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clear summary and reset state
   */
  const handleClearSummary = () => {
    setSummary('');
    setLastUpdated(null);
    setError(null);
  };

  /**
   * Handle mode switch between summary and chat
   */
  const handleModeChange = (newMode) => {
    setMode(newMode);
    setError(null);
  };

  /**
   * Lookup datasource LUID using REST API via backend
   */
  const lookupDatasourceLuid = async (datasourceName, authData) => {
    try {
      console.log(`→ Looking up LUID for datasource: ${datasourceName}`);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/api/datasource-luid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          datasource_name: datasourceName,
          server_url: serverInfo?.serverUrl || authData.serverUrl,
          site_content_url: serverInfo?.siteContentUrl || authData.siteContentUrl || '',
          auth_method: authData.authMethod,
          pat_name: authData.patName,
          pat_secret: authData.patSecret,
          username: authData.username,
          password: authData.password
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.luid) {
        console.log(`✓ Got LUID: ${data.luid} (cached: ${data.cached})`);
        return data.luid;
      } else {
        console.error('Failed to get LUID:', data.error);
        return null;
      }
    } catch (error) {
      console.error('Error looking up datasource LUID:', error);
      return null;
    }
  };

  /**
   * Handle successful authentication
   */
  const handleAuthenticated = async (token, authData) => {
    setChatAccessToken(token);
    setShowAuthModal(false);
    
    // Lookup LUIDs for all datasources
    if (datasources.length > 0) {
      console.log('→ Looking up LUIDs for all datasources...');
      
      const updatedDatasources = [];
      for (const ds of datasources) {
        const luid = await lookupDatasourceLuid(ds.name, authData);
        updatedDatasources.push({
          ...ds,
          luid: luid || ds.id  // Use LUID if found, fallback to original ID
        });
      }
      
      setDatasources(updatedDatasources);
      
      // Update selected datasource
      if (selectedDatasource) {
        const updated = updatedDatasources.find(ds => ds.id === selectedDatasource.id);
        if (updated) {
          setSelectedDatasource(updated);
        }
      }
      
      console.log('✓ Updated datasources with LUIDs');
    }
  };

  /**
   * Handle auth required (from chat interface)
   */
  const handleAuthRequired = () => {
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Disclaimer Modal */}
      {!disclaimerAccepted && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg className="w-12 h-12 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Data Privacy & Usage Notice
                </h3>
                <div className="space-y-3 text-sm text-gray-700">
                  <p>
                    This extension sends your dashboard data to <strong>Google Vertex AI (Gemini)</strong> for analysis and summarization.
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="font-semibold text-yellow-800 mb-2">Important:</p>
                    <ul className="list-disc list-inside space-y-1 text-yellow-900">
                      <li>Your data will be transmitted to external AI services</li>
                      <li>Ensure you have proper authorization to share this data</li>
                      <li>Do not use with sensitive or confidential information without approval</li>
                      <li>Review your organization's data governance policies</li>
                    </ul>
                  </div>
                  <p>
                    By continuing, you acknowledge that you have the necessary permissions to use this extension with your data.
                  </p>
                </div>
                <div className="mt-6">
                  <button
                    onClick={() => setDisclaimerAccepted(true)}
                    className="w-full bg-tableau-blue hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                  >
                    I Understand & Accept
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Insights & Chat</h1>
              <p className="text-sm text-gray-500 mt-1">
                AI-powered insights and interactive Q&A for your Tableau dashboards
              </p>
            </div>
            <div className="flex items-center gap-4">
              {mode === 'summary' && lastUpdated && (
                <span className="text-xs text-gray-500">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              {mode === 'summary' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded border-gray-300 text-tableau-blue focus:ring-tableau-blue"
                  />
                  <span className="text-sm text-gray-700">Auto-refresh on filter/parameter change</span>
                </label>
              )}
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center border-b border-gray-200">
            <button
              onClick={() => handleModeChange('summary')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                mode === 'summary'
                  ? 'border-tableau-blue text-tableau-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Summary</span>
              </div>
            </button>
            <button
              onClick={() => handleModeChange('chat')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                mode === 'chat'
                  ? 'border-tableau-blue text-tableau-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span>Chat</span>
                {chatAccessToken && (
                  <span className="ml-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                    Authenticated
                  </span>
                )}
              </div>
            </button>
          </div>
        </header>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Summary Mode */}
        <div style={{ display: mode === 'summary' ? 'block' : 'none' }}>
          <>
            {/* Configuration Panel */}
            <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h2>
              
              <div className="space-y-4">
                {/* Sheet Selector */}
                <SheetSelector
                  sheets={sheets}
                  selectedSheets={selectedSheets}
                  onSelectionChange={setSelectedSheets}
                  disabled={!isInitialized || loading}
                />

                {/* System Prompt - Author Only */}
                {serverInfo?.mode === 'authoring' && (
                  <div className="border-l-4 border-purple-500 bg-purple-50 p-4 rounded-r-lg">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <label htmlFor="system-prompt" className="text-sm font-medium text-purple-800">
                            AI System Prompt (Author-Only)
                          </label>
                          <span className="px-2 py-0.5 bg-purple-200 text-purple-800 text-xs font-medium rounded">
                            Advanced
                          </span>
                          {savingSettings && (
                            <span className="flex items-center text-xs text-gray-600">
                              <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Saving...
                            </span>
                          )}
                          {!savingSettings && systemPrompt && (
                            <span className="flex items-center text-xs text-green-600">
                              <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Saved
                            </span>
                          )}
                        </div>
                        <textarea
                          id="system-prompt"
                          value={systemPrompt}
                          onChange={(e) => setSystemPrompt(e.target.value)}
                          disabled={loading}
                          rows={6}
                          placeholder="Define how the AI should analyze your data. Example:&#10;&#10;You are a business intelligence analyst. Analyze this Tableau dashboard and provide a concise, executive-ready summary.&#10;&#10;Focus on:&#10;- Key trends and patterns&#10;- Notable insights or anomalies&#10;&#10;Format: Use clear bullet points. Be concise and business-friendly."
                          className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm text-gray-900 placeholder-gray-400 resize-none font-mono"
                        />
                        <p className="text-xs text-purple-700 mt-2">
                          This system prompt controls how the AI analyzes data for all users. Leave as-is to use default prompt.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Context Input - Available to All Users */}
                <ContextInput
                  context={context}
                  onContextChange={setContext}
                  disabled={loading}
                />

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleGenerateSummary}
                    disabled={!isInitialized || loading || selectedSheets.length === 0}
                    className="flex-1 bg-tableau-blue hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Generate Summary
                      </>
                    )}
                  </button>

                  {summary && (
                    <button
                      onClick={handleClearSummary}
                      disabled={loading}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200 font-medium"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Summary Display */}
            {summary && (
              <SummaryPanel
                summary={summary}
                loading={loading}
              />
            )}

            {/* Loading State */}
            {loading && !summary && (
              <div className="bg-white shadow-sm rounded-lg p-8">
                <div className="flex flex-col items-center justify-center text-gray-500">
                  <svg className="animate-spin h-10 w-10 mb-4 text-tableau-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-lg font-medium">Analyzing dashboard data...</p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!summary && !loading && isInitialized && (
              <div className="bg-white shadow-sm rounded-lg p-12">
                <div className="text-center text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg font-medium text-gray-700 mb-2">No summary generated yet</p>
                  <p className="text-sm text-gray-500">
                    Select one or more sheets and click "Generate Summary" to get AI-powered insights
                  </p>
                </div>
              </div>
            )}
          </>
        </div>

        {/* Chat Mode */}
        <div style={{ display: mode === 'chat' ? 'block' : 'none' }}>
          <>
            {/* Datasource Selector & Auth Status */}
            <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Datasource
                  </label>
                  <select
                    value={selectedDatasource?.id || ''}
                    onChange={(e) => {
                      const ds = datasources.find(d => d.id === e.target.value);
                      setSelectedDatasource(ds);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tableau-blue focus:border-transparent"
                    disabled={!isInitialized || datasources.length === 0}
                  >
                    {datasources.map((ds) => (
                      <option key={ds.id} value={ds.id}>
                        {ds.name} {ds.luid ? '✓' : '⚠️'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ml-6">
                  {chatAccessToken ? (
                    <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-lg">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">Authenticated</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="px-4 py-2 bg-tableau-blue hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                    >
                      Authenticate
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Chat Interface */}
            <div className="bg-white shadow-sm rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 400px)', minHeight: '500px' }}>
              <ChatInterface
                datasourceId={selectedDatasource?.luid || selectedDatasource?.id}
                datasourceName={selectedDatasource?.name}
                accessToken={chatAccessToken}
                summaryContext={summary}
                onAuthRequired={handleAuthRequired}
              />
            </div>
          </>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthenticated={handleAuthenticated}
        serverUrl={serverInfo?.serverUrl}
        siteContentUrl={serverInfo?.siteContentUrl}
      />
    </div>
  );
}

export default App;

