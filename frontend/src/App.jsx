import React, { useState, useEffect } from 'react';
import SheetSelector from './components/SheetSelector';
import ContextInput from './components/ContextInput';
import SummaryPanel from './components/SummaryPanel';
import ChatInterface from './components/ChatInterface';
import AuthModal from './components/AuthModal';
import { initializeTableau, getSheets, extractSheetData, getDashboardMetadata, getDatasourceMetadata, subscribeToFilterChanges, subscribeToParameterChanges, getTableauServerInfo, getPrimaryDatasourceId, getAllDatasources } from './services/TableauConnector';
import { generateSummary } from './services/GeminiService';
import { getStoredAuthCredentials } from './services/ChatService';

function App() {
  // State management
  const [isInitialized, setIsInitialized] = useState(false);
  const [sheets, setSheets] = useState([]);
  const [selectedSheets, setSelectedSheets] = useState([]);
  const [context, setContext] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  
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
      setDatasources(allDatasources);
      
      // Set primary datasource as default
      if (allDatasources.length > 0) {
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
      const result = await generateSummary({
        sheets_data: sheetsData,
        metadata: metadata,
        datasources: datasources,
        context: context
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
   * Handle successful authentication
   */
  const handleAuthenticated = (token) => {
    setChatAccessToken(token);
    setShowAuthModal(false);
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
        {mode === 'summary' && (
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

                {/* Context Input */}
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
        )}

        {/* Chat Mode */}
        {mode === 'chat' && (
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
                        {ds.name} {ds.connectionName !== 'N/A' ? `(${ds.connectionName})` : ''}
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
                datasourceId={selectedDatasource?.id}
                datasourceName={selectedDatasource?.name}
                accessToken={chatAccessToken}
                summaryContext={summary}
                onAuthRequired={handleAuthRequired}
              />
            </div>
          </>
        )}
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

